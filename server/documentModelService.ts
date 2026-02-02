import { db } from "./db";
import { 
  documentModels, 
  generatedDocuments, 
  companySettings,
  employees,
  departments
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import crypto from "crypto";

// ============ VARIÁVEIS DISPONÍVEIS ============
export const AVAILABLE_VARIABLES = {
  // Dados do Funcionário
  employee: {
    "{{funcionario_nome}}": "Nome completo do funcionário",
    "{{funcionario_cpf}}": "CPF do funcionário",
    "{{funcionario_rg}}": "RG do funcionário",
    "{{funcionario_email}}": "Email do funcionário",
    "{{funcionario_telefone}}": "Telefone do funcionário",
    "{{funcionario_cargo}}": "Cargo/Função",
    "{{funcionario_departamento}}": "Departamento",
    "{{funcionario_salario}}": "Salário (R$)",
    "{{funcionario_salario_extenso}}": "Salário por extenso",
    "{{funcionario_horario}}": "Horário de trabalho",
    "{{funcionario_admissao}}": "Data de admissão",
    "{{funcionario_admissao_extenso}}": "Data de admissão por extenso",
  },
  // Dados da Empresa
  company: {
    "{{empresa_razao_social}}": "Razão social da empresa",
    "{{empresa_nome_fantasia}}": "Nome fantasia",
    "{{empresa_cnpj}}": "CNPJ da empresa",
    "{{empresa_inscricao_estadual}}": "Inscrição estadual",
    "{{empresa_inscricao_municipal}}": "Inscrição municipal",
    "{{empresa_endereco_completo}}": "Endereço completo",
    "{{empresa_cidade}}": "Cidade",
    "{{empresa_estado}}": "Estado (UF)",
    "{{empresa_cep}}": "CEP",
    "{{empresa_telefone}}": "Telefone da empresa",
    "{{empresa_email}}": "Email da empresa",
    "{{empresa_representante_nome}}": "Nome do representante legal",
    "{{empresa_representante_cpf}}": "CPF do representante legal",
    "{{empresa_representante_cargo}}": "Cargo do representante legal",
  },
  // Datas
  dates: {
    "{{data_atual}}": "Data atual (DD/MM/YYYY)",
    "{{data_atual_extenso}}": "Data atual por extenso",
    "{{mes_atual}}": "Mês atual",
    "{{ano_atual}}": "Ano atual",
    "{{hora_atual}}": "Hora atual",
  },
  // Outros
  other: {
    "{{numero_documento}}": "Número sequencial do documento",
    "{{local_assinatura}}": "Local para assinatura (cidade)",
  }
};

// ============ FUNÇÕES AUXILIARES ============

// Converter número para extenso
function numberToWords(num: number): string {
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (num === 0) return 'zero';
  if (num === 100) return 'cem';

  let result = '';

  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) {
      result += 'mil';
    } else {
      result += numberToWords(thousands) + ' mil';
    }
    num %= 1000;
    if (num > 0) result += ' e ';
  }

  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)];
    num %= 100;
    if (num > 0) result += ' e ';
  }

  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) result += ' e ';
  } else if (num >= 10) {
    result += teens[num - 10];
    return result;
  }

  if (num > 0) {
    result += units[num];
  }

  return result;
}

// Converter valor monetário para extenso
function currencyToWords(value: number): string {
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);

  let result = numberToWords(reais);
  result += reais === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    result += ' e ' + numberToWords(centavos);
    result += centavos === 1 ? ' centavo' : ' centavos';
  }

  return result;
}

