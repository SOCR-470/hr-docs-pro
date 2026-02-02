import { db } from "./db";
import { benefitTypes, employeeBenefits, employees, departments } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ============ BENEFIT TYPES ============

// Create benefit type
export async function createBenefitType(data: {
  name: string;
  code: string;
  description?: string;
  category: string;
  requiresDocument?: boolean;
  hasEmployeeContribution?: boolean;
  maxEmployeeContributionPercent?: string;
}) {
  const [result] = await db.insert(benefitTypes).values({
    ...data,
    category: data.category as any,
    isActive: true,
  });
  
  return result.insertId;
}

// Get all benefit types
export async function getBenefitTypes(activeOnly = true) {
  if (activeOnly) {
    return db.select()
      .from(benefitTypes)
      .where(eq(benefitTypes.isActive, true))
      .orderBy(benefitTypes.name);
  }
  return db.select().from(benefitTypes).orderBy(benefitTypes.name);
}

// Update benefit type
export async function updateBenefitType(id: number, data: Partial<{
  name: string;
  description: string;
  category: string;
  requiresDocument: boolean;
  hasEmployeeContribution: boolean;
  maxEmployeeContributionPercent: string;
  isActive: boolean;
}>) {
  await db.update(benefitTypes)
    .set(data as any)
    .where(eq(benefitTypes.id, id));
  return { success: true };
}

// Create default benefit types
export async function createDefaultBenefitTypes() {
  const defaults = [
    { name: "Vale Transporte", code: "VT", category: "transport", hasEmployeeContribution: true, maxEmployeeContributionPercent: "6.00", requiresDocument: true },
    { name: "Vale Refeição", code: "VR", category: "meal", hasEmployeeContribution: false },
    { name: "Vale Alimentação", code: "VA", category: "meal", hasEmployeeContribution: false },
    { name: "Plano de Saúde", code: "PS", category: "health", hasEmployeeContribution: true, requiresDocument: true },
    { name: "Plano Odontológico", code: "PO", category: "dental", hasEmployeeContribution: true },
    { name: "Seguro de Vida", code: "SV", category: "life_insurance", hasEmployeeContribution: false },
    { name: "Previdência Privada", code: "PP", category: "pension", hasEmployeeContribution: true },
    { name: "Auxílio Educação", code: "AE", category: "education", hasEmployeeContribution: false },
    { name: "Auxílio Creche", code: "AC", category: "childcare", hasEmployeeContribution: false },
    { name: "Gympass", code: "GP", category: "gym", hasEmployeeContribution: true },
  ];
  
  let created = 0;
  for (const benefit of defaults) {
    // Check if exists
    const existing = await db.select()
      .from(benefitTypes)
      .where(eq(benefitTypes.code, benefit.code));
    
    if (existing.length === 0) {
      await db.insert(benefitTypes).values({
        ...benefit,
        category: benefit.category as any,
        isActive: true,
      });
      created++;
    }
  }
  
  return { created };
}

// ============ EMPLOYEE BENEFITS ============

// Assign benefit to employee
export async function assignBenefitToEmployee(data: {
  employeeId: number;
  benefitTypeId: number;
  companyValue: string;
  employeeDiscount?: string;
  transportLines?: any;
  planName?: string;
  planType?: string;
  dependentsCount?: number;
  dependentsInfo?: any;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  createdBy: number;
}) {
  // Check if already has this benefit active
  const existing = await db.select()
    .from(employeeBenefits)
    .where(and(
      eq(employeeBenefits.employeeId, data.employeeId),
      eq(employeeBenefits.benefitTypeId, data.benefitTypeId),
      eq(employeeBenefits.status, "active")
    ));
  
  if (existing.length > 0) {
    throw new Error("Funcionário já possui este benefício ativo");
  }
  
  const [result] = await db.insert(employeeBenefits).values({
    ...data,
    employeeDiscount: data.employeeDiscount || "0",
    status: "active",
  });
  
  return result.insertId;
}

// Get employee benefits
export async function getEmployeeBenefits(employeeId: number) {
  return db.select({
    benefit: employeeBenefits,
    type: benefitTypes,
  })
  .from(employeeBenefits)
  .innerJoin(benefitTypes, eq(employeeBenefits.benefitTypeId, benefitTypes.id))
  .where(eq(employeeBenefits.employeeId, employeeId))
  .orderBy(desc(employeeBenefits.startDate));
}

// Get all benefits with employee info
export async function getAllEmployeeBenefits(filters?: {
  benefitTypeId?: number;
  status?: string;
  departmentId?: number;
}) {
  const results = await db.select({
    benefit: employeeBenefits,
    type: benefitTypes,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
      departmentId: employees.departmentId,
    },
  })
  .from(employeeBenefits)
  .innerJoin(benefitTypes, eq(employeeBenefits.benefitTypeId, benefitTypes.id))
  .innerJoin(employees, eq(employeeBenefits.employeeId, employees.id))
  .orderBy(employees.name);
  
  let filtered = results;
  
  if (filters?.benefitTypeId) {
    filtered = filtered.filter(r => r.benefit.benefitTypeId === filters.benefitTypeId);
  }
  
  if (filters?.status) {
    filtered = filtered.filter(r => r.benefit.status === filters.status);
  }
  
  if (filters?.departmentId) {
    filtered = filtered.filter(r => r.employee.departmentId === filters.departmentId);
  }
  
  return filtered;
}

