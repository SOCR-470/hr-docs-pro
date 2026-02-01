import * as db from "./db";
import { sendEmail, emailTemplates } from "./emailService";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export interface ReportConfig {
  type: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  includeDetails: boolean;
  departmentId?: number;
}

export interface ComplianceReportData {
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalEmployees: number;
    avgComplianceScore: number;
    openAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
  };
  departmentStats: Array<{
    id: number;
    name: string;
    employeeCount: number;
    avgScore: number;
    alertCount: number;
  }>;
  topAlerts: Array<{
    id: number;
    type: string;
    severity: string;
    title: string;
    employeeName: string;
    createdAt: Date;
  }>;
  employeesAtRisk: Array<{
    id: number;
    name: string;
    department: string;
    score: number;
    alertCount: number;
  }>;
}

// Generate compliance report data
export async function generateComplianceReport(config?: { departmentId?: number }): Promise<ComplianceReportData> {
  const stats = await db.getDashboardStats();
  const alerts = await db.getComplianceAlerts({ status: 'open', limit: 100 });
  const employees = await db.getEmployees(config?.departmentId ? { departmentId: config.departmentId } : undefined);
  
  // Calculate critical alerts
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
  
  // Get employees at risk (score < 70)
  const employeesAtRisk = employees
    ?.filter(e => (e.complianceScore || 100) < 70)
    .map(e => ({
      id: e.id,
      name: e.name,
      department: (e as any).department?.name || 'Sem departamento',
      score: e.complianceScore || 0,
      alertCount: alerts?.filter(a => a.employeeId === e.id).length || 0,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10) || [];

  // Map department stats
  const departmentStats = stats?.departmentStats?.map(d => ({
    id: d.departmentId || 0,
    name: d.departmentName || 'Sem nome',
    employeeCount: Number(d.employeeCount) || 0,
    avgScore: Math.round(Number(d.avgCompliance) || 0),
    alertCount: alerts?.filter(a => {
      const emp = employees?.find(e => e.id === a.employeeId);
      return emp?.departmentId === d.departmentId;
    }).length || 0,
  })) || [];

  // Top alerts
  const topAlerts = alerts?.slice(0, 10).map(a => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: a.title,
    employeeName: (a as any).employee?.name || 'Desconhecido',
    createdAt: a.createdAt,
  })) || [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    generatedAt: now,
    period: { start: startOfDay, end: now },
    summary: {
      totalEmployees: stats?.totalEmployees || 0,
      avgComplianceScore: stats?.avgComplianceScore || 0,
      openAlerts: stats?.openAlerts || 0,
      criticalAlerts,
      resolvedAlerts: 0, // Would need to query resolved alerts
    },
    departmentStats,
    topAlerts,
    employeesAtRisk,
  };
}

