import { eq, desc, and, gte, lte, like, sql, count, avg } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  employees, InsertEmployee, Employee,
  departments, InsertDepartment, Department,
  documents, InsertDocument, Document,
  documentTypes, InsertDocumentType, DocumentType,
  recurringDocuments, InsertRecurringDocument, RecurringDocument,
  complianceAlerts, InsertComplianceAlert, ComplianceAlert,
  externalRequests, InsertExternalRequest, ExternalRequest,
  auditLog, InsertAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Export db instance for direct use
export const db = drizzle(process.env.DATABASE_URL!);

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USERS ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ DEPARTMENTS ============
export async function getDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(departments.name);
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(departments).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ EMPLOYEES ============
export async function getEmployees(filters?: { 
  departmentId?: number; 
  status?: string; 
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select({
    employee: employees,
    department: departments,
  })
  .from(employees)
  .leftJoin(departments, eq(employees.departmentId, departments.id));

  const conditions = [];
  if (filters?.departmentId) conditions.push(eq(employees.departmentId, filters.departmentId));
  if (filters?.status) conditions.push(eq(employees.status, filters.status as any));
  if (filters?.search) conditions.push(like(employees.name, `%${filters.search}%`));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.orderBy(employees.name);
  return results.map(r => ({ ...r.employee, department: r.department }));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    employee: employees,
    department: departments,
  })
  .from(employees)
  .leftJoin(departments, eq(employees.departmentId, departments.id))
  .where(eq(employees.id, id))
  .limit(1);

  if (result.length === 0) return null;
  return { ...result[0].employee, department: result[0].department };
}

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employees).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
  return getEmployeeById(id);
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employees).where(eq(employees.id, id));
}

// ============ DOCUMENT TYPES ============
export async function getDocumentTypes(category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let results;
  if (category) {
    results = await db.select().from(documentTypes).where(eq(documentTypes.category, category as any));
  } else {
    results = await db.select().from(documentTypes).orderBy(documentTypes.category, documentTypes.name);
  }
  
  // Remove duplicatas por nome, mantendo o primeiro de cada
  const seen = new Set<string>();
  return results.filter(dt => {
    if (seen.has(dt.name)) return false;
    seen.add(dt.name);
    return true;
  });
}

export async function createDocumentType(data: InsertDocumentType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documentTypes).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ DOCUMENTS ============
export async function getDocumentsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    document: documents,
    documentType: documentTypes,
  })
  .from(documents)
  .leftJoin(documentTypes, eq(documents.documentTypeId, documentTypes.id))
  .where(eq(documents.employeeId, employeeId))
  .orderBy(desc(documents.createdAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set(data).where(eq(documents.id, id));
}

// ============ RECURRING DOCUMENTS ============
export async function getRecurringDocuments(filters?: {
  employeeId?: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    recurring: recurringDocuments,
    employee: employees,
  })
  .from(recurringDocuments)
  .leftJoin(employees, eq(recurringDocuments.employeeId, employees.id));

  const conditions = [];
  if (filters?.employeeId) conditions.push(eq(recurringDocuments.employeeId, filters.employeeId));
  if (filters?.type) conditions.push(eq(recurringDocuments.type, filters.type as any));
  if (filters?.startDate) conditions.push(gte(recurringDocuments.referenceDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(recurringDocuments.referenceDate, filters.endDate));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.orderBy(desc(recurringDocuments.referenceDate));
  return results.map(r => ({ ...r.recurring, employee: r.employee }));
}

export async function createRecurringDocument(data: InsertRecurringDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(recurringDocuments).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateRecurringDocument(id: number, data: Partial<InsertRecurringDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(recurringDocuments).set(data).where(eq(recurringDocuments.id, id));
}

// ============ COMPLIANCE ALERTS ============
export async function getComplianceAlerts(filters?: {
  employeeId?: number;
  status?: string;
  severity?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    alert: complianceAlerts,
    employee: employees,
  })
  .from(complianceAlerts)
  .leftJoin(employees, eq(complianceAlerts.employeeId, employees.id));

  const conditions = [];
  if (filters?.employeeId) conditions.push(eq(complianceAlerts.employeeId, filters.employeeId));
  if (filters?.status) conditions.push(eq(complianceAlerts.status, filters.status as any));
  if (filters?.severity) conditions.push(eq(complianceAlerts.severity, filters.severity as any));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  let finalQuery = query.orderBy(desc(complianceAlerts.createdAt));
  if (filters?.limit) {
    finalQuery = finalQuery.limit(filters.limit) as any;
  }

  const results = await finalQuery;
  return results.map(r => ({ ...r.alert, employee: r.employee }));
}

export async function createComplianceAlert(data: InsertComplianceAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(complianceAlerts).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateComplianceAlert(id: number, data: Partial<InsertComplianceAlert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(complianceAlerts).set(data).where(eq(complianceAlerts.id, id));
}

// ============ EXTERNAL REQUESTS ============
export async function getExternalRequests(filters?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    request: externalRequests,
    employee: employees,
  })
  .from(externalRequests)
  .leftJoin(employees, eq(externalRequests.employeeId, employees.id));

  if (filters?.status) {
    query = query.where(eq(externalRequests.status, filters.status as any)) as any;
  }

  const results = await query.orderBy(desc(externalRequests.createdAt));
  return results.map(r => ({ ...r.request, employee: r.employee }));
}

export async function getExternalRequestByToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({
    request: externalRequests,
    employee: employees,
    documentType: documentTypes,
  })
  .from(externalRequests)
  .leftJoin(employees, eq(externalRequests.employeeId, employees.id))
  .leftJoin(documentTypes, eq(externalRequests.documentTypeId, documentTypes.id))
  .where(eq(externalRequests.token, token))
  .limit(1);

  if (result.length === 0) return null;
  return { ...result[0].request, employee: result[0].employee, documentType: result[0].documentType };
}

export async function createExternalRequest(data: InsertExternalRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(externalRequests).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateExternalRequest(id: number, data: Partial<InsertExternalRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(externalRequests).set(data).where(eq(externalRequests.id, id));
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const [employeeStats] = await db.select({
    total: count(),
    avgCompliance: avg(employees.complianceScore),
  }).from(employees).where(eq(employees.status, 'active'));

  const [alertStats] = await db.select({
    open: count(),
  }).from(complianceAlerts).where(eq(complianceAlerts.status, 'open'));

  const departmentStats = await db.select({
    departmentId: employees.departmentId,
    departmentName: departments.name,
    employeeCount: count(),
    avgCompliance: avg(employees.complianceScore),
  })
  .from(employees)
  .leftJoin(departments, eq(employees.departmentId, departments.id))
  .where(eq(employees.status, 'active'))
  .groupBy(employees.departmentId, departments.name);

  const recentAlerts = await getComplianceAlerts({ status: 'open', limit: 10 });

  return {
    totalEmployees: employeeStats?.total || 0,
    avgComplianceScore: Math.round(Number(employeeStats?.avgCompliance) || 0),
    openAlerts: alertStats?.open || 0,
    departmentStats,
    recentAlerts,
  };
}

// ============ EMPLOYEES BY DEPARTMENT ============
export async function getEmployeesByDepartment(departmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: employees.id,
    name: employees.name,
    position: employees.position,
    complianceScore: employees.complianceScore,
    status: employees.status,
  })
  .from(employees)
  .where(and(
    eq(employees.departmentId, departmentId),
    eq(employees.status, 'active')
  ))
  .orderBy(employees.name);
}

// ============ AUDIT LOG ============
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values(data);
}
