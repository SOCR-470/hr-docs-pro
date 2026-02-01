import { ENV } from "./_core/env";

// Email service using Manus notification API
// This provides a reliable way to send emails without external dependencies

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed';
  sentAt: Date;
  error?: string;
}

// In-memory log for demo purposes (in production, store in database)
const emailLogs: EmailLog[] = [];

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Use Manus built-in notification API for email
    const response = await fetch(`${ENV.forgeApiUrl}/notification/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Failed to send:', error);
      
      // Log failed attempt
      emailLogs.push({
        id: `email-${Date.now()}`,
        to: options.to,
        subject: options.subject,
        status: 'failed',
        sentAt: new Date(),
        error,
      });
      
      return { success: false, error };
    }

    const result = await response.json();
    
    // Log successful send
    emailLogs.push({
      id: result.messageId || `email-${Date.now()}`,
      to: options.to,
      subject: options.subject,
      status: 'sent',
      sentAt: new Date(),
    });

    console.log('[Email] Sent successfully to:', options.to);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] Error:', error);
    
    emailLogs.push({
      id: `email-${Date.now()}`,
      to: options.to,
      subject: options.subject,
      status: 'failed',
      sentAt: new Date(),
      error: String(error),
    });
    
    return { success: false, error: String(error) };
  }
}

export function getEmailLogs(limit = 50): EmailLog[] {
  return emailLogs.slice(-limit).reverse();
}

// Email Templates
export const emailTemplates = {
  externalRequest: (params: {
    recipientName: string;
    employeeName: string;
    documentType?: string;
    message?: string;
    uploadUrl: string;
    expiresAt: Date;
  }) => ({
    subject: `[HR Docs Pro] Solicitação de Documento - ${params.employeeName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #2563eb; }
    .info-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📁 HR Docs Pro</h1>
      <p style="margin: 10px 0 0;">Sistema de Compliance de RH</p>
    </div>
    <div class="content">
      <p>Olá <strong>${params.recipientName}</strong>,</p>
      
      <p>Você recebeu uma solicitação de envio de documento referente ao funcionário:</p>
      
      <div class="info-box">
        <p><strong>Funcionário:</strong> ${params.employeeName}</p>
        ${params.documentType ? `<p><strong>Tipo de Documento:</strong> ${params.documentType}</p>` : ''}
        ${params.message ? `<p><strong>Mensagem:</strong> ${params.message}</p>` : ''}
      </div>
      
      <p style="text-align: center;">
        <a href="${params.uploadUrl}" class="button">📤 Enviar Documento</a>
      </p>
      
      <div class="warning">
        <strong>⚠️ Atenção:</strong> Este link expira em <strong>${params.expiresAt.toLocaleDateString('pt-BR')}</strong> às ${params.expiresAt.toLocaleTimeString('pt-BR')}.
      </div>
      
      <p>Se você não reconhece esta solicitação, por favor ignore este email.</p>
    </div>
    <div class="footer">
      <p>Este é um email automático do sistema HR Docs Pro.</p>
      <p>© ${new Date().getFullYear()} HR Docs Pro - Sistema de Compliance de RH</p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  complianceReport: (params: {
    recipientName: string;
    reportDate: Date;
    totalEmployees: number;
    avgScore: number;
    openAlerts: number;
    criticalAlerts: number;
    departmentStats: Array<{ name: string; score: number; employees: number }>;
    reportUrl?: string;
  }) => ({
    subject: `[HR Docs Pro] Relatório de Compliance - ${params.reportDate.toLocaleDateString('pt-BR')}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-value { font-size: 32px; font-weight: bold; color: #1e293b; }
    .metric-label { color: #64748b; font-size: 14px; }
    .metric-good { border-top: 4px solid #10b981; }
    .metric-warning { border-top: 4px solid #f59e0b; }
    .metric-danger { border-top: 4px solid #ef4444; }
    .dept-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .dept-table th, .dept-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .dept-table th { background: #f1f5f9; font-weight: 600; }
    .score-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📊 Relatório de Compliance</h1>
      <p style="margin: 10px 0 0;">${params.reportDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div class="content">
      <p>Olá <strong>${params.recipientName}</strong>,</p>
      <p>Segue o relatório de compliance de RH:</p>
      
      <div class="metric-grid">
        <div class="metric metric-good">
          <div class="metric-value">${params.totalEmployees}</div>
          <div class="metric-label">Total Funcionários</div>
        </div>
        <div class="metric ${params.avgScore >= 80 ? 'metric-good' : params.avgScore >= 60 ? 'metric-warning' : 'metric-danger'}">
          <div class="metric-value">${params.avgScore}%</div>
          <div class="metric-label">Score Médio</div>
        </div>
        <div class="metric ${params.openAlerts <= 5 ? 'metric-good' : params.openAlerts <= 15 ? 'metric-warning' : 'metric-danger'}">
          <div class="metric-value">${params.openAlerts}</div>
          <div class="metric-label">Alertas Abertos</div>
        </div>
        <div class="metric ${params.criticalAlerts === 0 ? 'metric-good' : 'metric-danger'}">
          <div class="metric-value">${params.criticalAlerts}</div>
          <div class="metric-label">Alertas Críticos</div>
        </div>
      </div>
      
      <h3>Compliance por Departamento</h3>
      <table class="dept-table">
        <thead>
          <tr>
            <th>Departamento</th>
            <th>Funcionários</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${params.departmentStats.map(dept => `
            <tr>
              <td>${dept.name}</td>
              <td>${dept.employees}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="score-bar" style="flex: 1;">
                    <div class="score-fill" style="width: ${dept.score}%; background: ${dept.score >= 80 ? '#10b981' : dept.score >= 60 ? '#f59e0b' : '#ef4444'};"></div>
                  </div>
                  <span style="font-weight: 600; color: ${dept.score >= 80 ? '#10b981' : dept.score >= 60 ? '#f59e0b' : '#ef4444'};">${dept.score}%</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${params.reportUrl ? `<p style="text-align: center;"><a href="${params.reportUrl}" style="color: #3b82f6;">Ver relatório completo →</a></p>` : ''}
    </div>
    <div class="footer">
      <p>Este é um relatório automático do sistema HR Docs Pro.</p>
      <p>© ${new Date().getFullYear()} HR Docs Pro - Sistema de Compliance de RH</p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  uploadConfirmation: (params: {
    recipientName: string;
    employeeName: string;
    documentType: string;
    uploadedAt: Date;
  }) => ({
    subject: `[HR Docs Pro] Documento Recebido - ${params.employeeName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
    .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
    .info-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Documento Recebido</h1>
    </div>
    <div class="content">
      <div class="success-icon">📄✓</div>
      
      <p>Olá <strong>${params.recipientName}</strong>,</p>
      
      <p>Confirmamos o recebimento do documento:</p>
      
      <div class="info-box">
        <p><strong>Funcionário:</strong> ${params.employeeName}</p>
        <p><strong>Tipo:</strong> ${params.documentType}</p>
        <p><strong>Recebido em:</strong> ${params.uploadedAt.toLocaleDateString('pt-BR')} às ${params.uploadedAt.toLocaleTimeString('pt-BR')}</p>
      </div>
      
      <p>O documento será analisado pela equipe de RH.</p>
      
      <p>Obrigado!</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HR Docs Pro - Sistema de Compliance de RH</p>
    </div>
  </div>
</body>
</html>
    `,
  }),
};
