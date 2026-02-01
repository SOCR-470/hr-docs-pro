import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { 
  lgpdConsents, 
  documentSignatures,
  employees,
  emailLog,
  InsertLgpdConsent,
  InsertDocumentSignature
} from "../drizzle/schema";
import { nanoid } from "nanoid";
import crypto from "crypto";

// ============ LGPD CONSENT SERVICE ============

const TERM_VERSION = "1.0";

// Gerar hash do termo
function generateTermHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Gerar código de verificação de 6 dígitos
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Modelo do termo de consentimento LGPD
export function getLgpdTermContent(employeeName: string, companyName: string = "Empresa"): string {
  return `
TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS (LGPD)

CONTROLADOR DOS DADOS:
${companyName}

TITULAR DOS DADOS:
${employeeName}

1. FINALIDADES DO TRATAMENTO

Eu, titular dos dados acima identificado, AUTORIZO o tratamento dos meus dados pessoais para as seguintes finalidades:

- Execução do contrato de trabalho e obrigações legais trabalhistas
- Gestão de folha de pagamento, férias, 13º salário e rescisão
- Controle de jornada de trabalho e registro de ponto
- Administração de benefícios (vale-transporte, vale-refeição, plano de saúde)
- Armazenamento e gestão de documentos pessoais e profissionais
- Compartilhamento com escritório de contabilidade para obrigações fiscais
- Compartilhamento com escritório jurídico para questões trabalhistas
- Envio de comunicações internas relacionadas ao trabalho

2. DADOS PESSOAIS TRATADOS

• Dados de identificação: nome, CPF, RG, data de nascimento, foto
• Dados de contato: endereço, telefone, email pessoal
• Dados profissionais: cargo, salário, histórico funcional
• Dados bancários: banco, agência, conta para depósito de salário
• Dados de saúde ocupacional: ASO, atestados médicos (quando aplicável)
• Dados de dependentes: nome e CPF (para benefícios e IR)

3. COMPARTILHAMENTO DE DADOS

Os dados poderão ser compartilhados com:
• Órgãos governamentais: eSocial, Receita Federal, INSS, FGTS (obrigação legal)
• Escritório de contabilidade (mediante consentimento)
• Escritório jurídico (mediante consentimento)
• Operadoras de benefícios: plano de saúde, vale-transporte (execução contratual)

4. PERÍODO DE RETENÇÃO

Os dados serão mantidos durante a vigência do contrato de trabalho e pelo período exigido por lei após o término:
• Documentos trabalhistas: 5 anos após rescisão (CLT, Art. 11)
• Documentos previdenciários: 10 anos (Lei 8.213/91)
• FGTS: 30 anos (Lei 8.036/90)

5. DIREITOS DO TITULAR

Conforme a Lei 13.709/2018 (LGPD), o titular tem direito a:
• Confirmar a existência de tratamento de seus dados
• Acessar seus dados pessoais
• Corrigir dados incompletos, inexatos ou desatualizados
• Solicitar anonimização ou eliminação de dados desnecessários
• Revogar este consentimento a qualquer momento
• Solicitar portabilidade dos dados

6. DECLARAÇÃO E ASSINATURA

Declaro que li e compreendi este termo, que me foi dada a oportunidade de esclarecer dúvidas, e que CONSINTO de forma livre, informada e inequívoca com o tratamento dos meus dados pessoais para as finalidades acima descritas.

Estou ciente de que posso revogar este consentimento a qualquer momento, sem prejuízo da legalidade do tratamento realizado anteriormente.

Versão do Termo: ${TERM_VERSION}
`;
}

// Criar solicitação de consentimento LGPD
export async function createLgpdConsent(
  employeeId: number, 
  sentBy: number
): Promise<typeof lgpdConsents.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar se já existe consentimento pendente ou assinado
  const existing = await db
    .select()
    .from(lgpdConsents)
    .where(and(
      eq(lgpdConsents.employeeId, employeeId),
      eq(lgpdConsents.status, "signed")
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0]; // Já tem consentimento válido
  }
  
  // Obter dados do funcionário
  const employee = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee[0]) return null;
  
  const termContent = getLgpdTermContent(employee[0].name);
  const termHash = generateTermHash(termContent);
  
  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias para assinar
  
  const result = await db.insert(lgpdConsents).values({
    employeeId,
    token,
    termVersion: TERM_VERSION,
    termHash,
    status: "pending",
    sentBy,
    sentAt: new Date(),
    expiresAt
  });
  
  const insertId = result[0].insertId;
  const created = await db.select().from(lgpdConsents).where(eq(lgpdConsents.id, insertId)).limit(1);
  return created[0] || null;
}