// Formatar data por extenso
function dateToWords(date: Date): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} de ${month} de ${year}`;
}

// Formatar data DD/MM/YYYY
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Formatar CPF
function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Formatar CNPJ
function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ============ FUNÇÕES PRINCIPAIS ============

// Buscar dados da empresa
export async function getCompanySettings() {
  const [settings] = await db.select().from(companySettings).limit(1);
  return settings;
}

// Criar/atualizar dados da empresa
export async function upsertCompanySettings(data: Partial<typeof companySettings.$inferInsert>) {
  const existing = await getCompanySettings();
  
  if (existing) {
    await db.update(companySettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companySettings.id, existing.id));
    return { ...existing, ...data };
  } else {
    const [result] = await db.insert(companySettings)
      .values(data as typeof companySettings.$inferInsert)
      .$returningId();
    return { id: result.id, ...data };
  }
}

// Buscar todos os modelos de documentos
export async function getDocumentModels(activeOnly = true) {
  const query = activeOnly 
    ? db.select().from(documentModels).where(eq(documentModels.isActive, true))
    : db.select().from(documentModels);
  
  return query.orderBy(documentModels.name);
}

// Buscar modelo por ID
export async function getDocumentModelById(id: number) {
  const [model] = await db.select().from(documentModels).where(eq(documentModels.id, id));
  return model;
}

// Criar modelo de documento
export async function createDocumentModel(data: typeof documentModels.$inferInsert) {
  const [result] = await db.insert(documentModels)
    .values({
      ...data,
      availableVariables: JSON.stringify(Object.keys({
        ...AVAILABLE_VARIABLES.employee,
        ...AVAILABLE_VARIABLES.company,
        ...AVAILABLE_VARIABLES.dates,
        ...AVAILABLE_VARIABLES.other
      }))
    })
    .$returningId();
  
  return { id: result.id, ...data };
}

// Atualizar modelo de documento
export async function updateDocumentModel(id: number, data: Partial<typeof documentModels.$inferInsert>) {
  await db.update(documentModels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(documentModels.id, id));
  
  return getDocumentModelById(id);
}

// Deletar modelo (soft delete)
export async function deleteDocumentModel(id: number) {
  await db.update(documentModels)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(documentModels.id, id));
}

// Preencher variáveis no conteúdo
export async function fillDocumentVariables(
  content: string, 
  employeeId: number
): Promise<string> {
  // Buscar dados do funcionário
  const [employee] = await db.select({
    employee: employees,
    department: departments
  })
  .from(employees)
  .leftJoin(departments, eq(employees.departmentId, departments.id))
  .where(eq(employees.id, employeeId));

  if (!employee) {
    throw new Error("Funcionário não encontrado");
  }

  // Buscar dados da empresa
  const company = await getCompanySettings();

  const now = new Date();
  const admissionDate = employee.employee.admissionDate ? new Date(employee.employee.admissionDate) : now;
  const salary = parseFloat(employee.employee.salary?.toString() || "0");

  // Mapa de substituições
  const replacements: Record<string, string> = {
    // Funcionário
    "{{funcionario_nome}}": employee.employee.name || "",
    "{{funcionario_cpf}}": employee.employee.cpf ? formatCPF(employee.employee.cpf) : "",
    "{{funcionario_rg}}": "", // RG não está no schema atual
    "{{funcionario_email}}": employee.employee.email || "",
    "{{funcionario_telefone}}": employee.employee.phone || "",
    "{{funcionario_cargo}}": employee.employee.position || "",
    "{{funcionario_departamento}}": employee.department?.name || "",
    "{{funcionario_salario}}": formatCurrency(salary),
    "{{funcionario_salario_extenso}}": currencyToWords(salary),
    "{{funcionario_horario}}": employee.employee.workHours || "08:00-17:00",
    "{{funcionario_admissao}}": formatDate(admissionDate),
    "{{funcionario_admissao_extenso}}": dateToWords(admissionDate),
    
    // Empresa
    "{{empresa_razao_social}}": company?.companyName || "[RAZÃO SOCIAL]",
    "{{empresa_nome_fantasia}}": company?.tradeName || company?.companyName || "[NOME FANTASIA]",
    "{{empresa_cnpj}}": company?.cnpj ? formatCNPJ(company.cnpj) : "[CNPJ]",
    "{{empresa_inscricao_estadual}}": company?.stateRegistration || "",
    "{{empresa_inscricao_municipal}}": company?.municipalRegistration || "",
    "{{empresa_endereco_completo}}": company ? 
      `${company.address || ""}, ${company.addressNumber || ""} ${company.addressComplement || ""} - ${company.neighborhood || ""}, ${company.city || ""} - ${company.state || ""}, CEP ${company.zipCode || ""}`.replace(/\s+/g, ' ').trim() : 
      "[ENDEREÇO]",
    "{{empresa_cidade}}": company?.city || "[CIDADE]",
    "{{empresa_estado}}": company?.state || "[UF]",
    "{{empresa_cep}}": company?.zipCode || "",
    "{{empresa_telefone}}": company?.phone || "",
    "{{empresa_email}}": company?.email || "",
    "{{empresa_representante_nome}}": company?.legalRepName || "[REPRESENTANTE]",
    "{{empresa_representante_cpf}}": company?.legalRepCpf ? formatCPF(company.legalRepCpf) : "",
    "{{empresa_representante_cargo}}": company?.legalRepPosition || "",
    
    // Datas
    "{{data_atual}}": formatDate(now),
    "{{data_atual_extenso}}": dateToWords(now),
    "{{mes_atual}}": now.toLocaleDateString('pt-BR', { month: 'long' }),
    "{{ano_atual}}": now.getFullYear().toString(),
    "{{hora_atual}}": now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    
    // Outros
    "{{numero_documento}}": crypto.randomBytes(4).toString('hex').toUpperCase(),
    "{{local_assinatura}}": company?.city || "[CIDADE]",
  };

  // Substituir todas as variáveis
  let filledContent = content;
  for (const [variable, value] of Object.entries(replacements)) {
    filledContent = filledContent.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return filledContent;
}

// Gerar documento para assinatura
export async function generateDocumentForSignature(
  modelId: number,
  employeeId: number,
  userId: number,
  expirationDays = 7
): Promise<typeof generatedDocuments.$inferSelect> {
  // Buscar modelo
  const model = await getDocumentModelById(modelId);
  if (!model) {
    throw new Error("Modelo não encontrado");
  }

  // Preencher variáveis
  const filledContent = await fillDocumentVariables(model.content, employeeId);

  // Gerar token único
  const token = crypto.randomBytes(32).toString('hex');

  // Calcular data de expiração
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  // Buscar dados do funcionário para snapshot
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));

  // Criar registro
  const [result] = await db.insert(generatedDocuments)
    .values({
      employeeId,
      modelId,
      token,
      generatedContent: filledContent,
      filledData: JSON.stringify({
        employeeName: employee?.name,
        employeeCpf: employee?.cpf,
        modelName: model.name,
        generatedAt: new Date().toISOString()
      }),
      status: "draft",
      expiresAt,
      createdBy: userId
    })
    .$returningId();

  const [created] = await db.select()
    .from(generatedDocuments)
    .where(eq(generatedDocuments.id, result.id));

  return created;
}

// Buscar documento gerado por token (para página pública)
export async function getGeneratedDocumentByToken(token: string) {
  const [doc] = await db.select({
    document: generatedDocuments,
    model: documentModels,
    employee: employees
  })
  .from(generatedDocuments)
  .leftJoin(documentModels, eq(generatedDocuments.modelId, documentModels.id))
  .leftJoin(employees, eq(generatedDocuments.employeeId, employees.id))
  .where(eq(generatedDocuments.token, token));

  return doc;
}

// Buscar documentos gerados por funcionário
export async function getGeneratedDocumentsByEmployee(employeeId: number) {
  return db.select({
    document: generatedDocuments,
    model: documentModels
  })
  .from(generatedDocuments)
  .leftJoin(documentModels, eq(generatedDocuments.modelId, documentModels.id))
  .where(eq(generatedDocuments.employeeId, employeeId))
  .orderBy(desc(generatedDocuments.createdAt));
}

// Listar todos os documentos gerados
export async function listGeneratedDocuments(status?: string) {
  const query = db.select({
    document: generatedDocuments,
    model: documentModels,
    employee: employees
  })
  .from(generatedDocuments)
  .leftJoin(documentModels, eq(generatedDocuments.modelId, documentModels.id))
  .leftJoin(employees, eq(generatedDocuments.employeeId, employees.id));

  if (status) {
    return query.where(eq(generatedDocuments.status, status as any))
      .orderBy(desc(generatedDocuments.createdAt));
  }

  return query.orderBy(desc(generatedDocuments.createdAt));
}

// Enviar documento para assinatura
export async function sendDocumentForSignature(
  documentId: number,
  userId: number
) {
  const [doc] = await db.select({
    document: generatedDocuments,
    employee: employees
  })
  .from(generatedDocuments)
  .leftJoin(employees, eq(generatedDocuments.employeeId, employees.id))
  .where(eq(generatedDocuments.id, documentId));

  if (!doc) {
    throw new Error("Documento não encontrado");
  }

  if (!doc.employee?.email) {
    throw new Error("Funcionário não possui email cadastrado");
  }

  // Gerar código de verificação
  const verificationCode = Math.random().toString().slice(2, 8);
  const verificationCodeExpiresAt = new Date();
  verificationCodeExpiresAt.setHours(verificationCodeExpiresAt.getHours() + 24);

  // Atualizar documento
  await db.update(generatedDocuments)
    .set({
      status: "pending_signature",
      sentAt: new Date(),
      sentTo: doc.employee.email,
      sentBy: userId,
      verificationCode,
      verificationCodeExpiresAt,
      updatedAt: new Date()
    })
    .where(eq(generatedDocuments.id, documentId));

  return {
    success: true,
    email: doc.employee.email,
    token: doc.document.token
  };
}

// Verificar identidade para assinatura
export async function verifyIdentityForSignature(
  token: string,
  cpf: string,
  birthDate: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const doc = await getGeneratedDocumentByToken(token);

  if (!doc) {
    return { success: false, error: "Documento não encontrado" };
  }

  if (doc.document.status !== "pending_signature") {
    return { success: false, error: "Documento não está aguardando assinatura" };
  }

  if (doc.document.expiresAt && new Date(doc.document.expiresAt) < new Date()) {
    return { success: false, error: "Link de assinatura expirado" };
  }

  // Verificar CPF
  const cleanCpf = cpf.replace(/\D/g, '');
  const employeeCpf = doc.employee?.cpf?.replace(/\D/g, '');
  
  if (cleanCpf !== employeeCpf) {
    await db.update(generatedDocuments)
      .set({ 
        verificationAttempts: (doc.document.verificationAttempts || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(generatedDocuments.id, doc.document.id));
    
    return { success: false, error: "CPF não confere" };
  }

  // Verificar data de nascimento (se disponível)
  if (doc.employee?.birthDate && birthDate) {
    const employeeBirthDate = new Date(doc.employee.birthDate);
    const inputBirthDate = new Date(birthDate);
    
    // Comparar apenas ano, mês e dia (ignorar hora)
    const employeeDateStr = employeeBirthDate.toISOString().split('T')[0];
    const inputDateStr = inputBirthDate.toISOString().split('T')[0];
    
    if (employeeDateStr !== inputDateStr) {
      await db.update(generatedDocuments)
        .set({ 
          verificationAttempts: (doc.document.verificationAttempts || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(generatedDocuments.id, doc.document.id));
      
      return { success: false, error: "Data de nascimento não confere" };
    }
  }

  // Verificar código (se enviado por email E se o usuário preencheu)
  // Se o código foi enviado por email e o usuário preencheu um código, valida
  // Se o usuário não preencheu código, permite continuar (validação apenas por CPF + data nascimento)
  if (doc.document.verificationCode && code && code.trim() !== '' && code !== doc.document.verificationCode) {
    await db.update(generatedDocuments)
      .set({ 
        verificationAttempts: (doc.document.verificationAttempts || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(generatedDocuments.id, doc.document.id));
    
    return { success: false, error: "Código de verificação inválido" };
  }

  return { success: true };
}

// Gerar hash SHA-256 de um conteúdo
export function generateSHA256Hash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// Gerar certificado de assinatura em HTML
function generateSignatureCertificateHTML(
  doc: { document: any; employee: any; model: any },
  signedName: string,
  signedCpf: string,
  signedBirthDate: string,
  signatureImage: string,
  signatureType: string,
  ipAddress: string,
  userAgent: string,
  documentHash: string,
  signedAt: Date
): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatCpf = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');
    return `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9,11)}`;
  };

  const signatureTypeLabel = {
    drawn: 'Assinatura Desenhada',
    typed: 'Assinatura Digitada',
    uploaded: 'Assinatura Enviada (Upload)'
  }[signatureType] || signatureType;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Certificado de Assinatura Eletrônica</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #059669; font-size: 18pt; margin-bottom: 5px; }
    .header p { color: #6b7280; font-size: 10pt; }
    .shield { font-size: 48px; margin-bottom: 10px; }
    .section { margin-bottom: 25px; }
    .section-title { background: #f3f4f6; padding: 8px 15px; font-weight: bold; color: #374151; border-left: 4px solid #059669; margin-bottom: 15px; }
    .info-grid { display: grid; grid-template-columns: 180px 1fr; gap: 8px 15px; padding: 0 15px; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #1f2937; }
    .hash-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; font-family: monospace; font-size: 9pt; word-break: break-all; margin: 15px; border-radius: 4px; }
    .signature-box { text-align: center; padding: 20px; margin: 15px; border: 2px dashed #d1d5db; border-radius: 8px; }
    .signature-box img { max-width: 300px; max-height: 100px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9pt; color: #6b7280; }
    .validity { background: #ecfdf5; border: 1px solid #059669; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 15px; }
    .validity-icon { color: #059669; font-size: 24px; }
    .validity-text { color: #059669; font-weight: bold; }
    .legal-text { font-size: 9pt; color: #6b7280; padding: 15px; text-align: justify; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="shield">🛡️</div>
      <h1>CERTIFICADO DE ASSINATURA ELETRÔNICA</h1>
      <p>Documento assinado eletronicamente conforme MP 2.200-2/2001</p>
    </div>

    <div class="validity">
      <div class="validity-icon">✓</div>
      <div class="validity-text">DOCUMENTO ASSINADO COM VALIDADE JURÍDICA</div>
    </div>

    <div class="section">
      <div class="section-title">DADOS DO DOCUMENTO</div>
      <div class="info-grid">
        <span class="info-label">Documento:</span>
        <span class="info-value">${doc.model?.name || 'Documento'}</span>
        <span class="info-label">ID do Documento:</span>
        <span class="info-value">#${doc.document.id}</span>
        <span class="info-label">Token de Acesso:</span>
        <span class="info-value">${doc.document.token}</span>
        <span class="info-label">Data de Geração:</span>
        <span class="info-value">${formatDate(new Date(doc.document.createdAt))}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">DADOS DO SIGNATÁRIO</div>
      <div class="info-grid">
        <span class="info-label">Nome Completo:</span>
        <span class="info-value">${signedName}</span>
        <span class="info-label">CPF:</span>
        <span class="info-value">${formatCpf(signedCpf)}</span>
        <span class="info-label">Data de Nascimento:</span>
        <span class="info-value">${signedBirthDate}</span>
        <span class="info-label">Funcionário:</span>
        <span class="info-value">${doc.employee?.name || 'N/A'} (ID: ${doc.employee?.id || 'N/A'})</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">DADOS DA ASSINATURA</div>
      <div class="info-grid">
        <span class="info-label">Data/Hora:</span>
        <span class="info-value">${formatDate(signedAt)}</span>
        <span class="info-label">Tipo de Assinatura:</span>
        <span class="info-value">${signatureTypeLabel}</span>
        <span class="info-label">Endereço IP:</span>
        <span class="info-value">${ipAddress}</span>
        <span class="info-label">Navegador:</span>
        <span class="info-value">${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}</span>
      </div>
      <div class="signature-box">
        <p style="margin-bottom: 10px; font-weight: bold;">Assinatura Capturada:</p>
        ${signatureImage ? `<img src="${signatureImage}" alt="Assinatura" />` : '<p style="color: #6b7280;">Assinatura não disponível</p>'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">HASH DE INTEGRIDADE (SHA-256)</div>
      <div class="hash-box">
        ${documentHash}
      </div>
      <p class="legal-text">
        O hash acima é uma impressão digital única do documento original. Qualquer alteração no conteúdo 
        do documento resultará em um hash diferente, permitindo verificar se o documento foi modificado 
        após a assinatura.
      </p>
    </div>

    <div class="section">
      <div class="section-title">FUNDAMENTAÇÃO LEGAL</div>
      <p class="legal-text">
        Este documento foi assinado eletronicamente em conformidade com a <strong>Medida Provisória nº 2.200-2/2001</strong>, 
        que institui a Infraestrutura de Chaves Públicas Brasileira (ICP-Brasil) e estabelece, em seu artigo 10, § 2º, 
        que "o disposto nesta Medida Provisória não obsta a utilização de outro meio de comprovação da autoria e 
        integridade de documentos em forma eletrônica, inclusive os que utilizem certificados não emitidos pela ICP-Brasil, 
        desde que admitido pelas partes como válido ou aceito pela pessoa a quem for oposto o documento".
      </p>
      <p class="legal-text">
        A assinatura eletrônica aqui registrada possui validade jurídica e probatória, sendo admitida como prova em 
        processos judiciais e administrativos, conforme entendimento consolidado dos tribunais brasileiros.
      </p>
    </div>

    <div class="footer">
      <p><strong>HR Docs Pro</strong> - Sistema de Gestão de Documentos de RH</p>
      <p>Certificado gerado automaticamente em ${formatDate(new Date())}</p>
      <p>Este certificado é parte integrante do documento assinado e não possui validade isoladamente.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Assinar documento com hash e certificado
export async function signDocument(
  token: string,
  signedName: string,
  signedCpf: string,
  signedBirthDate: string,
  signatureImage: string,
  signatureType: "drawn" | "typed" | "uploaded",
  ipAddress: string,
  userAgent: string
): Promise<{ success: boolean; error?: string; certificateUrl?: string }> {
  const doc = await getGeneratedDocumentByToken(token);

  if (!doc) {
    return { success: false, error: "Documento não encontrado" };
  }

  const signedAt = new Date();
  
  // Gerar hash SHA-256 do conteúdo do documento
  const contentToHash = JSON.stringify({
    documentId: doc.document.id,
    token: doc.document.token,
    content: doc.document.generatedContent,
    employeeId: doc.employee?.id,
    employeeName: doc.employee?.name,
    employeeCpf: doc.employee?.cpf,
    signedName,
    signedCpf,
    signedBirthDate,
    signedAt: signedAt.toISOString(),
    ipAddress,
    userAgent
  });
  const documentHash = generateSHA256Hash(contentToHash);

  // Gerar certificado de assinatura em HTML
  const certificateHTML = generateSignatureCertificateHTML(
    doc,
    signedName,
    signedCpf,
    signedBirthDate,
    signatureImage,
    signatureType,
    ipAddress,
    userAgent,
    documentHash,
    signedAt
  );

  // Salvar certificado no S3
  let certificateUrl = null;
  let certificateKey = null;
  try {
    const certificateBuffer = Buffer.from(certificateHTML, 'utf-8');
    const certKey = `certificates/${doc.document.id}-${Date.now()}.html`;
    const result = await storagePut(certKey, certificateBuffer, 'text/html');
    certificateUrl = result.url;
    certificateKey = certKey;
  } catch (error) {
    console.error('Erro ao salvar certificado:', error);
    // Continua mesmo se falhar o upload do certificado
  }

  // Atualizar com assinatura, hash e certificado
  await db.update(generatedDocuments)
    .set({
      status: "signed",
      signedAt,
      signedName,
      signedCpf,
      signedBirthDate,
      signatureImage,
      signatureType,
      ipAddress,
      userAgent,
      documentHash,
      certificateUrl,
      certificateKey,
      updatedAt: new Date()
    })
    .where(eq(generatedDocuments.id, doc.document.id));

  return { success: true, certificateUrl: certificateUrl || undefined };
}

// Modelos padrão para criar automaticamente
export const DEFAULT_DOCUMENT_MODELS = [
  {
    name: "Contrato de Trabalho",
    description: "Contrato individual de trabalho por prazo indeterminado",
    category: "admission" as const,
    requiresSignature: true,
    requiresWitness: true,
    witnessCount: 2,
    content: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6;">
  <h1 style="text-align: center; margin-bottom: 30px;">CONTRATO INDIVIDUAL DE TRABALHO</h1>
  
  <p style="text-align: justify;">
    Pelo presente instrumento particular de contrato individual de trabalho, de um lado 
    <strong>{{empresa_razao_social}}</strong>, inscrita no CNPJ sob o nº {{empresa_cnpj}}, 
    com sede em {{empresa_endereco_completo}}, neste ato representada por {{empresa_representante_nome}}, 
    doravante denominada <strong>EMPREGADORA</strong>, e de outro lado <strong>{{funcionario_nome}}</strong>, 
    portador(a) do CPF nº {{funcionario_cpf}}, residente e domiciliado(a) em [ENDEREÇO DO FUNCIONÁRIO], 
    doravante denominado(a) <strong>EMPREGADO(A)</strong>, têm entre si justo e contratado o seguinte:
  </p>

  <h2>CLÁUSULA 1ª - DO OBJETO</h2>
  <p style="text-align: justify;">
    O(A) EMPREGADO(A) é admitido(a) para exercer a função de <strong>{{funcionario_cargo}}</strong>, 
    no departamento de <strong>{{funcionario_departamento}}</strong>, comprometendo-se a executar 
    todas as tarefas inerentes à função para a qual está sendo contratado(a).
  </p>

  <h2>CLÁUSULA 2ª - DA REMUNERAÇÃO</h2>
  <p style="text-align: justify;">
    O(A) EMPREGADO(A) receberá o salário mensal de <strong>{{funcionario_salario}}</strong> 
    ({{funcionario_salario_extenso}}), a ser pago até o 5º dia útil do mês subsequente ao trabalhado.
  </p>

  <h2>CLÁUSULA 3ª - DA JORNADA DE TRABALHO</h2>
  <p style="text-align: justify;">
    A jornada de trabalho será de <strong>{{funcionario_horario}}</strong>, de segunda a sexta-feira, 
    com intervalo para refeição e descanso conforme legislação vigente.
  </p>

  <h2>CLÁUSULA 4ª - DO PRAZO</h2>
  <p style="text-align: justify;">
    O presente contrato é celebrado por prazo indeterminado, iniciando-se em 
    <strong>{{funcionario_admissao}}</strong>.
  </p>

  <h2>CLÁUSULA 5ª - DAS DISPOSIÇÕES GERAIS</h2>
  <p style="text-align: justify;">
    O(A) EMPREGADO(A) se compromete a cumprir o regulamento interno da empresa, bem como as 
    normas de segurança e medicina do trabalho, sujeitando-se às penalidades previstas na 
    legislação trabalhista em caso de descumprimento.
  </p>

  <p style="text-align: justify; margin-top: 30px;">
    E por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias 
    de igual teor e forma, na presença das testemunhas abaixo.
  </p>

  <p style="text-align: center; margin-top: 40px;">
    {{empresa_cidade}}, {{data_atual_extenso}}.
  </p>

  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #000; padding-top: 10px;">
        <strong>{{empresa_razao_social}}</strong><br>
        EMPREGADORA
      </div>
    </div>
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #000; padding-top: 10px;">
        <strong>{{funcionario_nome}}</strong><br>
        EMPREGADO(A)
      </div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #000; padding-top: 10px;">
        TESTEMUNHA 1<br>
        Nome:<br>
        CPF:
      </div>
    </div>
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #000; padding-top: 10px;">
        TESTEMUNHA 2<br>
        Nome:<br>
        CPF:
      </div>
    </div>
  </div>
</div>
    `
  },
  {
    name: "Termo de Recebimento de EPI",
    description: "Termo de responsabilidade pelo recebimento de Equipamentos de Proteção Individual",
    category: "safety" as const,
    requiresSignature: true,
    requiresWitness: false,
    witnessCount: 0,
    content: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6;">
  <h1 style="text-align: center; margin-bottom: 30px;">TERMO DE RESPONSABILIDADE<br>RECEBIMENTO DE EPI</h1>
  
  <p style="text-align: justify;">
    Eu, <strong>{{funcionario_nome}}</strong>, portador(a) do CPF nº {{funcionario_cpf}}, 
    funcionário(a) da empresa <strong>{{empresa_razao_social}}</strong>, exercendo a função de 
    <strong>{{funcionario_cargo}}</strong> no departamento de <strong>{{funcionario_departamento}}</strong>, 
    declaro ter recebido os Equipamentos de Proteção Individual (EPI) listados abaixo:
  </p>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="border: 1px solid #000; padding: 10px;">Item</th>
        <th style="border: 1px solid #000; padding: 10px;">Descrição</th>
        <th style="border: 1px solid #000; padding: 10px;">CA</th>
        <th style="border: 1px solid #000; padding: 10px;">Qtd</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 10px;">1</td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 10px;">2</td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 10px;">3</td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
        <td style="border: 1px solid #000; padding: 10px;"></td>
      </tr>
    </tbody>
  </table>

  <p style="text-align: justify;">
    Declaro ainda que:
  </p>
  <ol style="text-align: justify;">
    <li>Recebi treinamento adequado sobre a utilização correta dos EPIs;</li>
    <li>Comprometo-me a utilizar os equipamentos apenas para a finalidade a que se destinam;</li>
    <li>Responsabilizo-me pela guarda e conservação dos equipamentos;</li>
    <li>Comprometo-me a comunicar imediatamente qualquer dano ou defeito nos equipamentos;</li>
    <li>Estou ciente de que o uso dos EPIs é obrigatório durante toda a jornada de trabalho;</li>
    <li>Estou ciente das penalidades previstas em caso de não utilização dos EPIs.</li>
  </ol>

  <p style="text-align: center; margin-top: 40px;">
    {{empresa_cidade}}, {{data_atual_extenso}}.
  </p>

  <div style="text-align: center; margin-top: 60px;">
    <div style="border-top: 1px solid #000; width: 300px; margin: 0 auto; padding-top: 10px;">
      <strong>{{funcionario_nome}}</strong><br>
      CPF: {{funcionario_cpf}}
    </div>
  </div>
</div>
    `
  },
  {
    name: "Termo de Confidencialidade",
    description: "Termo de compromisso de sigilo e confidencialidade",
    category: "confidentiality" as const,
    requiresSignature: true,
    requiresWitness: false,
    witnessCount: 0,
    content: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6;">
  <h1 style="text-align: center; margin-bottom: 30px;">TERMO DE CONFIDENCIALIDADE E SIGILO</h1>
  
  <p style="text-align: justify;">
    Eu, <strong>{{funcionario_nome}}</strong>, portador(a) do CPF nº {{funcionario_cpf}}, 
    na qualidade de colaborador(a) da empresa <strong>{{empresa_razao_social}}</strong>, 
    inscrita no CNPJ sob o nº {{empresa_cnpj}}, declaro estar ciente e concordar com os 
    termos abaixo descritos:
  </p>

  <h2>1. OBJETO</h2>
  <p style="text-align: justify;">
    O presente termo tem por objeto estabelecer as condições de confidencialidade e sigilo 
    que deverão ser observadas durante e após o término do vínculo empregatício.
  </p>

  <h2>2. INFORMAÇÕES CONFIDENCIAIS</h2>
  <p style="text-align: justify;">
    São consideradas informações confidenciais todas aquelas relacionadas a:
  </p>
  <ul>
    <li>Dados de clientes, fornecedores e parceiros comerciais;</li>
    <li>Estratégias comerciais, financeiras e de marketing;</li>
    <li>Processos, métodos e técnicas de produção;</li>
    <li>Sistemas, softwares e tecnologias utilizadas;</li>
    <li>Dados pessoais de colaboradores e terceiros;</li>
    <li>Quaisquer outras informações não públicas da empresa.</li>
  </ul>

  <h2>3. OBRIGAÇÕES</h2>
  <p style="text-align: justify;">
    Comprometo-me a:
  </p>
  <ul>
    <li>Manter sigilo absoluto sobre todas as informações confidenciais;</li>
    <li>Não divulgar, reproduzir ou utilizar informações para fins pessoais;</li>
    <li>Proteger documentos e arquivos contra acesso não autorizado;</li>
    <li>Devolver todos os materiais confidenciais ao término do contrato;</li>
    <li>Comunicar imediatamente qualquer violação de segurança.</li>
  </ul>

  <h2>4. VIGÊNCIA</h2>
  <p style="text-align: justify;">
    Este termo permanecerá em vigor durante todo o período de vínculo empregatício e por 
    mais 2 (dois) anos após seu término, independentemente do motivo da rescisão.
  </p>

  <h2>5. PENALIDADES</h2>
  <p style="text-align: justify;">
    A violação deste termo sujeitará o infrator às penalidades previstas na legislação 
    civil e criminal, sem prejuízo de indenização por perdas e danos.
  </p>

  <p style="text-align: center; margin-top: 40px;">
    {{empresa_cidade}}, {{data_atual_extenso}}.
  </p>

  <div style="text-align: center; margin-top: 60px;">
    <div style="border-top: 1px solid #000; width: 300px; margin: 0 auto; padding-top: 10px;">
      <strong>{{funcionario_nome}}</strong><br>
      CPF: {{funcionario_cpf}}
    </div>
  </div>
</div>
    `
  }
];

// Criar modelos padrão
export async function createDefaultModels(userId: number) {
  const existing = await getDocumentModels(false);
  
  if (existing.length > 0) {
    return { created: 0, message: "Modelos já existem" };
  }

  for (const model of DEFAULT_DOCUMENT_MODELS) {
    await createDocumentModel({
      ...model,
      createdBy: userId
    });
  }

  return { created: DEFAULT_DOCUMENT_MODELS.length, message: "Modelos criados com sucesso" };
}
