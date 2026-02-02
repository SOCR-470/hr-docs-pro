import { db } from "./db";
import { vacations, vacationRequests, leaves, employees, documents, notifications, users } from "../drizzle/schema";
import { eq, and, desc, gte, lte, or, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// ============ VACATION PERIODS ============

// Create vacation period for employee (usually when hired)
export async function createVacationPeriod(employeeId: number, admissionDate: Date) {
  const acquisitivePeriodStart = admissionDate;
  const acquisitivePeriodEnd = new Date(admissionDate);
  acquisitivePeriodEnd.setFullYear(acquisitivePeriodEnd.getFullYear() + 1);
  acquisitivePeriodEnd.setDate(acquisitivePeriodEnd.getDate() - 1);
  
  const concessivePeriodEnd = new Date(acquisitivePeriodEnd);
  concessivePeriodEnd.setFullYear(concessivePeriodEnd.getFullYear() + 1);
  
  const [result] = await db.insert(vacations).values({
    employeeId,
    acquisitivePeriodStart,
    acquisitivePeriodEnd,
    concessivePeriodEnd,
    totalDays: 30,
    usedDays: 0,
    soldDays: 0,
    remainingDays: 30,
    status: "acquiring",
  });
  
  return result.insertId;
}

// Get vacation periods for employee
export async function getVacationPeriods(employeeId: number) {
  return db.select()
    .from(vacations)
    .where(eq(vacations.employeeId, employeeId))
    .orderBy(desc(vacations.acquisitivePeriodStart));
}

// Get all vacation periods with employee info
export async function getAllVacationPeriods(filters?: {
  status?: string;
  departmentId?: number;
  expiringInDays?: number;
}) {
  let query = db.select({
    vacation: vacations,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
      departmentId: employees.departmentId,
    },
  })
  .from(vacations)
  .innerJoin(employees, eq(vacations.employeeId, employees.id))
  .orderBy(desc(vacations.concessivePeriodEnd));
  
  const results = await query;
  
  // Apply filters in memory for complex conditions
  let filtered = results;
  
  if (filters?.status) {
    filtered = filtered.filter(r => r.vacation.status === filters.status);
  }
  
  if (filters?.departmentId) {
    filtered = filtered.filter(r => r.employee.departmentId === filters.departmentId);
  }
  
  if (filters?.expiringInDays) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + filters.expiringInDays);
    filtered = filtered.filter(r => 
      r.vacation.status === 'available' && 
      new Date(r.vacation.concessivePeriodEnd) <= expirationDate
    );
  }
  
  return filtered;
}

// Update vacation period status based on dates
export async function updateVacationStatuses() {
  const now = new Date();
  
  // Update acquiring -> available (when acquisitive period ends)
  await db.update(vacations)
    .set({ status: "available" })
    .where(and(
      eq(vacations.status, "acquiring"),
      lte(vacations.acquisitivePeriodEnd, now)
    ));
  
  // Update available -> expired (when concessivo period ends without being used)
  await db.update(vacations)
    .set({ status: "expired" })
    .where(and(
      eq(vacations.status, "available"),
      lte(vacations.concessivePeriodEnd, now),
      sql`${vacations.remainingDays} > 0`
    ));
  
  return { success: true };
}

// Get vacation summary for dashboard
export async function getVacationSummary() {
  const allVacations = await db.select().from(vacations);
  
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return {
    total: allVacations.length,
    acquiring: allVacations.filter(v => v.status === 'acquiring').length,
    available: allVacations.filter(v => v.status === 'available').length,
    scheduled: allVacations.filter(v => v.status === 'scheduled').length,
    inProgress: allVacations.filter(v => v.status === 'in_progress').length,
    expired: allVacations.filter(v => v.status === 'expired').length,
    expiringIn30Days: allVacations.filter(v => 
      v.status === 'available' && 
      new Date(v.concessivePeriodEnd) <= thirtyDaysFromNow
    ).length,
  };
}