// Obter consentimento por token
export async function getConsentByToken(token: string): Promise<{
  consent: typeof lgpdConsents.$inferSelect;
  employee: typeof employees.$inferSelect;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      consent: lgpdConsents,
      employee: employees
    })
    .from(lgpdConsents)
    .innerJoin(employees, eq(lgpdConsents.employeeId, employees.id))
    .where(eq(lgpdConsents.token, token))
    .limit(1);
  
  if (!result[0]) return null;
  return result[0];
}

// Enviar código de verificação
export async function sendVerificationCode(consentId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutos
  
  await db.update(lgpdConsents).set({
    verificationCode: code,
    verificationCodeExpiresAt: expiresAt
  }).where(eq(lgpdConsents.id, consentId));
  
  return code;
}

// Validar e assinar consentimento
export async function signConsent(
  token: string,
  signedName: string,
  signedCpf: string,
  signedBirthDate: string,
  verificationCode: string,
  ipAddress: string,
  userAgent: string
): Promise<{ success: boolean; error?: string; consent?: typeof lgpdConsents.$inferSelect }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Banco de dados indisponível" };
  
  const data = await getConsentByToken(token);
  if (!data) return { success: false, error: "Token inválido" };
  
  const { consent, employee } = data;
  
  // Verificar status
  if (consent.status === "signed") {
    return { success: false, error: "Consentimento já foi assinado" };
  }
  
  if (consent.status === "expired" || (consent.expiresAt && new Date() > consent.expiresAt)) {
    return { success: false, error: "Link expirado" };
  }
  
  // Validar código de verificação
  if (consent.verificationCode !== verificationCode) {
    return { success: false, error: "Código de verificação inválido" };
  }
  
  if (consent.verificationCodeExpiresAt && new Date() > consent.verificationCodeExpiresAt) {
    return { success: false, error: "Código de verificação expirado" };
  }
  
  // Validar nome (tolerância para acentos e maiúsculas)
  const normalizedSignedName = signedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalizedEmployeeName = employee.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (!normalizedEmployeeName.includes(normalizedSignedName) && !normalizedSignedName.includes(normalizedEmployeeName)) {
    return { success: false, error: "Nome não corresponde ao cadastro" };
  }
  
  // Validar CPF
  const cleanSignedCpf = signedCpf.replace(/\D/g, "");
  const cleanEmployeeCpf = employee.cpf.replace(/\D/g, "");
  
  if (cleanSignedCpf !== cleanEmployeeCpf) {
    return { success: false, error: "CPF não corresponde ao cadastro" };
  }
  
  // Assinar
  await db.update(lgpdConsents).set({
    status: "signed",
    signedAt: new Date(),
    signedName,
    signedCpf,
    signedBirthDate,
    ipAddress,
    userAgent,
    verificationCode: null,
    verificationCodeExpiresAt: null
  }).where(eq(lgpdConsents.id, consent.id));
  
  const updated = await db.select().from(lgpdConsents).where(eq(lgpdConsents.id, consent.id)).limit(1);
  return { success: true, consent: updated[0] };
}

// Listar consentimentos por funcionário
export async function getConsentsByEmployee(employeeId: number): Promise<Array<typeof lgpdConsents.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(lgpdConsents).where(eq(lgpdConsents.employeeId, employeeId));
}

// ============ DOCUMENT SIGNATURE SERVICE ============

// Tipos de documentos disponíveis para geração
export const DOCUMENT_TYPES = {
  EMPLOYMENT_CONTRACT: "employment_contract",
  CONFIDENTIALITY_AGREEMENT: "confidentiality_agreement",
  EPI_RECEIPT: "epi_receipt",
  OVERTIME_AGREEMENT: "overtime_agreement",
  FINE_DISCOUNT_AUTHORIZATION: "fine_discount_authorization",
  VACATION_NOTICE: "vacation_notice",
  TERMINATION: "termination"
} as const;

// Criar solicitação de assinatura de documento
export async function createDocumentSignature(
  employeeId: number,
  documentType: string,
  documentTitle: string,
  templateData: Record<string, unknown>,
  sentBy: number
): Promise<typeof documentSignatures.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  const result = await db.insert(documentSignatures).values({
    employeeId,
    documentType,
    documentTitle,
    token,
    templateData,
    status: "pending",
    sentBy,
    sentAt: new Date(),
    expiresAt
  });
  
  const insertId = result[0].insertId;
  const created = await db.select().from(documentSignatures).where(eq(documentSignatures.id, insertId)).limit(1);
  return created[0] || null;
}

// Obter documento por token
export async function getDocumentByToken(token: string): Promise<{
  document: typeof documentSignatures.$inferSelect;
  employee: typeof employees.$inferSelect;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      document: documentSignatures,
      employee: employees
    })
    .from(documentSignatures)
    .innerJoin(employees, eq(documentSignatures.employeeId, employees.id))
    .where(eq(documentSignatures.token, token))
    .limit(1);
  
  if (!result[0]) return null;
  return result[0];
}