// Update employee benefit
export async function updateEmployeeBenefit(id: number, data: Partial<{
  companyValue: string;
  employeeDiscount: string;
  transportLines: any;
  planName: string;
  planType: string;
  dependentsCount: number;
  dependentsInfo: any;
  endDate: Date;
  status: string;
  notes: string;
}>) {
  await db.update(employeeBenefits)
    .set(data as any)
    .where(eq(employeeBenefits.id, id));
  return { success: true };
}

// Cancel employee benefit
export async function cancelEmployeeBenefit(id: number) {
  await db.update(employeeBenefits)
    .set({
      status: "cancelled",
      endDate: new Date(),
    })
    .where(eq(employeeBenefits.id, id));
  return { success: true };
}

// ============ REPORTS ============

// Get benefit costs by department
export async function getBenefitCostsByDepartment() {
  const results = await db.select({
    benefit: employeeBenefits,
    type: benefitTypes,
    employee: {
      departmentId: employees.departmentId,
    },
    department: {
      id: departments.id,
      name: departments.name,
    },
  })
  .from(employeeBenefits)
  .innerJoin(benefitTypes, eq(employeeBenefits.benefitTypeId, benefitTypes.id))
  .innerJoin(employees, eq(employeeBenefits.employeeId, employees.id))
  .leftJoin(departments, eq(employees.departmentId, departments.id))
  .where(eq(employeeBenefits.status, "active"));
  
  // Group by department
  const byDepartment: Record<string, {
    departmentId: number | null;
    departmentName: string;
    totalCompanyValue: number;
    totalEmployeeDiscount: number;
    benefitCount: number;
    employeeCount: Set<number>;
  }> = {};
  
  for (const r of results) {
    const deptKey = r.department?.id?.toString() || 'sem_departamento';
    if (!byDepartment[deptKey]) {
      byDepartment[deptKey] = {
        departmentId: r.department?.id || null,
        departmentName: r.department?.name || 'Sem Departamento',
        totalCompanyValue: 0,
        totalEmployeeDiscount: 0,
        benefitCount: 0,
        employeeCount: new Set(),
      };
    }
    
    byDepartment[deptKey].totalCompanyValue += parseFloat(r.benefit.companyValue);
    byDepartment[deptKey].totalEmployeeDiscount += parseFloat(r.benefit.employeeDiscount || '0');
    byDepartment[deptKey].benefitCount++;
    byDepartment[deptKey].employeeCount.add(r.benefit.employeeId);
  }
  
  return Object.values(byDepartment).map(d => ({
    ...d,
    employeeCount: d.employeeCount.size,
    netCost: d.totalCompanyValue - d.totalEmployeeDiscount,
  }));
}

// Get benefit costs by type
export async function getBenefitCostsByType() {
  const results = await db.select({
    benefit: employeeBenefits,
    type: benefitTypes,
  })
  .from(employeeBenefits)
  .innerJoin(benefitTypes, eq(employeeBenefits.benefitTypeId, benefitTypes.id))
  .where(eq(employeeBenefits.status, "active"));
  
  // Group by type
  const byType: Record<number, {
    typeId: number;
    typeName: string;
    typeCode: string;
    category: string;
    totalCompanyValue: number;
    totalEmployeeDiscount: number;
    employeeCount: number;
  }> = {};
  
  for (const r of results) {
    if (!byType[r.type.id]) {
      byType[r.type.id] = {
        typeId: r.type.id,
        typeName: r.type.name,
        typeCode: r.type.code,
        category: r.type.category,
        totalCompanyValue: 0,
        totalEmployeeDiscount: 0,
        employeeCount: 0,
      };
    }
    
    byType[r.type.id].totalCompanyValue += parseFloat(r.benefit.companyValue);
    byType[r.type.id].totalEmployeeDiscount += parseFloat(r.benefit.employeeDiscount || '0');
    byType[r.type.id].employeeCount++;
  }
  
  return Object.values(byType).map(t => ({
    ...t,
    netCost: t.totalCompanyValue - t.totalEmployeeDiscount,
  }));
}

// Get benefit summary
export async function getBenefitSummary() {
  const allBenefits = await db.select()
    .from(employeeBenefits)
    .where(eq(employeeBenefits.status, "active"));
  
  const types = await getBenefitTypes();
  
  let totalCompanyValue = 0;
  let totalEmployeeDiscount = 0;
  const employeeIds = new Set<number>();
  
  for (const b of allBenefits) {
    totalCompanyValue += parseFloat(b.companyValue);
    totalEmployeeDiscount += parseFloat(b.employeeDiscount || '0');
    employeeIds.add(b.employeeId);
  }
  
  return {
    totalBenefits: allBenefits.length,
    totalEmployeesWithBenefits: employeeIds.size,
    totalBenefitTypes: types.length,
    totalCompanyValue,
    totalEmployeeDiscount,
    netCost: totalCompanyValue - totalEmployeeDiscount,
    monthlyEstimate: totalCompanyValue - totalEmployeeDiscount,
    yearlyEstimate: (totalCompanyValue - totalEmployeeDiscount) * 12,
  };
}


// ============ EXPORTED UTILITIES FOR TESTING ============

export function calculateBenefitCosts(benefits: Array<{ value: number; employeeContribution: number }>) {
  let totalValue = 0;
  let totalContribution = 0;
  
  for (const b of benefits) {
    totalValue += b.value;
    totalContribution += b.employeeContribution;
  }
  
  return {
    totalValue,
    totalContribution,
    companyCost: totalValue - totalContribution,
  };
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