// ============ VACATION REQUESTS ============

// Create vacation request
export async function createVacationRequest(data: {
  vacationId: number;
  employeeId: number;
  startDate: Date;
  endDate: Date;
  sellDays?: number;
  advance13th?: boolean;
  notes?: string;
  requestedBy: number;
}) {
  // Calculate days
  const daysRequested = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Validate sell days (max 10)
  const sellDays = Math.min(data.sellDays || 0, 10);
  
  const [result] = await db.insert(vacationRequests).values({
    vacationId: data.vacationId,
    employeeId: data.employeeId,
    startDate: data.startDate,
    endDate: data.endDate,
    daysRequested,
    sellDays,
    advance13th: data.advance13th || false,
    status: "pending",
    notes: data.notes,
    requestedBy: data.requestedBy,
  });
  
  return result.insertId;
}

// Get vacation requests
export async function getVacationRequests(filters?: {
  employeeId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  let query = db.select({
    request: vacationRequests,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
      departmentId: employees.departmentId,
    },
    vacation: vacations,
  })
  .from(vacationRequests)
  .innerJoin(employees, eq(vacationRequests.employeeId, employees.id))
  .innerJoin(vacations, eq(vacationRequests.vacationId, vacations.id))
  .orderBy(desc(vacationRequests.createdAt));
  
  const results = await query;
  
  let filtered = results;
  
  if (filters?.employeeId) {
    filtered = filtered.filter(r => r.request.employeeId === filters.employeeId);
  }
  
  if (filters?.status) {
    filtered = filtered.filter(r => r.request.status === filters.status);
  }
  
  return filtered;
}

// Approve vacation request
export async function approveVacationRequest(requestId: number, approvedBy: number) {
  const [request] = await db.select()
    .from(vacationRequests)
    .where(eq(vacationRequests.id, requestId));
  
  if (!request) throw new Error("Solicitação não encontrada");
  if (request.status !== "pending") throw new Error("Solicitação já processada");
  
  // Update request
  await db.update(vacationRequests)
    .set({
      status: "approved",
      approvedBy,
      approvedAt: new Date(),
    })
    .where(eq(vacationRequests.id, requestId));
  
  // Update vacation period
  const totalDaysUsed = request.daysRequested + (request.sellDays || 0);
  await db.update(vacations)
    .set({
      status: "scheduled",
      usedDays: sql`${vacations.usedDays} + ${request.daysRequested}`,
      soldDays: sql`${vacations.soldDays} + ${request.sellDays || 0}`,
      remainingDays: sql`${vacations.remainingDays} - ${totalDaysUsed}`,
    })
    .where(eq(vacations.id, request.vacationId));
  
  // Create notification for employee
  const [employee] = await db.select().from(employees).where(eq(employees.id, request.employeeId));
  if (employee) {
    await createNotification({
      userId: request.requestedBy!,
      type: "vacation_approved",
      title: "Férias Aprovadas",
      message: `Suas férias de ${request.daysRequested} dias foram aprovadas para o período de ${formatDate(request.startDate)} a ${formatDate(request.endDate)}.`,
      relatedEntityType: "vacation_request",
      relatedEntityId: requestId,
    });
  }
  
  return { success: true };
}

// Reject vacation request
export async function rejectVacationRequest(requestId: number, rejectedBy: number, reason: string) {
  const [request] = await db.select()
    .from(vacationRequests)
    .where(eq(vacationRequests.id, requestId));
  
  if (!request) throw new Error("Solicitação não encontrada");
  if (request.status !== "pending") throw new Error("Solicitação já processada");
  
  await db.update(vacationRequests)
    .set({
      status: "rejected",
      approvedBy: rejectedBy,
      approvedAt: new Date(),
      rejectionReason: reason,
    })
    .where(eq(vacationRequests.id, requestId));
  
  // Create notification
  await createNotification({
    userId: request.requestedBy!,
    type: "vacation_rejected",
    title: "Férias Rejeitadas",
    message: `Sua solicitação de férias foi rejeitada. Motivo: ${reason}`,
    relatedEntityType: "vacation_request",
    relatedEntityId: requestId,
  });
  
  return { success: true };
}

