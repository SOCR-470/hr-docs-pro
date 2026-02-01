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