// Generate HTML report
export function generateReportHTML(data: ComplianceReportData): string {
  const severityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório de Compliance - ${data.generatedAt.toLocaleDateString('pt-BR')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { font-size: 18px; color: #334155; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
    .metric { background: white; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-value { font-size: 36px; font-weight: 700; color: #1e293b; }
    .metric-label { color: #64748b; font-size: 14px; margin-top: 8px; }
    .metric-good { border-top: 4px solid #10b981; }
    .metric-warning { border-top: 4px solid #f59e0b; }
    .metric-danger { border-top: 4px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .score-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .footer { text-align: center; padding: 30px; color: #64748b; font-size: 12px; }
    @media print {
      body { background: white; }
      .container { padding: 0; }
      .card { box-shadow: none; border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Compliance de RH</h1>
      <p>Gerado em ${data.generatedAt.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} às ${data.generatedAt.toLocaleTimeString('pt-BR')}</p>
    </div>

    <div class="metrics">
      <div class="metric metric-good">
        <div class="metric-value">${data.summary.totalEmployees}</div>
        <div class="metric-label">Total Funcionários</div>
      </div>
      <div class="metric ${data.summary.avgComplianceScore >= 80 ? 'metric-good' : data.summary.avgComplianceScore >= 60 ? 'metric-warning' : 'metric-danger'}">
        <div class="metric-value">${data.summary.avgComplianceScore}%</div>
        <div class="metric-label">Score Médio</div>
      </div>
      <div class="metric ${data.summary.openAlerts <= 5 ? 'metric-good' : data.summary.openAlerts <= 15 ? 'metric-warning' : 'metric-danger'}">
        <div class="metric-value">${data.summary.openAlerts}</div>
        <div class="metric-label">Alertas Abertos</div>
      </div>
      <div class="metric ${data.summary.criticalAlerts === 0 ? 'metric-good' : 'metric-danger'}">
        <div class="metric-value">${data.summary.criticalAlerts}</div>
        <div class="metric-label">Alertas Críticos</div>
      </div>
    </div>

    <div class="card">
      <h2>📈 Compliance por Departamento</h2>
      <table>
        <thead>
          <tr>
            <th>Departamento</th>
            <th>Funcionários</th>
            <th>Score Médio</th>
            <th>Alertas</th>
          </tr>
        </thead>
        <tbody>
          ${data.departmentStats.map(dept => `
            <tr>
              <td><strong>${dept.name}</strong></td>
              <td>${dept.employeeCount}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div class="score-bar" style="flex: 1; max-width: 150px;">
                    <div class="score-fill" style="width: ${dept.avgScore}%; background: ${dept.avgScore >= 80 ? '#10b981' : dept.avgScore >= 60 ? '#f59e0b' : '#ef4444'};"></div>
                  </div>
                  <span style="font-weight: 600; color: ${dept.avgScore >= 80 ? '#10b981' : dept.avgScore >= 60 ? '#f59e0b' : '#ef4444'};">${dept.avgScore}%</span>
                </div>
              </td>
              <td>${dept.alertCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${data.topAlerts.length > 0 ? `
    <div class="card">
      <h2>⚠️ Alertas Prioritários</h2>
      <table>
        <thead>
          <tr>
            <th>Severidade</th>
            <th>Alerta</th>
            <th>Funcionário</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${data.topAlerts.map(alert => `
            <tr>
              <td>
                <span class="badge" style="background: ${severityColors[alert.severity]}20; color: ${severityColors[alert.severity]};">
                  ${alert.severity.toUpperCase()}
                </span>
              </td>
              <td>${alert.title}</td>
              <td>${alert.employeeName}</td>
              <td>${new Date(alert.createdAt).toLocaleDateString('pt-BR')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${data.employeesAtRisk.length > 0 ? `
    <div class="card">
      <h2>🚨 Funcionários em Risco (Score &lt; 70%)</h2>
      <table>
        <thead>
          <tr>
            <th>Funcionário</th>
            <th>Departamento</th>
            <th>Score</th>
            <th>Alertas</th>
          </tr>
        </thead>
        <tbody>
          ${data.employeesAtRisk.map(emp => `
            <tr>
              <td><strong>${emp.name}</strong></td>
              <td>${emp.department}</td>
              <td>
                <span style="font-weight: 600; color: ${emp.score >= 60 ? '#f59e0b' : '#ef4444'};">${emp.score}%</span>
              </td>
              <td>${emp.alertCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p>HR Docs Pro - Sistema de Compliance de RH</p>
      <p>Relatório gerado automaticamente em ${data.generatedAt.toISOString()}</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Send compliance report by email
export async function sendComplianceReport(
  recipients: string[],
  recipientName: string = 'Equipe de RH'
): Promise<{ success: boolean; error?: string }> {
  try {
    const reportData = await generateComplianceReport();
    
    // Generate email content
    const emailContent = emailTemplates.complianceReport({
      recipientName,
      reportDate: reportData.generatedAt,
      totalEmployees: reportData.summary.totalEmployees,
      avgScore: reportData.summary.avgComplianceScore,
      openAlerts: reportData.summary.openAlerts,
      criticalAlerts: reportData.summary.criticalAlerts,
      departmentStats: reportData.departmentStats.map(d => ({
        name: d.name,
        score: d.avgScore,
        employees: d.employeeCount,
      })),
    });

    // Send to all recipients
    const results = await Promise.all(
      recipients.map(email => sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      }))
    );

    const allSuccess = results.every(r => r.success);
    return { success: allSuccess };
  } catch (error) {
    console.error('[Report] Failed to send:', error);
    return { success: false, error: String(error) };
  }
}

// Store report in S3
export async function saveReportToStorage(reportData: ComplianceReportData): Promise<{ url: string; key: string }> {
  const html = generateReportHTML(reportData);
  const buffer = Buffer.from(html, 'utf-8');
  const key = `reports/compliance-${reportData.generatedAt.toISOString().split('T')[0]}-${nanoid(8)}.html`;
  
  const { url } = await storagePut(key, buffer, 'text/html');
  return { url, key };
}

// Report schedule configurations
export interface ReportSchedule {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

// In-memory schedules (in production, store in database)
const reportSchedules: ReportSchedule[] = [];

export function getReportSchedules(): ReportSchedule[] {
  return reportSchedules;
}

export function createReportSchedule(schedule: Omit<ReportSchedule, 'id'>): ReportSchedule {
  const newSchedule: ReportSchedule = {
    ...schedule,
    id: nanoid(),
  };
  reportSchedules.push(newSchedule);
  return newSchedule;
}

export function updateReportSchedule(id: string, updates: Partial<ReportSchedule>): ReportSchedule | null {
  const index = reportSchedules.findIndex(s => s.id === id);
  if (index === -1) return null;
  reportSchedules[index] = { ...reportSchedules[index], ...updates };
  return reportSchedules[index];
}

export function deleteReportSchedule(id: string): boolean {
  const index = reportSchedules.findIndex(s => s.id === id);
  if (index === -1) return false;
  reportSchedules.splice(index, 1);
  return true;
}
