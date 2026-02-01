import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { getDb } from "./db";
import { 
  employees, 
  documents, 
  complianceHistory,
  complianceAlerts,
  predictiveAnalysis,
  departments,
  recurringDocuments
} from "../drizzle/schema";

// ============ PREDICTIVE ANALYSIS SERVICE ============

interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

interface PredictiveResult {
  employeeId: number;
  employeeName: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
  recommendations: string[];
  predictedIssues: string[];
}

// Calcular score de risco de compliance
export async function calculateComplianceRisk(employeeId: number): Promise<PredictiveResult | null> {
  const db = await getDb();
  if (!db) return null;
  
  const employee = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee[0]) return null;
  
  const factors: RiskFactor[] = [];
  let totalScore = 0;
  const recommendations: string[] = [];
  const predictedIssues: string[] = [];
  
  // Fator 1: Documentos faltantes
  const docs = await db.select().from(documents).where(eq(documents.employeeId, employeeId));
  const totalExpectedDocs = 15; // Média esperada
  const missingDocs = Math.max(0, totalExpectedDocs - docs.length);
  
  if (missingDocs > 0) {
    const weight = Math.min(missingDocs * 5, 30);
    factors.push({
      factor: "Documentos faltantes",
      weight,
      description: `${missingDocs} documentos pendentes de upload`
    });
    totalScore += weight;
    recommendations.push(`Solicitar upload de ${missingDocs} documentos faltantes`);
  }
  
  // Fator 2: Documentos próximos do vencimento
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringDocs = docs.filter(d => {
    if (!d.expiresAt) return false;
    return d.expiresAt > now && d.expiresAt <= thirtyDaysFromNow;
  });
  
  if (expiringDocs.length > 0) {
    const weight = expiringDocs.length * 10;
    factors.push({
      factor: "Documentos próximos do vencimento",
      weight,
      description: `${expiringDocs.length} documentos vencem nos próximos 30 dias`
    });
    totalScore += weight;
    predictedIssues.push(`${expiringDocs.length} documentos vencerão em breve`);
    recommendations.push("Agendar renovação de documentos com vencimento próximo");
  }
  
  // Fator 3: Documentos vencidos
  const expiredDocs = docs.filter(d => d.expiresAt && d.expiresAt < now);
  
  if (expiredDocs.length > 0) {
    const weight = expiredDocs.length * 20;
    factors.push({
      factor: "Documentos vencidos",
      weight,
      description: `${expiredDocs.length} documentos com validade expirada`
    });
    totalScore += weight;
    predictedIssues.push(`${expiredDocs.length} documentos já estão vencidos`);
    recommendations.push("URGENTE: Renovar documentos vencidos imediatamente");
  }
  
  // Fator 4: Alertas pendentes (usando status "open")
  const pendingAlerts = await db
    .select()
    .from(complianceAlerts)
    .where(and(
      eq(complianceAlerts.employeeId, employeeId),
      eq(complianceAlerts.status, "open")
    ));
  
  if (pendingAlerts.length > 0) {
    const weight = pendingAlerts.length * 8;
    factors.push({
      factor: "Alertas não resolvidos",
      weight,
      description: `${pendingAlerts.length} alertas de compliance pendentes`
    });
    totalScore += weight;
    recommendations.push("Resolver alertas de compliance pendentes");
  }
  
  // Fator 5: Tempo sem atualização
  const lastDocUpdate = docs.reduce((latest, doc) => {
    return doc.createdAt > latest ? doc.createdAt : latest;
  }, new Date(0));
  
  const daysSinceUpdate = Math.floor((now.getTime() - lastDocUpdate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceUpdate > 180) {
    const weight = Math.min(Math.floor(daysSinceUpdate / 30) * 3, 20);
    factors.push({
      factor: "Documentação desatualizada",
      weight,
      description: `${daysSinceUpdate} dias sem atualização de documentos`
    });
    totalScore += weight;
    recommendations.push("Realizar revisão geral da documentação do funcionário");
  }
  
  // Fator 6: Inconsistências em holerites (se houver)
  const payslips = await db
    .select()
    .from(recurringDocuments)
    .where(and(
      eq(recurringDocuments.employeeId, employeeId),
      eq(recurringDocuments.type, "payslip")
    ))
    .orderBy(desc(recurringDocuments.referenceDate))
    .limit(6);
  
  if (payslips.length >= 2) {
    const salaries = payslips
      .filter(p => p.extractedData && (p.extractedData as Record<string, unknown>).salarioBruto)
      .map(p => Number((p.extractedData as Record<string, unknown>).salarioBruto));
    
    if (salaries.length >= 2) {
      const avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      const variance = salaries.reduce((sum, s) => sum + Math.pow(s - avgSalary, 2), 0) / salaries.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgSalary) * 100;
      
      if (coefficientOfVariation > 20) {
        factors.push({
          factor: "Variação salarial significativa",
          weight: 15,
          description: `Variação de ${coefficientOfVariation.toFixed(1)}% nos últimos holerites`
        });
        totalScore += 15;
        predictedIssues.push("Variação salarial pode indicar inconsistências");
        recommendations.push("Verificar consistência dos dados de folha de pagamento");
      }
    }
  }
  
  // Normalizar score (0-100)
  const normalizedScore = Math.min(totalScore, 100);
  
  // Determinar nível de risco
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (normalizedScore < 25) riskLevel = "low";
  else if (normalizedScore < 50) riskLevel = "medium";
  else if (normalizedScore < 75) riskLevel = "high";
  else riskLevel = "critical";
  
  // Salvar análise
  await db.insert(predictiveAnalysis).values({
    employeeId,
    riskScore: normalizedScore,
    riskLevel,
    factors: factors,
    recommendations,
    predictedIssues
  });
  
  return {
    employeeId,
    employeeName: employee[0].name,
    riskScore: normalizedScore,
    riskLevel,
    factors,
    recommendations,
    predictedIssues
  };
}