// Enviar código de verificação para documento
export async function sendDocumentVerificationCode(documentId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  
  await db.update(documentSignatures).set({
    verificationCode: code,
    verificationCodeExpiresAt: expiresAt
  }).where(eq(documentSignatures.id, documentId));
  
  return code;
}

// Assinar documento
export async function signDocument(
  token: string,
  signedName: string,
  signedCpf: string,
  signedBirthDate: string,
  verificationCode: string,
  ipAddress: string,
  userAgent: string
): Promise<{ success: boolean; error?: string; document?: typeof documentSignatures.$inferSelect }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Banco de dados indisponível" };
  
  const data = await getDocumentByToken(token);
  if (!data) return { success: false, error: "Token inválido" };
  
  const { document, employee } = data;
  
  if (document.status === "signed") {
    return { success: false, error: "Documento já foi assinado" };
  }
  
  if (document.status === "cancelled" || (document.expiresAt && new Date() > document.expiresAt)) {
    return { success: false, error: "Link expirado" };
  }
  
  if (document.verificationCode !== verificationCode) {
    return { success: false, error: "Código de verificação inválido" };
  }
  
  if (document.verificationCodeExpiresAt && new Date() > document.verificationCodeExpiresAt) {
    return { success: false, error: "Código de verificação expirado" };
  }
  
  // Validar CPF
  const cleanSignedCpf = signedCpf.replace(/\D/g, "");
  const cleanEmployeeCpf = employee.cpf.replace(/\D/g, "");
  
  if (cleanSignedCpf !== cleanEmployeeCpf) {
    return { success: false, error: "CPF não corresponde ao cadastro" };
  }
  
  await db.update(documentSignatures).set({
    status: "signed",
    signedAt: new Date(),
    signedName,
    signedCpf,
    signedBirthDate,
    ipAddress,
    userAgent,
    verificationCode: null,
    verificationCodeExpiresAt: null
  }).where(eq(documentSignatures.id, document.id));
  
  const updated = await db.select().from(documentSignatures).where(eq(documentSignatures.id, document.id)).limit(1);
  return { success: true, document: updated[0] };
}

// Marcar documento como impresso
export async function markDocumentAsPrinted(
  documentId: number, 
  printedBy: number
): Promise<typeof documentSignatures.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(documentSignatures).set({
    status: "printed",
    printedAt: new Date(),
    printedBy
  }).where(eq(documentSignatures.id, documentId));
  
  const updated = await db.select().from(documentSignatures).where(eq(documentSignatures.id, documentId)).limit(1);
  return updated[0] || null;
}

// Upload de documento assinado fisicamente
export async function uploadSignedDocument(
  documentId: number,
  signedDocumentUrl: string,
  signedDocumentKey: string
): Promise<typeof documentSignatures.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(documentSignatures).set({
    status: "signed",
    signedAt: new Date(),
    uploadedSignedUrl: signedDocumentUrl,
    signedDocumentUrl,
    signedDocumentKey
  }).where(eq(documentSignatures.id, documentId));
  
  const updated = await db.select().from(documentSignatures).where(eq(documentSignatures.id, documentId)).limit(1);
  return updated[0] || null;
}

// Listar documentos por funcionário
export async function getDocumentsByEmployee(employeeId: number): Promise<Array<typeof documentSignatures.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(documentSignatures).where(eq(documentSignatures.employeeId, employeeId));
}

// Gerar nome de arquivo padronizado
export function generateFileName(
  documentType: string,
  employeeName: string,
  date: Date = new Date()
): string {
  const cleanName = employeeName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
  
  const typeMap: Record<string, string> = {
    [DOCUMENT_TYPES.EMPLOYMENT_CONTRACT]: "CONTRATO",
    [DOCUMENT_TYPES.CONFIDENTIALITY_AGREEMENT]: "CONFIDENCIALIDADE",
    [DOCUMENT_TYPES.EPI_RECEIPT]: "EPI",
    [DOCUMENT_TYPES.OVERTIME_AGREEMENT]: "BANCO_HORAS",
    [DOCUMENT_TYPES.FINE_DISCOUNT_AUTHORIZATION]: "AUTORIZACAO_MULTAS",
    [DOCUMENT_TYPES.VACATION_NOTICE]: "AVISO_FERIAS",
    [DOCUMENT_TYPES.TERMINATION]: "TRCT",
    "lgpd_consent": "LGPD"
  };
  
  const typePrefix = typeMap[documentType] || documentType.toUpperCase();
  const dateStr = date.toISOString().split('T')[0];
  
  return `${typePrefix}_${cleanName}_${dateStr}.pdf`;
}