// Cancel vacation request
export async function cancelVacationRequest(requestId: number) {
  const [request] = await db.select()
    .from(vacationRequests)
    .where(eq(vacationRequests.id, requestId));
  
  if (!request) throw new Error("Solicitação não encontrada");
  if (request.status === "completed" || request.status === "in_progress") {
    throw new Error("Não é possível cancelar férias em andamento ou concluídas");
  }
  
  // If was approved, restore days
  if (request.status === "approved") {
    const totalDaysUsed = request.daysRequested + (request.sellDays || 0);
    await db.update(vacations)
      .set({
        status: "available",
        usedDays: sql`${vacations.usedDays} - ${request.daysRequested}`,
        soldDays: sql`${vacations.soldDays} - ${request.sellDays || 0}`,
        remainingDays: sql`${vacations.remainingDays} + ${totalDaysUsed}`,
      })
      .where(eq(vacations.id, request.vacationId));
  }
  
  await db.update(vacationRequests)
    .set({ status: "cancelled" })
    .where(eq(vacationRequests.id, requestId));
  
  return { success: true };
}

// ============ LEAVES (AFASTAMENTOS) ============

// Create leave
export async function createLeave(data: {
  employeeId: number;
  leaveType: string;
  startDate: Date;
  endDate?: Date;
  expectedReturnDate?: Date;
  documentUrl?: string;
  documentKey?: string;
  documentName?: string;
  cid?: string;
  doctorName?: string;
  doctorCrm?: string;
  notes?: string;
  createdBy: number;
}) {
  // Check if INSS is required (> 15 days)
  let inssRequired = false;
  if (data.endDate) {
    const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
    inssRequired = days > 15 && (data.leaveType === 'medical' || data.leaveType === 'accident');
  }
  
  const [result] = await db.insert(leaves).values({
    ...data,
    leaveType: data.leaveType as any,
    inssRequired,
    status: "active",
  });
  
  // Update employee status
  await db.update(employees)
    .set({ status: "on_leave" })
    .where(eq(employees.id, data.employeeId));
  
  return result.insertId;
}

// Get leaves
export async function getLeaves(filters?: {
  employeeId?: number;
  status?: string;
  leaveType?: string;
}) {
  let query = db.select({
    leave: leaves,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
      departmentId: employees.departmentId,
    },
  })
  .from(leaves)
  .innerJoin(employees, eq(leaves.employeeId, employees.id))
  .orderBy(desc(leaves.startDate));
  
  const results = await query;
  
  let filtered = results;
  
  if (filters?.employeeId) {
    filtered = filtered.filter(r => r.leave.employeeId === filters.employeeId);
  }
  
  if (filters?.status) {
    filtered = filtered.filter(r => r.leave.status === filters.status);
  }
  
  if (filters?.leaveType) {
    filtered = filtered.filter(r => r.leave.leaveType === filters.leaveType);
  }
  
  return filtered;
}

// Update leave
export async function updateLeave(id: number, data: Partial<{
  endDate: Date;
  actualReturnDate: Date;
  status: string;
  inssProtocol: string;
  inssStartDate: Date;
  notes: string;
}>) {
  await db.update(leaves)
    .set(data as any)
    .where(eq(leaves.id, id));
  
  // If completed, update employee status
  if (data.status === 'completed' || data.actualReturnDate) {
    const [leave] = await db.select().from(leaves).where(eq(leaves.id, id));
    if (leave) {
      await db.update(employees)
        .set({ status: "active" })
        .where(eq(employees.id, leave.employeeId));
    }
  }
  
  return { success: true };
}

