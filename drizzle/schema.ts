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


// ============ DOCUMENT MODELS (Modelos de Documentos Editáveis) ============
export const documentModels = mysqlTable("document_models", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "admission", // Admissão (contrato, ficha de registro)
    "safety", // Segurança (EPI, NR)
    "benefits", // Benefícios (VT, VR, plano de saúde)
    "confidentiality", // Confidencialidade
    "termination", // Rescisão
    "other"
  ]).default("other").notNull(),
  
  // Conteúdo do modelo (HTML com variáveis)
  content: text("content").notNull(),
  
  // Variáveis disponíveis neste modelo (JSON array)
  availableVariables: json("availableVariables"),
  
  // Configurações
  requiresSignature: boolean("requiresSignature").default(true),
  requiresWitness: boolean("requiresWitness").default(false),
  witnessCount: int("witnessCount").default(0),
  
  // Metadados
  version: varchar("version", { length: 20 }).default("1.0"),
  isActive: boolean("isActive").default(true),
  
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentModel = typeof documentModels.$inferSelect;
export type InsertDocumentModel = typeof documentModels.$inferInsert;

// ============ GENERATED DOCUMENTS (Documentos Gerados para Assinatura) ============
export const generatedDocuments = mysqlTable("generated_documents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  modelId: int("modelId").references(() => documentModels.id).notNull(),
  
  // Token único para acesso público
  token: varchar("token", { length: 64 }).notNull().unique(),
  
  // Conteúdo gerado (HTML preenchido)
  generatedContent: text("generatedContent").notNull(),
  
  // Dados usados para preencher (snapshot)
  filledData: json("filledData"),
  
  // Status do documento
  status: mysqlEnum("status", [
    "draft", // Rascunho
    "pending_signature", // Aguardando assinatura
    "signed", // Assinado digitalmente
    "printed", // Impresso para assinatura física
    "uploaded", // Assinatura física uploaded
    "cancelled", // Cancelado
    "expired" // Expirado
  ]).default("draft").notNull(),
  
  // Envio por email
  sentAt: timestamp("sentAt"),
  sentTo: varchar("sentTo", { length: 320 }),
  sentBy: int("sentBy").references(() => users.id),
  
  // Validação de identidade
  verificationCode: varchar("verificationCode", { length: 6 }),
  verificationCodeExpiresAt: timestamp("verificationCodeExpiresAt"),
  verificationAttempts: int("verificationAttempts").default(0),
  
  // Assinatura digital
  signedAt: timestamp("signedAt"),
  signedName: varchar("signedName", { length: 200 }),
  signedCpf: varchar("signedCpf", { length: 14 }),
  signedBirthDate: varchar("signedBirthDate", { length: 10 }),
  signatureImage: text("signatureImage"), // Base64 da assinatura desenhada
  signatureType: mysqlEnum("signatureType", ["drawn", "typed", "uploaded"]),
  
  // Metadados de assinatura
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  geoLocation: varchar("geoLocation", { length: 100 }),
  
  // Testemunhas (se necessário)
  witnesses: json("witnesses"), // Array de {name, cpf, signedAt}
  
  // PDF final
  pdfUrl: text("pdfUrl"),
  pdfKey: varchar("pdfKey", { length: 255 }),
  
  // Assinatura física (upload)
  uploadedSignatureUrl: text("uploadedSignatureUrl"),
  uploadedSignatureKey: varchar("uploadedSignatureKey", { length: 255 }),
  printedAt: timestamp("printedAt"),
  printedBy: int("printedBy").references(() => users.id),
  
  // Validade
  expiresAt: timestamp("expiresAt"),
  
  // Vinculação com documento final na pasta do funcionário
  finalDocumentId: int("finalDocumentId").references(() => documents.id),
  
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type InsertGeneratedDocument = typeof generatedDocuments.$inferInsert;

// ============ COMPANY SETTINGS (Dados da Empresa para Documentos) ============
export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  
  // Dados básicos
  companyName: varchar("companyName", { length: 200 }).notNull(),
  tradeName: varchar("tradeName", { length: 200 }), // Nome fantasia
  cnpj: varchar("cnpj", { length: 18 }).notNull(),
  stateRegistration: varchar("stateRegistration", { length: 20 }),
  municipalRegistration: varchar("municipalRegistration", { length: 20 }),
  
  // Endereço
  address: varchar("address", { length: 300 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  addressComplement: varchar("addressComplement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  
  // Contato
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 200 }),
  
  // Representante legal
  legalRepName: varchar("legalRepName", { length: 200 }),
  legalRepCpf: varchar("legalRepCpf", { length: 14 }),
  legalRepPosition: varchar("legalRepPosition", { length: 100 }),
  
  // Logo
  logoUrl: text("logoUrl"),
  logoKey: varchar("logoKey", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;


// ============ VACATION MANAGEMENT (Gestão de Férias) ============
export const vacations = mysqlTable("vacations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  
  // Período aquisitivo
  acquisitivePeriodStart: timestamp("acquisitivePeriodStart").notNull(),
  acquisitivePeriodEnd: timestamp("acquisitivePeriodEnd").notNull(),
  
  // Período concessivo (12 meses após fim do aquisitivo)
  concessivePeriodEnd: timestamp("concessivePeriodEnd").notNull(),
  
  // Dias de direito e utilizados
  totalDays: int("totalDays").default(30).notNull(),
  usedDays: int("usedDays").default(0).notNull(),
  soldDays: int("soldDays").default(0), // Abono pecuniário (máx 10 dias)
  remainingDays: int("remainingDays").default(30).notNull(),
  
  // Status do período
  status: mysqlEnum("status", [
    "acquiring", // Em aquisição
    "available", // Disponível para gozo
    "scheduled", // Agendada
    "in_progress", // Em gozo
    "completed", // Concluída
    "expired" // Vencida (não gozada no prazo)
  ]).default("acquiring").notNull(),
  
  // Alertas
  expirationAlertSent: boolean("expirationAlertSent").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vacation = typeof vacations.$inferSelect;
export type InsertVacation = typeof vacations.$inferInsert;

// ============ VACATION REQUESTS (Solicitações de Férias) ============
export const vacationRequests = mysqlTable("vacation_requests", {
  id: int("id").autoincrement().primaryKey(),
  vacationId: int("vacationId").references(() => vacations.id).notNull(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  
  // Período solicitado
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  daysRequested: int("daysRequested").notNull(),
  
  // Abono pecuniário
  sellDays: int("sellDays").default(0), // Dias a vender (máx 10)
  
  // Adiantamento de 13º
  advance13th: boolean("advance13th").default(false),
  
  // Workflow de aprovação
  status: mysqlEnum("status", [
    "pending", // Aguardando aprovação
    "approved", // Aprovada
    "rejected", // Rejeitada
    "cancelled", // Cancelada pelo funcionário
    "in_progress", // Em gozo
    "completed" // Concluída
  ]).default("pending").notNull(),
  
  // Aprovação
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  
  // Documentos gerados
  noticeDocumentId: int("noticeDocumentId").references(() => documents.id), // Aviso de férias
  receiptDocumentId: int("receiptDocumentId").references(() => documents.id), // Recibo de férias
  
  // Observações
  notes: text("notes"),
  
  requestedBy: int("requestedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VacationRequest = typeof vacationRequests.$inferSelect;
export type InsertVacationRequest = typeof vacationRequests.$inferInsert;

// ============ LEAVES (Afastamentos) ============
export const leaves = mysqlTable("leaves", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  
  // Tipo de afastamento
  leaveType: mysqlEnum("leaveType", [
    "medical", // Licença médica
    "maternity", // Licença maternidade
    "paternity", // Licença paternidade
    "marriage", // Licença casamento
    "bereavement", // Licença óbito
    "military", // Serviço militar
    "jury_duty", // Júri
    "blood_donation", // Doação de sangue
    "election", // Eleição
    "accident", // Acidente de trabalho
    "unpaid", // Licença não remunerada
    "other"
  ]).notNull(),
  
  // Período
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  expectedReturnDate: timestamp("expectedReturnDate"),
  actualReturnDate: timestamp("actualReturnDate"),
  
  // Documentação
  documentUrl: text("documentUrl"), // Atestado, certidão, etc.
  documentKey: varchar("documentKey", { length: 255 }),
  documentName: varchar("documentName", { length: 255 }),
  
  // Para licença médica
  cid: varchar("cid", { length: 10 }), // Código CID
  doctorName: varchar("doctorName", { length: 200 }),
  doctorCrm: varchar("doctorCrm", { length: 20 }),
  
  // INSS (para afastamentos > 15 dias)
  inssRequired: boolean("inssRequired").default(false),
  inssProtocol: varchar("inssProtocol", { length: 50 }),
  inssStartDate: timestamp("inssStartDate"),
  
  // Status
  status: mysqlEnum("status", [
    "active", // Em andamento
    "completed", // Concluído
    "cancelled" // Cancelado
  ]).default("active").notNull(),
  
  // Observações
  notes: text("notes"),
  
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = typeof leaves.$inferInsert;

// ============ BENEFITS TYPES (Tipos de Benefícios) ============
export const benefitTypes = mysqlTable("benefit_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(), // VT, VR, VA, PS, etc.
  description: text("description"),
  category: mysqlEnum("category", [
    "transport", // Vale transporte
    "meal", // Vale refeição/alimentação
    "health", // Plano de saúde
    "dental", // Plano odontológico
    "life_insurance", // Seguro de vida
    "pension", // Previdência privada
    "education", // Auxílio educação
    "childcare", // Auxílio creche
    "gym", // Gympass/academia
    "other"
  ]).notNull(),
  
  // Configurações
  isActive: boolean("isActive").default(true),
  requiresDocument: boolean("requiresDocument").default(false), // Requer documento (ex: VT)
  hasEmployeeContribution: boolean("hasEmployeeContribution").default(false), // Tem desconto do funcionário
  maxEmployeeContributionPercent: decimal("maxEmployeeContributionPercent", { precision: 5, scale: 2 }), // Ex: 6% para VT
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BenefitType = typeof benefitTypes.$inferSelect;
export type InsertBenefitType = typeof benefitTypes.$inferInsert;

// ============ EMPLOYEE BENEFITS (Benefícios por Funcionário) ============
export const employeeBenefits = mysqlTable("employee_benefits", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  benefitTypeId: int("benefitTypeId").references(() => benefitTypes.id).notNull(),
  
  // Valores
  companyValue: decimal("companyValue", { precision: 10, scale: 2 }).notNull(), // Valor pago pela empresa
  employeeDiscount: decimal("employeeDiscount", { precision: 10, scale: 2 }).default("0"), // Desconto do funcionário
  
  // Para VT
  transportLines: json("transportLines"), // Linhas de transporte utilizadas
  
  // Para plano de saúde
  planName: varchar("planName", { length: 100 }),
  planType: varchar("planType", { length: 50 }), // Enfermaria, apartamento, etc.
  dependentsCount: int("dependentsCount").default(0),
  dependentsInfo: json("dependentsInfo"), // Array de dependentes
  
  // Vigência
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  
  // Status
  status: mysqlEnum("status", [
    "active",
    "suspended",
    "cancelled"
  ]).default("active").notNull(),
  
  // Documentação
  optInDocumentUrl: text("optInDocumentUrl"), // Documento de adesão
  optInDocumentKey: varchar("optInDocumentKey", { length: 255 }),
  optOutDocumentUrl: text("optOutDocumentUrl"), // Documento de cancelamento
  optOutDocumentKey: varchar("optOutDocumentKey", { length: 255 }),
  
  notes: text("notes"),
  
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeBenefit = typeof employeeBenefits.$inferSelect;
export type InsertEmployeeBenefit = typeof employeeBenefits.$inferInsert;

// ============ ONBOARDING/OFFBOARDING CHECKLISTS ============
export const checklistTemplates = mysqlTable("checklist_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["onboarding", "offboarding"]).notNull(),
  description: text("description"),
  
  // Pode ser específico por departamento ou cargo
  departmentId: int("departmentId").references(() => departments.id),
  position: varchar("position", { length: 100 }),
  
  isDefault: boolean("isDefault").default(false), // Template padrão
  isActive: boolean("isActive").default(true),
  
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = typeof checklistTemplates.$inferInsert;

// ============ CHECKLIST ITEMS (Itens do Checklist) ============
export const checklistItems = mysqlTable("checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").references(() => checklistTemplates.id).notNull(),
  
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Categoria do item
  category: mysqlEnum("category", [
    "documents", // Documentos
    "equipment", // Equipamentos
    "access", // Acessos (sistemas, email, etc.)
    "training", // Treinamentos
    "administrative", // Administrativo
    "other"
  ]).notNull(),
  
  // Responsável
  responsibleRole: mysqlEnum("responsibleRole", [
    "hr", // RH
    "manager", // Gestor direto
    "it", // TI
    "finance", // Financeiro
    "employee", // Próprio funcionário
    "other"
  ]).default("hr").notNull(),
  
  // Prazo
  daysToComplete: int("daysToComplete").default(0), // Dias após admissão/demissão
  isMandatory: boolean("isMandatory").default(true),
  
  // Documento vinculado (se aplicável)
  documentModelId: int("documentModelId").references(() => documentModels.id),
  documentTypeId: int("documentTypeId").references(() => documentTypes.id),
  
  // Ordem
  sortOrder: int("sortOrder").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

// ============ EMPLOYEE CHECKLISTS (Checklists por Funcionário) ============
export const employeeChecklists = mysqlTable("emp_checklists", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  templateId: int("templateId").references(() => checklistTemplates.id).notNull(),
  
  type: mysqlEnum("type", ["onboarding", "offboarding"]).notNull(),
  
  // Datas
  startDate: timestamp("startDate").notNull(), // Data de início (admissão ou aviso de demissão)
  targetCompletionDate: timestamp("targetCompletionDate"),
  completedAt: timestamp("completedAt"),
  
  // Status geral
  status: mysqlEnum("status", [
    "in_progress",
    "completed",
    "cancelled"
  ]).default("in_progress").notNull(),
  
  // Progresso
  totalItems: int("totalItems").default(0),
  completedItems: int("completedItems").default(0),
  
  notes: text("notes"),
  
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeChecklist = typeof employeeChecklists.$inferSelect;
export type InsertEmployeeChecklist = typeof employeeChecklists.$inferInsert;

// ============ EMPLOYEE CHECKLIST ITEMS (Progresso dos Itens) ============
export const employeeChecklistItems = mysqlTable("emp_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  empChecklistId: int("empChecklistId").references(() => employeeChecklists.id).notNull(),
  itemId: int("itemId").references(() => checklistItems.id).notNull(),
  
  // Status do item
  status: mysqlEnum("status", [
    "pending",
    "in_progress",
    "completed",
    "skipped", // Pulado (não aplicável)
    "blocked" // Bloqueado por dependência
  ]).default("pending").notNull(),
  
  // Prazo
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  
  // Responsável atual
  assignedTo: int("assignedTo").references(() => users.id),
  completedBy: int("completedBy").references(() => users.id),
  
  // Documento vinculado (se gerado/uploaded)
  documentId: int("documentId").references(() => documents.id),
  genDocId: int("genDocId").references(() => generatedDocuments.id),
  
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeChecklistItem = typeof employeeChecklistItems.$inferSelect;
export type InsertEmployeeChecklistItem = typeof employeeChecklistItems.$inferInsert;

// ============ NOTIFICATION PREFERENCES (Preferências de Notificação) ============
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id).notNull().unique(),
  
  // Resumos por email
  dailyDigest: boolean("dailyDigest").default(true),
  dailyDigestTime: varchar("dailyDigestTime", { length: 5 }).default("08:00"), // HH:MM
  weeklyDigest: boolean("weeklyDigest").default(true),
  weeklyDigestDay: int("weeklyDigestDay").default(1), // 0=Dom, 1=Seg, etc.
  
  // Tipos de notificação
  notifyDocumentExpiring: boolean("notifyDocumentExpiring").default(true),
  notifyVacationExpiring: boolean("notifyVacationExpiring").default(true),
  notifyNewAlert: boolean("notifyNewAlert").default(true),
  notifyChecklistPending: boolean("notifyChecklistPending").default(true),
  notifySignatureRequired: boolean("notifySignatureRequired").default(true),
  notifyLawsuitUpdate: boolean("notifyLawsuitUpdate").default(true),
  
  // Canais
  emailEnabled: boolean("emailEnabled").default(true),
  inAppEnabled: boolean("inAppEnabled").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ============ NOTIFICATIONS (Notificações In-App) ============
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id).notNull(),
  
  // Tipo e conteúdo
  type: mysqlEnum("type", [
    "document_expiring",
    "document_expired",
    "vacation_expiring",
    "vacation_approved",
    "vacation_rejected",
    "alert_new",
    "checklist_pending",
    "checklist_overdue",
    "signature_required",
    "signature_completed",
    "lawsuit_update",
    "hearing_reminder",
    "deadline_reminder",
    "system"
  ]).notNull(),
  
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  
  // Link para ação
  actionUrl: varchar("actionUrl", { length: 500 }),
  actionLabel: varchar("actionLabel", { length: 50 }),
  
  // Entidade relacionada
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  
  // Prioridade
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  
  // Status
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  
  // Expiração
  expiresAt: timestamp("expiresAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============ NOTIFICATION DIGESTS (Resumos Enviados) ============
export const notificationDigests = mysqlTable("notification_digests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id).notNull(),
  
  type: mysqlEnum("type", ["daily", "weekly"]).notNull(),
  
  // Período coberto
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  // Conteúdo
  itemsIncluded: int("itemsIncluded").default(0),
  summary: json("summary"), // Resumo dos itens
  
  // Envio
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending"),
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationDigest = typeof notificationDigests.$inferSelect;
export type InsertNotificationDigest = typeof notificationDigests.$inferInsert;
