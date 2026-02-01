/**
 * Funções de banco de dados para o módulo de Audiências Judiciais
 */

import { db } from "./db";
import {
  lawyers,
  laborLawsuits,
  lawsuitHearings,
  lawsuitWitnesses,
  lawsuitDocuments,
  lawsuitDeadlines,
  lawsuitMovements,
  lawsuitFinancial,
  courtCommunications,
  employees,
  departments,
  InsertLawyer,
  InsertLaborLawsuit,
  InsertLawsuitHearing,
  InsertLawsuitWitness,
  InsertLawsuitDocument,
  InsertLawsuitDeadline,
  InsertLawsuitFinancial,
  InsertCourtCommunication,
} from "../drizzle/schema";
import { eq, desc, asc, and, gte, lte, like, or, sql, count, sum } from "drizzle-orm";

// ============ LAWYERS ============

export async function getLawyers() {
  return db.select().from(lawyers).where(eq(lawyers.isActive, true)).orderBy(asc(lawyers.name));
}

export async function getLawyerById(id: number) {
  const result = await db.select().from(lawyers).where(eq(lawyers.id, id)).limit(1);
  return result[0] || null;
}

export async function createLawyer(data: InsertLawyer) {
  const result = await db.insert(lawyers).values(data).$returningId();
  return result[0].id;
}

export async function updateLawyer(id: number, data: Partial<InsertLawyer>) {
  await db.update(lawyers).set(data).where(eq(lawyers.id, id));
}

export async function deleteLawyer(id: number) {
  await db.update(lawyers).set({ isActive: false }).where(eq(lawyers.id, id));
}

// ============ LABOR LAWSUITS ============