// Análise preditiva em lote (todos os funcionários)
export async function runBatchPredictiveAnalysis(): Promise<PredictiveResult[]> {
  const db = await getDb();
  if (!db) return [];
  
  const allEmployees = await db.select().from(employees).where(eq(employees.status, "active"));
  const results: PredictiveResult[] = [];
  
  for (const emp of allEmployees) {
    const result = await calculateComplianceRisk(emp.id);
    if (result) results.push(result);
  }
  
  return results.sort((a, b) => b.riskScore - a.riskScore);
}

// ============ COMPARATIVE ANALYSIS SERVICE ============

interface EmployeeEvolution {
  employeeId: number;
  employeeName: string;
  periods: Array<{
    period: string;
    complianceScore: number;
    documentsCount: number;
    alertsCount: number;
    salaryData?: number;
  }>;
  trend: "improving" | "stable" | "declining";
  trendPercentage: number;
}

interface DepartmentBenchmark {
  departmentId: number;
  departmentName: string;
  employeeCount: number;
  avgComplianceScore: number;
  avgDocumentsPerEmployee: number;
  avgAlertsPerEmployee: number;
  topPerformers: Array<{ id: number; name: string; score: number }>;
  needsAttention: Array<{ id: number; name: string; score: number }>;
}

// Análise de evolução do funcionário
export async function getEmployeeEvolution(
  employeeId: number, 
  months: number = 6
): Promise<EmployeeEvolution | null> {
  const db = await getDb();
  if (!db) return null;
  
  const employee = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee[0]) return null;
  
  const periods: EmployeeEvolution["periods"] = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const periodLabel = periodStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    // Documentos no período
    const docsInPeriod = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.employeeId, employeeId),
        gte(documents.createdAt, periodStart),
        lte(documents.createdAt, periodEnd)
      ));
    
    // Alertas no período
    const alertsInPeriod = await db
      .select()
      .from(complianceAlerts)
      .where(and(
        eq(complianceAlerts.employeeId, employeeId),
        gte(complianceAlerts.createdAt, periodStart),
        lte(complianceAlerts.createdAt, periodEnd)
      ));
    
    // Holerite do período
    const payslip = await db
      .select()
      .from(recurringDocuments)
      .where(and(
        eq(recurringDocuments.employeeId, employeeId),
        eq(recurringDocuments.type, "payslip"),
        gte(recurringDocuments.referenceDate, periodStart),
        lte(recurringDocuments.referenceDate, periodEnd)
      ))
      .limit(1);
    
    // Calcular score de compliance do período
    const baseScore = 100;
    const docPenalty = Math.max(0, 10 - docsInPeriod.length) * 2;
    const alertPenalty = alertsInPeriod.length * 5;
    const complianceScore = Math.max(0, baseScore - docPenalty - alertPenalty);
    
    const salaryData = payslip[0]?.extractedData 
      ? Number((payslip[0].extractedData as Record<string, unknown>).salarioBruto) || undefined
      : undefined;
    
    periods.push({
      period: periodLabel,
      complianceScore,
      documentsCount: docsInPeriod.length,
      alertsCount: alertsInPeriod.length,
      salaryData
    });
  }
  
  // Calcular tendência
  const firstScore = periods[0]?.complianceScore || 0;
  const lastScore = periods[periods.length - 1]?.complianceScore || 0;
  const trendPercentage = firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;
  
  let trend: "improving" | "stable" | "declining";
  if (trendPercentage > 5) trend = "improving";
  else if (trendPercentage < -5) trend = "declining";
  else trend = "stable";
  
  // Salvar no histórico
  const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  await db.insert(complianceHistory).values({
    employeeId,
    referenceMonth,
    complianceScore: lastScore,
    totalAlerts: periods.reduce((sum, p) => sum + p.alertsCount, 0),
    documentsComplete: periods.reduce((sum, p) => sum + p.documentsCount, 0),
  });
  
  return {
    employeeId,
    employeeName: employee[0].name,
    periods,
    trend,
    trendPercentage
  };
}

