/**
 * Serviço de integração com a API do Escavador
 * Documentação: https://api.escavador.com/docs
 * 
 * Este serviço permite:
 * - Buscar processos por número, CNPJ ou nome
 * - Monitorar novos processos da empresa
 * - Obter movimentações processuais
 * - Sincronizar dados automaticamente
 */

import { db } from "./db";
import { 
  escavadorConfig, 
  laborLawsuits, 
  lawsuitMovements,
  employees 
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Tipos da API do Escavador
interface EscavadorProcess {
  id: number;
  numero_cnj: string;
  tribunal: string;
  vara: string;
  cidade: string;
  estado: string;
  data_distribuicao: string;
  valor_causa: number;
  assuntos: string[];
  partes: EscavadorParty[];
  movimentacoes: EscavadorMovement[];
}

interface EscavadorParty {
  nome: string;
  tipo: "autor" | "reu" | "advogado" | "outro";
  polo: "ativo" | "passivo";
  cpf_cnpj?: string;
  oab?: string;
}

interface EscavadorMovement {
  id: number;
  data: string;
  titulo: string;
  descricao: string;
}

interface EscavadorSearchResult {
  total: number;
  processos: EscavadorProcess[];
}

// Classe do serviço
class EscavadorService {
  private baseUrl = "https://api.escavador.com/v1";
  private apiKey: string | null = null;
  private isConfigured = false;

  /**
   * Inicializa o serviço carregando a configuração do banco
   */
  async initialize(): Promise<boolean> {
    try {
      const config = await db.select().from(escavadorConfig).limit(1);
      
      if (config.length > 0 && config[0].apiKey && config[0].isActive) {
        this.apiKey = config[0].apiKey;
        this.isConfigured = true;
        return true;
      }
      
      this.isConfigured = false;
      return false;
    } catch (error) {
      console.error("Erro ao inicializar Escavador:", error);
      return false;
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  isReady(): boolean {
    return this.isConfigured && this.apiKey !== null;
  }

  /**
   * Faz requisição para a API do Escavador
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    if (!this.isReady()) {
      console.warn("Escavador não configurado. Configure a API key nas configurações.");
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Erro Escavador (${response.status}):`, error);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Erro na requisição Escavador:", error);
      return null;
    }
  }

  /**
   * Busca processo por número CNJ
   */
  async searchByProcessNumber(processNumber: string): Promise<EscavadorProcess | null> {
    const cleanNumber = processNumber.replace(/[^\d]/g, "");
    const result = await this.request<{ processo: EscavadorProcess }>(
      `/processos/numero/${cleanNumber}`
    );
    return result?.processo || null;
  }

  /**
   * Busca processos por CNPJ da empresa
   */
  async searchByCnpj(cnpj: string): Promise<EscavadorSearchResult | null> {
    const cleanCnpj = cnpj.replace(/[^\d]/g, "");
    return await this.request<EscavadorSearchResult>(
      `/processos/cnpj/${cleanCnpj}`
    );
  }

  /**
   * Busca processos por nome
   */
  async searchByName(name: string): Promise<EscavadorSearchResult | null> {
    return await this.request<EscavadorSearchResult>(
      `/processos/nome/${encodeURIComponent(name)}`
    );
  }

  /**
   * Obtém movimentações de um processo
   */
  async getMovements(processNumber: string): Promise<EscavadorMovement[] | null> {
    const cleanNumber = processNumber.replace(/[^\d]/g, "");
    const result = await this.request<{ movimentacoes: EscavadorMovement[] }>(
      `/processos/numero/${cleanNumber}/movimentacoes`
    );
    return result?.movimentacoes || null;
  }

  /**
   * Sincroniza um processo específico com o Escavador
   */
  async syncProcess(lawsuitId: number): Promise<boolean> {
    try {
      // Busca o processo no banco
      const lawsuit = await db.select()
        .from(laborLawsuits)
        .where(eq(laborLawsuits.id, lawsuitId))
        .limit(1);

      if (lawsuit.length === 0) {
        return false;
      }

      const processNumber = lawsuit[0].processNumber;

      // Busca dados no Escavador
      const escavadorData = await this.searchByProcessNumber(processNumber);
      
      if (!escavadorData) {
        return false;
      }

      // Atualiza dados do processo
      await db.update(laborLawsuits)
        .set({
          escavadorId: String(escavadorData.id),
          lastSyncAt: new Date(),
          courtName: escavadorData.vara || lawsuit[0].courtName,
          courtRegion: escavadorData.tribunal || lawsuit[0].courtRegion,
          courtCity: escavadorData.cidade || lawsuit[0].courtCity,
          courtState: escavadorData.estado || lawsuit[0].courtState,
        })
        .where(eq(laborLawsuits.id, lawsuitId));

      // Sincroniza movimentações
      if (escavadorData.movimentacoes) {
        for (const mov of escavadorData.movimentacoes) {
          // Verifica se já existe
          const existing = await db.select()
            .from(lawsuitMovements)
            .where(eq(lawsuitMovements.externalId, String(mov.id)))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(lawsuitMovements).values({
              lawsuitId,
              movementDate: new Date(mov.data),
              title: mov.titulo,
              description: mov.descricao,
              source: "escavador",
              externalId: String(mov.id),
              rawData: mov,
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Erro ao sincronizar processo:", error);
      return false;
    }
  }

  /**
   * Sincroniza todos os processos ativos
   */
  async syncAllProcesses(): Promise<{ synced: number; failed: number }> {
    const result = { synced: 0, failed: 0 };

    try {
      const lawsuits = await db.select()
        .from(laborLawsuits)
        .where(eq(laborLawsuits.status, "active"));

      for (const lawsuit of lawsuits) {
        const success = await this.syncProcess(lawsuit.id);
        if (success) {
          result.synced++;
        } else {
          result.failed++;
        }
        
        // Aguarda um pouco entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Atualiza timestamp da última sincronização
      await db.update(escavadorConfig)
        .set({ lastSyncAt: new Date() });

    } catch (error) {
      console.error("Erro na sincronização em lote:", error);
    }

    return result;
  }

  /**
   * Busca novos processos da empresa no Escavador
   */
  async findNewProcesses(): Promise<EscavadorProcess[]> {
    try {
      const config = await db.select().from(escavadorConfig).limit(1);
      
      if (config.length === 0 || !config[0].monitoredCnpj) {
        return [];
      }

      const result = await this.searchByCnpj(config[0].monitoredCnpj);
      
      if (!result || !result.processos) {
        return [];
      }

      // Filtra processos que ainda não estão cadastrados
      const newProcesses: EscavadorProcess[] = [];
      
      for (const processo of result.processos) {
        const existing = await db.select()
          .from(laborLawsuits)
          .where(eq(laborLawsuits.processNumber, processo.numero_cnj))
          .limit(1);

        if (existing.length === 0) {
          newProcesses.push(processo);
        }
      }

      return newProcesses;
    } catch (error) {
      console.error("Erro ao buscar novos processos:", error);
      return [];
    }
  }

  /**
   * Importa um processo do Escavador para o sistema
   */
  async importProcess(escavadorProcess: EscavadorProcess): Promise<number | null> {
    try {
      // Identifica o reclamante (polo ativo)
      const claimant = escavadorProcess.partes.find(p => p.polo === "ativo" && p.tipo !== "advogado");
      const claimantLawyer = escavadorProcess.partes.find(p => p.polo === "ativo" && p.tipo === "advogado");

      // Verifica se o reclamante é um funcionário cadastrado
      let claimantId: number | null = null;
      if (claimant?.cpf_cnpj) {
        const employee = await db.select()
          .from(employees)
          .where(eq(employees.cpf, claimant.cpf_cnpj))
          .limit(1);
        
        if (employee.length > 0) {
          claimantId = employee[0].id;
        }
      }

      // Determina o tipo de ação baseado nos assuntos
      let lawsuitType: "labor_claim" | "work_accident" | "occupational_disease" | "moral_damage" | "harassment" | "wrongful_termination" | "salary_differences" | "overtime" | "other" = "labor_claim";
      const assuntos = escavadorProcess.assuntos?.join(" ").toLowerCase() || "";
      
      if (assuntos.includes("acidente")) lawsuitType = "work_accident";
      else if (assuntos.includes("doença")) lawsuitType = "occupational_disease";
      else if (assuntos.includes("dano moral")) lawsuitType = "moral_damage";
      else if (assuntos.includes("assédio")) lawsuitType = "harassment";
      else if (assuntos.includes("rescisão")) lawsuitType = "wrongful_termination";
      else if (assuntos.includes("diferença") || assuntos.includes("salarial")) lawsuitType = "salary_differences";
      else if (assuntos.includes("hora extra")) lawsuitType = "overtime";

      // Insere o processo
      const result = await db.insert(laborLawsuits).values({
        processNumber: escavadorProcess.numero_cnj,
        courtName: escavadorProcess.vara,
        courtRegion: escavadorProcess.tribunal,
        courtCity: escavadorProcess.cidade,
        courtState: escavadorProcess.estado,
        claimantId,
        claimantName: claimant?.nome || "Não identificado",
        claimantCpf: claimant?.cpf_cnpj,
        claimantLawyer: claimantLawyer?.nome,
        lawsuitType,
        distributionDate: escavadorProcess.data_distribuicao ? new Date(escavadorProcess.data_distribuicao) : null,
        claimAmount: escavadorProcess.valor_causa ? String(escavadorProcess.valor_causa) : null,
        claimSummary: escavadorProcess.assuntos?.join(", "),
        escavadorId: String(escavadorProcess.id),
        lastSyncAt: new Date(),
        status: "active",
        phase: "initial",
      }).$returningId();

      const lawsuitId = result[0].id;

      // Importa movimentações
      if (escavadorProcess.movimentacoes) {
        for (const mov of escavadorProcess.movimentacoes) {
          await db.insert(lawsuitMovements).values({
            lawsuitId,
            movementDate: new Date(mov.data),
            title: mov.titulo,
            description: mov.descricao,
            source: "escavador",
            externalId: String(mov.id),
            rawData: mov,
          });
        }
      }

      return lawsuitId;
    } catch (error) {
      console.error("Erro ao importar processo:", error);
      return null;
    }
  }

  /**
   * Configura a API do Escavador
   */
  async configure(apiKey: string, cnpj?: string, companyName?: string): Promise<boolean> {
    try {
      // Verifica se já existe configuração
      const existing = await db.select().from(escavadorConfig).limit(1);

      if (existing.length > 0) {
        await db.update(escavadorConfig)
          .set({
            apiKey,
            isActive: true,
            monitoredCnpj: cnpj,
            monitoredCompanyName: companyName,
            updatedAt: new Date(),
          })
          .where(eq(escavadorConfig.id, existing[0].id));
      } else {
        await db.insert(escavadorConfig).values({
          apiKey,
          isActive: true,
          monitoredCnpj: cnpj,
          monitoredCompanyName: companyName,
        });
      }

      // Reinicializa o serviço
      this.apiKey = apiKey;
      this.isConfigured = true;

      return true;
    } catch (error) {
      console.error("Erro ao configurar Escavador:", error);
      return false;
    }
  }

  /**
   * Desativa a integração
   */
  async deactivate(): Promise<boolean> {
    try {
      await db.update(escavadorConfig)
        .set({ isActive: false });
      
      this.isConfigured = false;
      this.apiKey = null;

      return true;
    } catch (error) {
      console.error("Erro ao desativar Escavador:", error);
      return false;
    }
  }

  /**
   * Obtém status da configuração
   */
  async getStatus(): Promise<{
    isConfigured: boolean;
    isActive: boolean;
    lastSyncAt: Date | null;
    monitoredCnpj: string | null;
    monitoredCompanyName: string | null;
  }> {
    try {
      const config = await db.select().from(escavadorConfig).limit(1);

      if (config.length === 0) {
        return {
          isConfigured: false,
          isActive: false,
          lastSyncAt: null,
          monitoredCnpj: null,
          monitoredCompanyName: null,
        };
      }

      return {
        isConfigured: !!config[0].apiKey,
        isActive: config[0].isActive || false,
        lastSyncAt: config[0].lastSyncAt,
        monitoredCnpj: config[0].monitoredCnpj,
        monitoredCompanyName: config[0].monitoredCompanyName,
      };
    } catch (error) {
      console.error("Erro ao obter status:", error);
      return {
        isConfigured: false,
        isActive: false,
        lastSyncAt: null,
        monitoredCnpj: null,
        monitoredCompanyName: null,
      };
    }
  }
}

// Exporta instância singleton
export const escavadorService = new EscavadorService();

// Funções auxiliares para uso direto
export async function searchProcessByNumber(processNumber: string) {
  await escavadorService.initialize();
  return escavadorService.searchByProcessNumber(processNumber);
}

export async function searchProcessesByCnpj(cnpj: string) {
  await escavadorService.initialize();
  return escavadorService.searchByCnpj(cnpj);
}

export async function syncProcess(lawsuitId: number) {
  await escavadorService.initialize();
  return escavadorService.syncProcess(lawsuitId);
}

export async function syncAllProcesses() {
  await escavadorService.initialize();
  return escavadorService.syncAllProcesses();
}

export async function findNewProcesses() {
  await escavadorService.initialize();
  return escavadorService.findNewProcesses();
}

export async function importProcess(escavadorProcess: any) {
  await escavadorService.initialize();
  return escavadorService.importProcess(escavadorProcess);
}

export async function configureEscavador(apiKey: string, cnpj?: string, companyName?: string) {
  return escavadorService.configure(apiKey, cnpj, companyName);
}

export async function getEscavadorStatus() {
  return escavadorService.getStatus();
}
