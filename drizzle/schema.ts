import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";

// ============ USERS (Auth) ============
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ DEPARTMENTS ============
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// ============ EMPLOYEES ============
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  departmentId: int("departmentId").references(() => departments.id),
  admissionDate: timestamp("admissionDate"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  workHours: varchar("workHours", { length: 50 }).default("08:00-17:00"),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active").notNull(),
  complianceScore: int("complianceScore").default(100),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ============ DOCUMENT TYPES ============
export const documentTypes = mysqlTable("document_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["admission", "recurring", "compliance", "personal"]).notNull(),
  isRequired: boolean("isRequired").default(true),
  validityDays: int("validityDays"), // null = no expiration
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentType = typeof documentTypes.$inferSelect;
export type InsertDocumentType = typeof documentTypes.$inferInsert;

// ============ DOCUMENTS ============
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  documentTypeId: int("documentTypeId").references(() => documentTypes.id).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  status: mysqlEnum("status", ["pending", "valid", "expired", "rejected"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt"),
  extractedData: json("extractedData"),
  uploadedBy: int("uploadedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============ RECURRING DOCUMENTS (Ponto/Holerite) ============
export const recurringDocuments = mysqlTable("recurring_documents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  type: mysqlEnum("type", ["timesheet", "payslip"]).notNull(),
  referenceDate: timestamp("referenceDate").notNull(), // Month/Day reference
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  ocrText: text("ocrText"),
  extractedData: json("extractedData"),
  aiAnalysis: json("aiAnalysis"),
  complianceStatus: mysqlEnum("complianceStatus", ["compliant", "warning", "non_compliant", "pending"]).default("pending").notNull(),
  complianceScore: int("complianceScore").default(100),
  processedAt: timestamp("processedAt"),
  uploadedBy: int("uploadedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecurringDocument = typeof recurringDocuments.$inferSelect;
export type InsertRecurringDocument = typeof recurringDocuments.$inferInsert;

// ============ COMPLIANCE ALERTS ============
export const complianceAlerts = mysqlTable("compliance_alerts", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  recurringDocId: int("recurringDocId").references(() => recurringDocuments.id),
  documentId: int("documentId").references(() => documents.id),
  type: mysqlEnum("type", [
    "late_arrival", "early_departure", "unauthorized_overtime", 
    "missing_punch", "absence_without_justification",
    "payslip_calculation_error", "irregular_discount", "salary_mismatch",
    "document_expired", "document_missing", "document_expiring_soon"
  ]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  details: json("details"),
  status: mysqlEnum("status", ["open", "acknowledged", "resolved", "dismissed"]).default("open").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ComplianceAlert = typeof complianceAlerts.$inferSelect;
export type InsertComplianceAlert = typeof complianceAlerts.$inferInsert;

// ============ EXTERNAL REQUESTS ============
export const externalRequests = mysqlTable("external_requests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  documentTypeId: int("documentTypeId").references(() => documentTypes.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 200 }),
  recipientType: mysqlEnum("recipientType", ["accountant", "lawyer", "partner", "other"]).default("other"),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "sent", "uploaded", "expired", "cancelled"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  uploadedDocumentId: int("uploadedDocumentId").references(() => documents.id),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExternalRequest = typeof externalRequests.$inferSelect;
export type InsertExternalRequest = typeof externalRequests.$inferInsert;

// ============ AUDIT LOG ============
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ============ DOCUMENT TEMPLATES (Pacotes por Cargo) ============
export const documentTemplates = mysqlTable("document_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  position: varchar("position", { length: 100 }), // Cargo associado
  departmentId: int("departmentId").references(() => departments.id),
  parentTemplateId: int("parentTemplateId"), // Herança de template base
  isBase: boolean("isBase").default(false), // Template base para todos
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplates.$inferInsert;

// ============ TEMPLATE ITEMS (Documentos do Template) ============
export const templateItems = mysqlTable("template_items", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").references(() => documentTemplates.id).notNull(),
  documentTypeId: int("documentTypeId").references(() => documentTypes.id).notNull(),
  isRequired: boolean("isRequired").default(true),
  hasExpiration: boolean("hasExpiration").default(false),
  expirationDays: int("expirationDays"),
  alertDaysBefore: int("alertDaysBefore").default(30),
  requiresSignature: boolean("requiresSignature").default(false),
  isAutoGenerated: boolean("isAutoGenerated").default(false), // Gerado pelo sistema
  sortOrder: int("sortOrder").default(0),
  condition: text("condition"), // Condição para exibir (JSON)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemplateItem = typeof templateItems.$inferSelect;
export type InsertTemplateItem = typeof templateItems.$inferInsert;

// ============ LGPD CONSENTS ============
export const lgpdConsents = mysqlTable("lgpd_consents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  termVersion: varchar("termVersion", { length: 20 }).default("1.0").notNull(),
  termHash: varchar("termHash", { length: 64 }), // SHA-256 do termo
  status: mysqlEnum("status", ["pending", "signed", "revoked", "expired"]).default("pending").notNull(),
  signedAt: timestamp("signedAt"),
  signedName: varchar("signedName", { length: 200 }),
  signedCpf: varchar("signedCpf", { length: 14 }),
  signedBirthDate: varchar("signedBirthDate", { length: 10 }),
  verificationCode: varchar("verificationCode", { length: 6 }),
  verificationCodeExpiresAt: timestamp("verificationCodeExpiresAt"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  documentUrl: text("documentUrl"), // PDF do comprovante
  documentKey: varchar("documentKey", { length: 255 }),
  sentAt: timestamp("sentAt"),
  sentBy: int("sentBy").references(() => users.id),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LgpdConsent = typeof lgpdConsents.$inferSelect;
export type InsertLgpdConsent = typeof lgpdConsents.$inferInsert;

// ============ DOCUMENT SIGNATURES (Contratos e Termos) ============
export const documentSignatures = mysqlTable("document_signatures", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(), // Tipo do documento
  documentTitle: varchar("documentTitle", { length: 200 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  templateData: json("templateData"), // Dados para preencher o template
  generatedContent: text("generatedContent"), // HTML/Conteúdo gerado
  status: mysqlEnum("status", ["pending", "sent", "signed", "printed", "cancelled"]).default("pending").notNull(),
  signedAt: timestamp("signedAt"),
  signedName: varchar("signedName", { length: 200 }),
  signedCpf: varchar("signedCpf", { length: 14 }),
  signedBirthDate: varchar("signedBirthDate", { length: 10 }),
  verificationCode: varchar("verificationCode", { length: 6 }),
  verificationCodeExpiresAt: timestamp("verificationCodeExpiresAt"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  signedDocumentUrl: text("signedDocumentUrl"),
  signedDocumentKey: varchar("signedDocumentKey", { length: 255 }),
  printedAt: timestamp("printedAt"), // Se foi impresso
  printedBy: int("printedBy").references(() => users.id),
  uploadedSignedUrl: text("uploadedSignedUrl"), // Se assinatura física foi uploaded
  sentAt: timestamp("sentAt"),
  sentBy: int("sentBy").references(() => users.id),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentSignature = typeof documentSignatures.$inferSelect;
export type InsertDocumentSignature = typeof documentSignatures.$inferInsert;

// ============ DOCUMENT SHARES (Compartilhamento com Terceiros) ============
export const documentShares = mysqlTable("document_shares", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  recipientName: varchar("recipientName", { length: 200 }).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientType: mysqlEnum("recipientType", ["accountant", "lawyer", "partner", "other"]).default("other"),
  documentIds: json("documentIds").notNull(), // Array de IDs dos documentos
  message: text("message"),
  accessCount: int("accessCount").default(0),
  lastAccessAt: timestamp("lastAccessAt"),
  status: mysqlEnum("status", ["active", "expired", "revoked"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentShare = typeof documentShares.$inferSelect;
export type InsertDocumentShare = typeof documentShares.$inferInsert;

// ============ PREDICTIVE ANALYSIS ============
export const predictiveAnalysis = mysqlTable("predictive_analysis", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  analysisDate: timestamp("analysisDate").defaultNow().notNull(),
  riskScore: int("riskScore").default(0), // 0-100
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).default("low"),
  predictedIssues: json("predictedIssues"), // Array de problemas previstos
  patterns: json("patterns"), // Padrões detectados
  recommendations: json("recommendations"), // Recomendações da IA
  factors: json("factors"), // Fatores que contribuíram para o score
  validUntil: timestamp("validUntil"), // Validade da análise
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PredictiveAnalysis = typeof predictiveAnalysis.$inferSelect;
export type InsertPredictiveAnalysis = typeof predictiveAnalysis.$inferInsert;

// ============ COMPLIANCE HISTORY (Histórico para Comparativo) ============
export const complianceHistory = mysqlTable("compliance_history", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  departmentId: int("departmentId").references(() => departments.id),
  referenceMonth: varchar("referenceMonth", { length: 7 }).notNull(), // YYYY-MM
  complianceScore: int("complianceScore").default(100),
  totalAlerts: int("totalAlerts").default(0),
  criticalAlerts: int("criticalAlerts").default(0),
  highAlerts: int("highAlerts").default(0),
  mediumAlerts: int("mediumAlerts").default(0),
  lowAlerts: int("lowAlerts").default(0),
  documentsComplete: int("documentsComplete").default(0),
  documentsTotal: int("documentsTotal").default(0),
  lateArrivals: int("lateArrivals").default(0),
  absences: int("absences").default(0),
  overtimeHours: decimal("overtimeHours", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ComplianceHistory = typeof complianceHistory.$inferSelect;
export type InsertComplianceHistory = typeof complianceHistory.$inferInsert;

// ============ EMAIL LOG ============
export const emailLog = mysqlTable("email_log", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 200 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  templateType: varchar("templateType", { length: 50 }).notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  status: mysqlEnum("status", ["pending", "sent", "failed", "bounced"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailLog = typeof emailLog.$inferSelect;
export type InsertEmailLog = typeof emailLog.$inferInsert;


// ============ LAWYERS (Advogados) ============
export const lawyers = mysqlTable("lawyers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  oabNumber: varchar("oabNumber", { length: 20 }).notNull(), // Ex: OAB/SP 123456
  oabState: varchar("oabState", { length: 2 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  lawFirm: varchar("lawFirm", { length: 200 }), // Escritório
  specialization: varchar("specialization", { length: 100 }), // Trabalhista, etc.
  isInternal: boolean("isInternal").default(false), // Advogado interno ou externo
  isActive: boolean("isActive").default(true),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lawyer = typeof lawyers.$inferSelect;
export type InsertLawyer = typeof lawyers.$inferInsert;

// ============ LABOR LAWSUITS (Processos Trabalhistas) ============
export const laborLawsuits = mysqlTable("labor_lawsuits", {
  id: int("id").autoincrement().primaryKey(),
  processNumber: varchar("processNumber", { length: 30 }).notNull().unique(), // Formato CNJ
  courtName: varchar("courtName", { length: 200 }).notNull(), // Ex: 1ª Vara do Trabalho de São Paulo
  courtRegion: varchar("courtRegion", { length: 50 }), // TRT da 2ª Região
  courtCity: varchar("courtCity", { length: 100 }),
  courtState: varchar("courtState", { length: 2 }),
  
  // Partes
  claimantId: int("claimantId").references(() => employees.id), // Ex-funcionário reclamante
  claimantName: varchar("claimantName", { length: 200 }).notNull(), // Nome mesmo se não for funcionário
  claimantCpf: varchar("claimantCpf", { length: 14 }),
  claimantLawyer: varchar("claimantLawyer", { length: 200 }), // Advogado do reclamante
  
  // Advogado da empresa
  lawyerId: int("lawyerId").references(() => lawyers.id),
  
  // Tipo e classificação
  lawsuitType: mysqlEnum("lawsuitType", [
    "labor_claim", // Reclamação trabalhista
    "work_accident", // Acidente de trabalho
    "occupational_disease", // Doença ocupacional
    "moral_damage", // Dano moral
    "harassment", // Assédio
    "wrongful_termination", // Rescisão indevida
    "salary_differences", // Diferenças salariais
    "overtime", // Horas extras
    "other"
  ]).default("labor_claim").notNull(),
  
  // Datas
  filingDate: timestamp("filingDate"), // Data de ajuizamento
  distributionDate: timestamp("distributionDate"), // Data de distribuição
  
  // Valores
  claimAmount: decimal("claimAmount", { precision: 15, scale: 2 }), // Valor da causa
  provisionAmount: decimal("provisionAmount", { precision: 15, scale: 2 }), // Provisão contábil
  settlementAmount: decimal("settlementAmount", { precision: 15, scale: 2 }), // Valor do acordo (se houver)
  condemnationAmount: decimal("condemnationAmount", { precision: 15, scale: 2 }), // Valor da condenação
  
  // Status
  status: mysqlEnum("status", [
    "active", // Em andamento
    "suspended", // Suspenso
    "settled", // Acordo
    "won", // Ganho pela empresa
    "lost", // Perdido pela empresa
    "partially_lost", // Parcialmente perdido
    "archived", // Arquivado
    "appealed" // Em recurso
  ]).default("active").notNull(),
  
  phase: mysqlEnum("phase", [
    "initial", // Fase inicial
    "instruction", // Instrução
    "judgment", // Julgamento
    "appeal", // Recurso
    "execution", // Execução
    "closed" // Encerrado
  ]).default("initial").notNull(),
  
  // Descrição e notas
  claimSummary: text("claimSummary"), // Resumo do pedido
  defenseStrategy: text("defenseStrategy"), // Estratégia de defesa
  notes: text("notes"),
  
  // Integração Escavador
  escavadorId: varchar("escavadorId", { length: 100 }), // ID no Escavador
  lastSyncAt: timestamp("lastSyncAt"), // Última sincronização
  
  // Resultado
  resultDate: timestamp("resultDate"),
  resultSummary: text("resultSummary"),
  
  // Departamento relacionado
  departmentId: int("departmentId").references(() => departments.id),
  
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LaborLawsuit = typeof laborLawsuits.$inferSelect;
export type InsertLaborLawsuit = typeof laborLawsuits.$inferInsert;

// ============ LAWSUIT HEARINGS (Audiências) ============
export const lawsuitHearings = mysqlTable("lawsuit_hearings", {
  id: int("id").autoincrement().primaryKey(),
  lawsuitId: int("lawsuitId").references(() => laborLawsuits.id).notNull(),
  
  hearingType: mysqlEnum("hearingType", [
    "initial", // Audiência inicial
    "conciliation", // Conciliação
    "instruction", // Instrução
    "judgment", // Julgamento
    "other"
  ]).notNull(),
  
  scheduledDate: timestamp("scheduledDate").notNull(),
  scheduledTime: varchar("scheduledTime", { length: 10 }), // HH:MM
  location: varchar("location", { length: 300 }), // Endereço/sala
  isVirtual: boolean("isVirtual").default(false),
  virtualLink: text("virtualLink"), // Link para audiência virtual
  
  status: mysqlEnum("status", [
    "scheduled", // Agendada
    "confirmed", // Confirmada
    "rescheduled", // Reagendada
    "completed", // Realizada
    "cancelled", // Cancelada
    "postponed" // Adiada
  ]).default("scheduled").notNull(),
  
  // Resultado
  outcome: text("outcome"), // Resultado da audiência
  nextSteps: text("nextSteps"), // Próximos passos
  
  // Alertas
  alert7DaysSent: boolean("alert7DaysSent").default(false),
  alert3DaysSent: boolean("alert3DaysSent").default(false),
  alert1DaySent: boolean("alert1DaySent").default(false),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LawsuitHearing = typeof lawsuitHearings.$inferSelect;
export type InsertLawsuitHearing = typeof lawsuitHearings.$inferInsert;

// ============ LAWSUIT WITNESSES (Testemunhas) ============
export const lawsuitWitnesses = mysqlTable("lawsuit_witnesses", {
  id: int("id").autoincrement().primaryKey(),
  lawsuitId: int("lawsuitId").references(() => laborLawsuits.id).notNull(),
  hearingId: int("hearingId").references(() => lawsuitHearings.id),
  
  name: varchar("name", { length: 200 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  
  // Se é funcionário da empresa
  employeeId: int("employeeId").references(() => employees.id),
  
  role: mysqlEnum("role", [
    "company_witness", // Testemunha da empresa
    "claimant_witness", // Testemunha do reclamante
    "expert" // Perito
  ]).default("company_witness").notNull(),
  
  relationship: varchar("relationship", { length: 100 }), // Relação com as partes
  expectedTestimony: text("expectedTestimony"), // O que se espera do depoimento
  actualTestimony: text("actualTestimony"), // Resumo do depoimento dado
  
  status: mysqlEnum("status", [
    "pending", // Pendente convocação
    "summoned", // Convocada
    "confirmed", // Confirmada presença
    "testified", // Depôs
    "absent", // Faltou
    "excused" // Dispensada
  ]).default("pending").notNull(),
  
  summonedAt: timestamp("summonedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LawsuitWitness = typeof lawsuitWitnesses.$inferSelect;
export type InsertLawsuitWitness = typeof lawsuitWitnesses.$inferInsert;

// ============ LAWSUIT DOCUMENTS (Documentos do Processo) ============
export const lawsuitDocuments = mysqlTable("lawsuit_documents", {
  id: int("id").autoincrement().primaryKey(),
  lawsuitId: int("lawsuitId").references(() => laborLawsuits.id).notNull(),
  hearingId: int("hearingId").references(() => lawsuitHearings.id),
  
  documentType: mysqlEnum("documentType", [
    "initial_petition", // Petição inicial
    "defense", // Contestação
    "reply", // Réplica
    "evidence", // Prova
    "witness_list", // Rol de testemunhas
    "expert_report", // Laudo pericial
    "appeal", // Recurso
    "sentence", // Sentença
    "settlement", // Acordo
    "subpoena", // Intimação
    "court_order", // Despacho
    "other"
  ]).notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  
  // Vinculação com documento do funcionário
  linkedDocumentId: int("linkedDocumentId").references(() => documents.id),
  linkedRecurringDocId: int("linkedRecurringDocId").references(() => recurringDocuments.id),
  
  receivedAt: timestamp("receivedAt"), // Data de recebimento (se intimação)
  dueDate: timestamp("dueDate"), // Prazo (se aplicável)
  
  uploadedBy: int("uploadedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LawsuitDocument = typeof lawsuitDocuments.$inferSelect;
export type InsertLawsuitDocument = typeof lawsuitDocuments.$inferInsert;

// ============ LAWSUIT DEADLINES (Prazos Processuais) ============
export const lawsuitDeadlines = mysqlTable("lawsuit_deadlines", {
  id: int("id").autoincrement().primaryKey(),
  lawsuitId: int("lawsuitId").references(() => laborLawsuits.id).notNull(),
  
  deadlineType: mysqlEnum("deadlineType", [
    "defense", // Contestação
    "reply", // Réplica
    "evidence", // Juntada de provas
    "witness_list", // Rol de testemunhas
    "appeal", // Recurso
    "counter_reasons", // Contrarrazões
    "manifestation", // Manifestação
    "payment", // Pagamento
    "other"
  ]).notNull(),
  
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  startDate: timestamp("startDate").notNull(), // Início do prazo
  dueDate: timestamp("dueDate").notNull(), // Vencimento
  businessDaysOnly: boolean("businessDaysOnly").default(true), // Conta apenas dias úteis
  
  status: mysqlEnum("status", [
    "pending", // Pendente
    "in_progress", // Em andamento
    "completed", // Cumprido
    "missed", // Perdido
    "extended" // Prorrogado
  ]).default("pending").notNull(),
  
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy").references(() => users.id),
  
  // Alertas
  alert7DaysSent: boolean("alert7DaysSent").default(false),
  alert3DaysSent: boolean("alert3DaysSent").default(false),
  alert1DaySent: boolean("alert1DaySent").default(false),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LawsuitDeadline = typeof lawsuitDeadlines.$inferSelect;
export type InsertLawsuitDeadline = typeof lawsuitDeadlines.$inferInsert;

// ============ LAWSUIT MOVEMENTS (Movimentações do Processo) ============
export const lawsuitMovements = mysqlTable("lawsuit_movements", {
  id: int("id").autoincrement().primaryKey(),
  lawsuitId: int("lawsuitId").references(() => laborLawsuits.id).notNull(),
  
  movementDate: timestamp("movementDate").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  
  source: mysqlEnum("source", [
    "manual", // Inserido manualmente
    "escavador", // Via API Escavador
    "email", // Via email do tribunal
    "datajud" // Via DataJud
  ]).default("manual").notNull(),
  
  externalId: varchar("externalId", { length: 100 }), // ID na fonte externa
  rawData: json("rawData"), // Dados brutos da fonte
  
  isImportant: boolean("isImportant").default(false),
  requiresAction: boolean("requiresAction").default(false),
  actionTaken: text("actionTaken"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LawsuitMovement = typeof lawsuitMovements.$inferSelect;
export type InsertLawsuitMovement = typeof lawsuitMovements.$inferInsert;

// ============ LAWSUIT FINANCIAL (Financeiro do Processo) ============
export const lawsuitFinancial = mysqlTable("lawsuit_financial", {
  id: int("id").autoincrement().primaryKey(),
  lawsuitId: int("lawsuitId").references(() => laborLawsuits.id).notNull(),
  
  transactionType: mysqlEnum("transactionType", [
    "court_fee", // Custas processuais
    "lawyer_fee", // Honorários advocatícios
    "expert_fee", // Honorários periciais
    "settlement_payment", // Pagamento de acordo
    "condemnation_payment", // Pagamento de condenação
    "deposit", // Depósito recursal
    "other_expense", // Outras despesas
    "reimbursement" // Reembolso
  ]).notNull(),
  
  description: varchar("description", { length: 300 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  
  dueDate: timestamp("dueDate"),
  paidDate: timestamp("paidDate"),
  
  status: mysqlEnum("status", [
    "pending", // Pendente
    "paid", // Pago
    "overdue", // Atrasado
    "cancelled" // Cancelado
  ]).default("pending").notNull(),
  
  installmentNumber: int("installmentNumber"), // Número da parcela (se acordo parcelado)
  totalInstallments: int("totalInstallments"), // Total de parcelas
  
  receiptUrl: text("receiptUrl"), // Comprovante
  receiptKey: varchar("receiptKey", { length: 255 }),
  
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LawsuitFinancial = typeof lawsuitFinancial.$inferSelect;
export type InsertLawsuitFinancial = typeof lawsuitFinancial.$inferInsert;

// ============ COURT COMMUNICATIONS (Comunicações do Tribunal) ============
export const courtCommunications = mysqlTable("court_communications", {
  id: int("id").autoincrement().primaryKey(),
  lawsuitId: int("lawsuitId").references(() => laborLawsuits.id),
  
  communicationType: mysqlEnum("communicationType", [
    "email", // Email do tribunal
    "official_diary", // Publicação no diário oficial
    "subpoena", // Intimação
    "notification", // Notificação
    "other"
  ]).notNull(),
  
  subject: varchar("subject", { length: 500 }),
  content: text("content"),
  
  senderEmail: varchar("senderEmail", { length: 320 }),
  receivedAt: timestamp("receivedAt").notNull(),
  
  // Arquivo anexo
  attachmentUrl: text("attachmentUrl"),
  attachmentKey: varchar("attachmentKey", { length: 255 }),
  attachmentName: varchar("attachmentName", { length: 255 }),
  
  // Processamento
  isProcessed: boolean("isProcessed").default(false),
  processedAt: timestamp("processedAt"),
  processedBy: int("processedBy").references(() => users.id),
  
  // Extração automática
  extractedProcessNumber: varchar("extractedProcessNumber", { length: 30 }),
  extractedDeadline: timestamp("extractedDeadline"),
  extractedData: json("extractedData"),
  
  status: mysqlEnum("status", [
    "unread", // Não lida
    "read", // Lida
    "processed", // Processada
    "archived" // Arquivada
  ]).default("unread").notNull(),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CourtCommunication = typeof courtCommunications.$inferSelect;
export type InsertCourtCommunication = typeof courtCommunications.$inferInsert;

// ============ ESCAVADOR CONFIG (Configuração da API) ============
export const escavadorConfig = mysqlTable("escavador_config", {
  id: int("id").autoincrement().primaryKey(),
  apiKey: varchar("apiKey", { length: 255 }),
  isActive: boolean("isActive").default(false),
  lastSyncAt: timestamp("lastSyncAt"),
  syncFrequencyHours: int("syncFrequencyHours").default(24),
  monitoredCnpj: varchar("monitoredCnpj", { length: 20 }),
  monitoredCompanyName: varchar("monitoredCompanyName", { length: 200 }),
  webhookUrl: text("webhookUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscavadorConfig = typeof escavadorConfig.$inferSelect;
export type InsertEscavadorConfig = typeof escavadorConfig.$inferInsert;