// Get leave types summary
export async function getLeaveSummary() {
  const allLeaves = await db.select().from(leaves);
  
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = { active: 0, completed: 0, cancelled: 0 };
  
  for (const leave of allLeaves) {
    byType[leave.leaveType] = (byType[leave.leaveType] || 0) + 1;
    byStatus[leave.status] = (byStatus[leave.status] || 0) + 1;
  }
  
  return {
    total: allLeaves.length,
    byType,
    byStatus,
    activeCount: byStatus.active,
  };
}

// ============ CALENDAR VIEW ============

// Get vacation calendar for a period
export async function getVacationCalendar(startDate: Date, endDate: Date, departmentId?: number) {
  const requests = await db.select({
    request: vacationRequests,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
      departmentId: employees.departmentId,
    },
  })
  .from(vacationRequests)
  .innerJoin(employees, eq(vacationRequests.employeeId, employees.id))
  .where(and(
    or(
      eq(vacationRequests.status, "approved"),
      eq(vacationRequests.status, "in_progress"),
      eq(vacationRequests.status, "completed")
    )
  ));
  
  // Filter by date range and department
  return requests.filter(r => {
    const reqStart = new Date(r.request.startDate);
    const reqEnd = new Date(r.request.endDate);
    
    const inRange = reqStart <= endDate && reqEnd >= startDate;
    const inDept = !departmentId || r.employee.departmentId === departmentId;
    
    return inRange && inDept;
  });
}

// Get leaves calendar
export async function getLeavesCalendar(startDate: Date, endDate: Date, departmentId?: number) {
  const allLeaves = await db.select({
    leave: leaves,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
      departmentId: employees.departmentId,
    },
  })
  .from(leaves)
  .innerJoin(employees, eq(leaves.employeeId, employees.id))
  .where(eq(leaves.status, "active"));
  
  return allLeaves.filter(l => {
    const leaveStart = new Date(l.leave.startDate);
    const leaveEnd = l.leave.endDate ? new Date(l.leave.endDate) : new Date();
    
    const inRange = leaveStart <= endDate && leaveEnd >= startDate;
    const inDept = !departmentId || l.employee.departmentId === departmentId;
    
    return inRange && inDept;
  });
}

// ============ NOTIFICATIONS ============

async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  priority?: string;
}) {
  await db.insert(notifications).values({
    ...data,
    type: data.type as any,
    priority: (data.priority || "medium") as any,
    isRead: false,
  });
}

// ============ HELPERS ============

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

// ============ EXPORTED UTILITIES FOR TESTING ============

export function calculateVacationPeriods(hireDate: Date) {
  const acquisitionStart = new Date(hireDate);
  const acquisitionEnd = new Date(hireDate);
  acquisitionEnd.setFullYear(acquisitionEnd.getFullYear() + 1);
  acquisitionEnd.setDate(acquisitionEnd.getDate() - 1);
  
  const concessionStart = new Date(acquisitionEnd);
  concessionStart.setDate(concessionStart.getDate() + 1);
  const concessionEnd = new Date(concessionStart);
  concessionEnd.setFullYear(concessionEnd.getFullYear() + 1);
  
  return {
    acquisitionStart,
    acquisitionEnd,
    concessionStart,
    concessionEnd,
  };
}

export function calculateVacationBalance(totalDays: number, usedDays: number): number {
  return Math.max(0, totalDays - usedDays);
}

export function formatVacationPeriod(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('pt-BR');
  const endStr = end.toLocaleDateString('pt-BR');
  return `${startStr} - ${endStr}`;
}

// Initialize vacation periods for existing employees
export async function initializeVacationPeriods() {
  const allEmployees = await db.select().from(employees).where(eq(employees.status, "active"));
  
  for (const employee of allEmployees) {
    // Check if already has vacation period
    const existing = await db.select()
      .from(vacations)
      .where(eq(vacations.employeeId, employee.id));
    
    if (existing.length === 0 && employee.admissionDate) {
      await createVacationPeriod(employee.id, new Date(employee.admissionDate));
    }
  }
  
  return { initialized: allEmployees.length };
}