export async function getLawsuits(filters?: {
  status?: string;
  phase?: string;
  lawyerId?: number;
  departmentId?: number;
  search?: string;
}) {
  let query = db.select({
    lawsuit: laborLawsuits,
    lawyer: lawyers,
    employee: employees,
    department: departments,
  })
    .from(laborLawsuits)
    .leftJoin(lawyers, eq(laborLawsuits.lawyerId, lawyers.id))
    .leftJoin(employees, eq(laborLawsuits.claimantId, employees.id))
    .leftJoin(departments, eq(laborLawsuits.departmentId, departments.id))
    .orderBy(desc(laborLawsuits.createdAt))
    .$dynamic();

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(laborLawsuits.status, filters.status as any));
  }
  if (filters?.phase) {
    conditions.push(eq(laborLawsuits.phase, filters.phase as any));
  }
  if (filters?.lawyerId) {
    conditions.push(eq(laborLawsuits.lawyerId, filters.lawyerId));
  }
  if (filters?.departmentId) {
    conditions.push(eq(laborLawsuits.departmentId, filters.departmentId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(laborLawsuits.processNumber, `%${filters.search}%`),
        like(laborLawsuits.claimantName, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query;
}

export async function getLawsuitById(id: number) {
  const result = await db.select({
    lawsuit: laborLawsuits,
    lawyer: lawyers,
    employee: employees,
    department: departments,
  })
    .from(laborLawsuits)
    .leftJoin(lawyers, eq(laborLawsuits.lawyerId, lawyers.id))
    .leftJoin(employees, eq(laborLawsuits.claimantId, employees.id))
    .leftJoin(departments, eq(laborLawsuits.departmentId, departments.id))
    .where(eq(laborLawsuits.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function getLawsuitByProcessNumber(processNumber: string) {
  const result = await db.select()
    .from(laborLawsuits)
    .where(eq(laborLawsuits.processNumber, processNumber))
    .limit(1);
  return result[0] || null;
}

export async function createLawsuit(data: InsertLaborLawsuit) {
  const result = await db.insert(laborLawsuits).values(data).$returningId();
  return result[0].id;
}

export async function updateLawsuit(id: number, data: Partial<InsertLaborLawsuit>) {
  await db.update(laborLawsuits).set(data).where(eq(laborLawsuits.id, id));
}

export async function deleteLawsuit(id: number) {
  await db.update(laborLawsuits).set({ status: "archived" }).where(eq(laborLawsuits.id, id));
}

// ============ HEARINGS ============

export async function getHearings(filters?: {
  lawsuitId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  let query = db.select({
    hearing: lawsuitHearings,
    lawsuit: laborLawsuits,
  })
    .from(lawsuitHearings)
    .leftJoin(laborLawsuits, eq(lawsuitHearings.lawsuitId, laborLawsuits.id))
    .orderBy(asc(lawsuitHearings.scheduledDate))
    .$dynamic();

  const conditions = [];

  if (filters?.lawsuitId) {
    conditions.push(eq(lawsuitHearings.lawsuitId, filters.lawsuitId));
  }
  if (filters?.status) {
    conditions.push(eq(lawsuitHearings.status, filters.status as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(lawsuitHearings.scheduledDate, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(lawsuitHearings.scheduledDate, filters.endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query;
}

export async function getHearingById(id: number) {
  const result = await db.select({
    hearing: lawsuitHearings,
    lawsuit: laborLawsuits,
  })
    .from(lawsuitHearings)
    .leftJoin(laborLawsuits, eq(lawsuitHearings.lawsuitId, laborLawsuits.id))
    .where(eq(lawsuitHearings.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function getUpcomingHearings(days: number = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return db.select({
    hearing: lawsuitHearings,
    lawsuit: laborLawsuits,
  })
    .from(lawsuitHearings)
    .leftJoin(laborLawsuits, eq(lawsuitHearings.lawsuitId, laborLawsuits.id))
    .where(
      and(
        gte(lawsuitHearings.scheduledDate, now),
        lte(lawsuitHearings.scheduledDate, future),
        eq(lawsuitHearings.status, "scheduled")
      )
    )
    .orderBy(asc(lawsuitHearings.scheduledDate));
}

export async function createHearing(data: InsertLawsuitHearing) {
  const result = await db.insert(lawsuitHearings).values(data).$returningId();
  return result[0].id;
}

export async function updateHearing(id: number, data: Partial<InsertLawsuitHearing>) {
  await db.update(lawsuitHearings).set(data).where(eq(lawsuitHearings.id, id));
}

export async function deleteHearing(id: number) {
  await db.update(lawsuitHearings).set({ status: "cancelled" }).where(eq(lawsuitHearings.id, id));
}

// ============ WITNESSES ============

export async function getWitnesses(lawsuitId: number) {
  return db.select({
    witness: lawsuitWitnesses,
    employee: employees,
  })
    .from(lawsuitWitnesses)
    .leftJoin(employees, eq(lawsuitWitnesses.employeeId, employees.id))
    .where(eq(lawsuitWitnesses.lawsuitId, lawsuitId))
    .orderBy(asc(lawsuitWitnesses.name));
}

export async function createWitness(data: InsertLawsuitWitness) {
  const result = await db.insert(lawsuitWitnesses).values(data).$returningId();
  return result[0].id;
}

export async function updateWitness(id: number, data: Partial<InsertLawsuitWitness>) {
  await db.update(lawsuitWitnesses).set(data).where(eq(lawsuitWitnesses.id, id));
}

export async function deleteWitness(id: number) {
  await db.delete(lawsuitWitnesses).where(eq(lawsuitWitnesses.id, id));
}

// ============ DOCUMENTS ============

export async function getLawsuitDocuments(lawsuitId: number) {
  return db.select()
    .from(lawsuitDocuments)
    .where(eq(lawsuitDocuments.lawsuitId, lawsuitId))
    .orderBy(desc(lawsuitDocuments.createdAt));
}

export async function createLawsuitDocument(data: InsertLawsuitDocument) {
  const result = await db.insert(lawsuitDocuments).values(data).$returningId();
  return result[0].id;
}

export async function deleteLawsuitDocument(id: number) {
  await db.delete(lawsuitDocuments).where(eq(lawsuitDocuments.id, id));
}

// ============ DEADLINES ============

export async function getDeadlines(filters?: {
  lawsuitId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  let query = db.select({
    deadline: lawsuitDeadlines,
    lawsuit: laborLawsuits,
  })
    .from(lawsuitDeadlines)
    .leftJoin(laborLawsuits, eq(lawsuitDeadlines.lawsuitId, laborLawsuits.id))
    .orderBy(asc(lawsuitDeadlines.dueDate))
    .$dynamic();

  const conditions = [];

  if (filters?.lawsuitId) {
    conditions.push(eq(lawsuitDeadlines.lawsuitId, filters.lawsuitId));
  }
  if (filters?.status) {
    conditions.push(eq(lawsuitDeadlines.status, filters.status as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(lawsuitDeadlines.dueDate, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(lawsuitDeadlines.dueDate, filters.endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query;
}

export async function getUpcomingDeadlines(days: number = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return db.select({
    deadline: lawsuitDeadlines,
    lawsuit: laborLawsuits,
  })
    .from(lawsuitDeadlines)
    .leftJoin(laborLawsuits, eq(lawsuitDeadlines.lawsuitId, laborLawsuits.id))
    .where(
      and(
        gte(lawsuitDeadlines.dueDate, now),
        lte(lawsuitDeadlines.dueDate, future),
        eq(lawsuitDeadlines.status, "pending")
      )
    )
    .orderBy(asc(lawsuitDeadlines.dueDate));
}

export async function createDeadline(data: InsertLawsuitDeadline) {
  const result = await db.insert(lawsuitDeadlines).values(data).$returningId();
  return result[0].id;
}

export async function updateDeadline(id: number, data: Partial<InsertLawsuitDeadline>) {
  await db.update(lawsuitDeadlines).set(data).where(eq(lawsuitDeadlines.id, id));
}

export async function deleteDeadline(id: number) {
  await db.delete(lawsuitDeadlines).where(eq(lawsuitDeadlines.id, id));
}

// ============ MOVEMENTS ============

export async function getMovements(lawsuitId: number) {
  return db.select()
    .from(lawsuitMovements)
    .where(eq(lawsuitMovements.lawsuitId, lawsuitId))
    .orderBy(desc(lawsuitMovements.movementDate));
}

export async function createMovement(data: typeof lawsuitMovements.$inferInsert) {
  const result = await db.insert(lawsuitMovements).values(data).$returningId();
  return result[0].id;
}

// ============ FINANCIAL ============

export async function getFinancialRecords(lawsuitId: number) {
  return db.select()
    .from(lawsuitFinancial)
    .where(eq(lawsuitFinancial.lawsuitId, lawsuitId))
    .orderBy(desc(lawsuitFinancial.createdAt));
}

export async function getFinancialSummary(lawsuitId: number) {
  const records = await db.select()
    .from(lawsuitFinancial)
    .where(eq(lawsuitFinancial.lawsuitId, lawsuitId));

  let totalExpenses = 0;
  let totalPaid = 0;
  let totalPending = 0;

  for (const record of records) {
    const amount = parseFloat(record.amount || "0");
    totalExpenses += amount;
    if (record.status === "paid") {
      totalPaid += amount;
    } else if (record.status === "pending" || record.status === "overdue") {
      totalPending += amount;
    }
  }

  return { totalExpenses, totalPaid, totalPending };
}

export async function createFinancialRecord(data: InsertLawsuitFinancial) {
  const result = await db.insert(lawsuitFinancial).values(data).$returningId();
  return result[0].id;
}

export async function updateFinancialRecord(id: number, data: Partial<InsertLawsuitFinancial>) {
  await db.update(lawsuitFinancial).set(data).where(eq(lawsuitFinancial.id, id));
}

export async function deleteFinancialRecord(id: number) {
  await db.delete(lawsuitFinancial).where(eq(lawsuitFinancial.id, id));
}

// ============ COURT COMMUNICATIONS ============

export async function getCourtCommunications(filters?: {
  lawsuitId?: number;
  status?: string;
  isProcessed?: boolean;
}) {
  let query = db.select({
    communication: courtCommunications,
    lawsuit: laborLawsuits,
  })
    .from(courtCommunications)
    .leftJoin(laborLawsuits, eq(courtCommunications.lawsuitId, laborLawsuits.id))
    .orderBy(desc(courtCommunications.receivedAt))
    .$dynamic();

  const conditions = [];

  if (filters?.lawsuitId) {
    conditions.push(eq(courtCommunications.lawsuitId, filters.lawsuitId));
  }
  if (filters?.status) {
    conditions.push(eq(courtCommunications.status, filters.status as any));
  }
  if (filters?.isProcessed !== undefined) {
    conditions.push(eq(courtCommunications.isProcessed, filters.isProcessed));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query;
}

export async function createCourtCommunication(data: InsertCourtCommunication) {
  const result = await db.insert(courtCommunications).values(data).$returningId();
  return result[0].id;
}

export async function updateCourtCommunication(id: number, data: Partial<InsertCourtCommunication>) {
  await db.update(courtCommunications).set(data).where(eq(courtCommunications.id, id));
}

// ============ DASHBOARD STATS ============

export async function getLawsuitStats() {
  const allLawsuits = await db.select().from(laborLawsuits);
  
  const stats = {
    total: allLawsuits.length,
    active: allLawsuits.filter((l: typeof laborLawsuits.$inferSelect) => l.status === "active").length,
    won: allLawsuits.filter((l: typeof laborLawsuits.$inferSelect) => l.status === "won").length,
    lost: allLawsuits.filter((l: typeof laborLawsuits.$inferSelect) => l.status === "lost").length,
    settled: allLawsuits.filter((l: typeof laborLawsuits.$inferSelect) => l.status === "settled").length,
    totalClaimAmount: 0,
    totalProvisionAmount: 0,
    totalSettlementAmount: 0,
    totalCondemnationAmount: 0,
  };

  for (const lawsuit of allLawsuits) {
    stats.totalClaimAmount += parseFloat(lawsuit.claimAmount || "0");
    stats.totalProvisionAmount += parseFloat(lawsuit.provisionAmount || "0");
    stats.totalSettlementAmount += parseFloat(lawsuit.settlementAmount || "0");
    stats.totalCondemnationAmount += parseFloat(lawsuit.condemnationAmount || "0");
  }

  return stats;
}

export async function getLawsuitsByDepartment() {
  const lawsuits = await db.select({
    departmentId: laborLawsuits.departmentId,
    departmentName: departments.name,
    count: count(),
  })
    .from(laborLawsuits)
    .leftJoin(departments, eq(laborLawsuits.departmentId, departments.id))
    .groupBy(laborLawsuits.departmentId, departments.name);

  return lawsuits;
}

export async function getLawsuitsByType() {
  const lawsuits = await db.select({
    type: laborLawsuits.lawsuitType,
    count: count(),
  })
    .from(laborLawsuits)
    .groupBy(laborLawsuits.lawsuitType);

  return lawsuits;
}
