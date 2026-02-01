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