// Benchmark por departamento
export async function getDepartmentBenchmark(departmentId?: number): Promise<DepartmentBenchmark[]> {
  const db = await getDb();
  if (!db) return [];
  
  const deptFilter = departmentId ? eq(departments.id, departmentId) : undefined;
  const depts = await db.select().from(departments).where(deptFilter);
  
  const results: DepartmentBenchmark[] = [];
  
  for (const dept of depts) {
    const deptEmployees = await db
      .select()
      .from(employees)
      .where(and(
        eq(employees.departmentId, dept.id),
        eq(employees.status, "active")
      ));
    
    if (deptEmployees.length === 0) continue;
    
    const employeeScores: Array<{ id: number; name: string; score: number }> = [];
    let totalDocs = 0;
    let totalAlerts = 0;
    
    for (const emp of deptEmployees) {
      const docs = await db.select().from(documents).where(eq(documents.employeeId, emp.id));
      const alerts = await db
        .select()
        .from(complianceAlerts)
        .where(and(
          eq(complianceAlerts.employeeId, emp.id),
          eq(complianceAlerts.status, "open")
        ));
      
      totalDocs += docs.length;
      totalAlerts += alerts.length;
      
      // Score simplificado
      const score = Math.max(0, 100 - (alerts.length * 10) - Math.max(0, 10 - docs.length) * 3);
      employeeScores.push({ id: emp.id, name: emp.name, score });
    }
    
    employeeScores.sort((a, b) => b.score - a.score);
    
    results.push({
      departmentId: dept.id,
      departmentName: dept.name,
      employeeCount: deptEmployees.length,
      avgComplianceScore: employeeScores.reduce((sum, e) => sum + e.score, 0) / employeeScores.length,
      avgDocumentsPerEmployee: totalDocs / deptEmployees.length,
      avgAlertsPerEmployee: totalAlerts / deptEmployees.length,
      topPerformers: employeeScores.slice(0, 3),
      needsAttention: employeeScores.filter(e => e.score < 70).slice(0, 3)
    });
  }
  
  return results.sort((a, b) => b.avgComplianceScore - a.avgComplianceScore);
}

// Comparação holerite vs contrato
export async function comparePayslipVsContract(employeeId: number): Promise<{
  employee: typeof employees.$inferSelect;
  contractSalary: number | null;
  latestPayslipSalary: number | null;
  difference: number | null;
  differencePercentage: number | null;
  status: "match" | "mismatch" | "no_data";
  details: string;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const employee = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee[0]) return null;
  
  const contractSalary = employee[0].salary ? Number(employee[0].salary) : null;
  
  // Buscar último holerite
  const latestPayslip = await db
    .select()
    .from(recurringDocuments)
    .where(and(
      eq(recurringDocuments.employeeId, employeeId),
      eq(recurringDocuments.type, "payslip")
    ))
    .orderBy(desc(recurringDocuments.referenceDate))
    .limit(1);
  
  const payslipSalary = latestPayslip[0]?.extractedData 
    ? Number((latestPayslip[0].extractedData as Record<string, unknown>).salarioBruto) || null
    : null;
  
  if (!contractSalary || !payslipSalary) {
    return {
      employee: employee[0],
      contractSalary,
      latestPayslipSalary: payslipSalary,
      difference: null,
      differencePercentage: null,
      status: "no_data",
      details: "Dados insuficientes para comparação"
    };
  }
  
  const difference = payslipSalary - contractSalary;
  const differencePercentage = (difference / contractSalary) * 100;
  
  // Tolerância de 5%
  const status = Math.abs(differencePercentage) <= 5 ? "match" : "mismatch";
  
  let details: string;
  if (status === "match") {
    details = "Salário do holerite está dentro da margem esperada do contrato";
  } else if (difference > 0) {
    details = `Holerite apresenta valor ${differencePercentage.toFixed(1)}% maior que o contrato`;
  } else {
    details = `Holerite apresenta valor ${Math.abs(differencePercentage).toFixed(1)}% menor que o contrato`;
  }
  
  return {
    employee: employee[0],
    contractSalary,
    latestPayslipSalary: payslipSalary,
    difference,
    differencePercentage,
    status,
    details
  };
}

// Obter histórico de análises preditivas
export async function getPredictiveHistory(
  employeeId?: number
): Promise<Array<typeof predictiveAnalysis.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  if (employeeId) {
    return db
      .select()
      .from(predictiveAnalysis)
      .where(eq(predictiveAnalysis.employeeId, employeeId))
      .orderBy(desc(predictiveAnalysis.createdAt));
  }
  
  return db.select().from(predictiveAnalysis).orderBy(desc(predictiveAnalysis.createdAt)).limit(100);
}
