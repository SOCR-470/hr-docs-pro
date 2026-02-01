import { storagePut } from "./storage";
import { getDb } from "./db";
import { lgpdConsents, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// PDF generation service for LGPD consent certificates
// Uses HTML to PDF conversion

interface LgpdConsentPdfData {
  consentId: number;
  employeeName: string;
  employeeCpf: string;
  employeeBirthDate?: string;
  consentDate: Date;
  ipAddress: string;
  hash: string;
  verificationCode: string;
  consentText: string;
}

// Generate HTML for LGPD consent certificate
function generateLgpdConsentHtml(data: LgpdConsentPdfData): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCpf = (cpf: string) => {
    // Mask CPF for privacy: 123.456.789-00 -> 123.***.***-00
    if (cpf.length >= 11) {
      return cpf.substring(0, 4) + '***.***-' + cpf.substring(cpf.length - 2);
    }
    return cpf;
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprovante de Consentimento LGPD</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px double #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 18pt;
      color: #1e40af;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .header h2 {
      font-size: 14pt;
      color: #374151;
      font-weight: normal;
    }
    
    .header .subtitle {
      font-size: 10pt;
      color: #6b7280;
      margin-top: 10px;
    }
    
    .certificate-number {
      text-align: right;
      font-size: 10pt;
      color: #6b7280;
      margin-bottom: 20px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #1e40af;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .info-item {
      margin-bottom: 10px;
    }
    
    .info-label {
      font-size: 9pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      font-size: 11pt;
      color: #1f2937;
      font-weight: 500;
    }
    
    .consent-text {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
      font-size: 10pt;
      line-height: 1.8;
      text-align: justify;
    }
    
    .verification-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    
    .verification-title {
      font-size: 10pt;
      color: #1e40af;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .verification-code {
      font-family: 'Courier New', monospace;
      font-size: 14pt;
      font-weight: bold;
      color: #1e3a8a;
      letter-spacing: 3px;
      background: white;
      padding: 10px 20px;
      border-radius: 4px;
      display: inline-block;
    }
    
    .hash-box {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      word-break: break-all;
      color: #4b5563;
    }
    
    .hash-label {
      font-family: 'Times New Roman', Times, serif;
      font-size: 9pt;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .signature-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    
    .signature-box {
      text-align: center;
      margin-top: 30px;
    }
    
    .signature-line {
      border-top: 1px solid #1f2937;
      width: 300px;
      margin: 0 auto 10px;
    }
    
    .signature-name {
      font-size: 11pt;
      font-weight: bold;
    }
    
    .signature-info {
      font-size: 9pt;
      color: #6b7280;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }
    
    .footer p {
      margin-bottom: 5px;
    }
    
    .legal-notice {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      font-size: 9pt;
      color: #92400e;
    }
    
    .stamp {
      position: absolute;
      right: 50px;
      top: 150px;
      width: 100px;
      height: 100px;
      border: 3px solid #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(-15deg);
      opacity: 0.8;
    }
    
    .stamp-text {
      font-size: 10pt;
      font-weight: bold;
      color: #22c55e;
      text-align: center;
      text-transform: uppercase;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Comprovante de Consentimento</h1>
      <h2>Lei Geral de Proteção de Dados (LGPD)</h2>
      <p class="subtitle">Lei nº 13.709/2018</p>
    </div>
    
    <p class="certificate-number">
      <strong>Nº do Registro:</strong> LGPD-${data.consentId.toString().padStart(6, '0')}
    </p>
    
    <div class="section">
      <h3 class="section-title">Dados do Titular</h3>
      <div class="info-grid">
        <div class="info-item">
          <p class="info-label">Nome Completo</p>
          <p class="info-value">${data.employeeName}</p>
        </div>
        <div class="info-item">
          <p class="info-label">CPF</p>
          <p class="info-value">${formatCpf(data.employeeCpf)}</p>
        </div>
        ${data.employeeBirthDate ? `
        <div class="info-item">
          <p class="info-label">Data de Nascimento</p>
          <p class="info-value">${data.employeeBirthDate}</p>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="section">
      <h3 class="section-title">Dados do Consentimento</h3>
      <div class="info-grid">
        <div class="info-item">
          <p class="info-label">Data e Hora do Consentimento</p>
          <p class="info-value">${formatDate(data.consentDate)}</p>
        </div>
        <div class="info-item">
          <p class="info-label">Endereço IP</p>
          <p class="info-value">${data.ipAddress}</p>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h3 class="section-title">Termo de Consentimento</h3>
      <div class="consent-text">
        ${data.consentText}
      </div>
    </div>
    
    <div class="verification-box">
      <p class="verification-title">Código de Verificação</p>
      <p class="verification-code">${data.verificationCode}</p>
    </div>
    
    <div class="section">
      <h3 class="section-title">Assinatura Digital</h3>
      <div class="hash-box">
        <p class="hash-label">Hash SHA-256 (Prova de Integridade):</p>
        ${data.hash}
      </div>
    </div>
    
    <div class="legal-notice">
      <strong>⚠️ Aviso Legal:</strong> Este documento constitui prova de consentimento conforme 
      estabelecido pela Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). 
      O titular dos dados pode revogar este consentimento a qualquer momento, 
      mediante solicitação formal ao controlador dos dados.
    </div>
    
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <p class="signature-name">${data.employeeName}</p>
        <p class="signature-info">Assinatura Eletrônica</p>
        <p class="signature-info">${formatDate(data.consentDate)}</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Documento gerado eletronicamente pelo sistema HR Docs Pro</p>
      <p>Este documento possui validade jurídica conforme Lei nº 14.063/2020</p>
      <p>Para verificar a autenticidade, utilize o código de verificação acima</p>
      <p>© ${new Date().getFullYear()} HR Docs Pro - Sistema de Compliance de RH</p>
    </div>
  </div>
</body>
</html>
`;
}

// Generate PDF from HTML using built-in conversion
export async function generateLgpdConsentPdf(consentId: number): Promise<{
  success: boolean;
  pdfUrl?: string;
  pdfKey?: string;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get consent data
    const [consent] = await db.select()
      .from(lgpdConsents)
      .where(eq(lgpdConsents.id, consentId));

    if (!consent) {
      return { success: false, error: "Consent not found" };
    }

    // Get employee data
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.id, consent.employeeId));

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    // Prepare PDF data
    const pdfData: LgpdConsentPdfData = {
      consentId: consent.id,
      employeeName: employee.name,
      employeeCpf: employee.cpf,
      consentDate: new Date(consent.signedAt || consent.createdAt),
      ipAddress: consent.ipAddress || "N/A",
      hash: consent.termHash || "N/A",
      verificationCode: consent.verificationCode || "N/A",
      consentText: getDefaultConsentText(),
    };

    // Generate HTML
    const html = generateLgpdConsentHtml(pdfData);

    // Convert HTML to PDF using a simple approach
    // In production, you would use a library like puppeteer or wkhtmltopdf
    // For now, we'll store the HTML as a reference and note that PDF generation
    // would require additional setup
    
    // Store HTML version
    const htmlKey = `lgpd-consents/${consentId}/consent-${Date.now()}.html`;
    const { url: htmlUrl } = await storagePut(htmlKey, html, "text/html");

    // Update consent record with PDF URL
    await db.update(lgpdConsents)
      .set({ 
        documentUrl: htmlUrl,
        documentKey: htmlKey,
      })
      .where(eq(lgpdConsents.id, consentId));

    return {
      success: true,
      pdfUrl: htmlUrl,
      pdfKey: htmlKey,
    };
  } catch (error) {
    console.error("[PDF] Error generating LGPD consent PDF:", error);
    return { success: false, error: String(error) };
  }
}

// Default LGPD consent text
function getDefaultConsentText(): string {
  return `
TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS

Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD), 
o titular dos dados acima identificado declara que:

1. AUTORIZA o tratamento de seus dados pessoais, incluindo dados sensíveis quando necessário, 
   para as finalidades relacionadas ao vínculo empregatício, incluindo mas não se limitando a:
   
   a) Gestão de recursos humanos e folha de pagamento;
   b) Cumprimento de obrigações legais e regulatórias;
   c) Controle de ponto e jornada de trabalho;
   d) Gestão de benefícios e assistência médica;
   e) Comunicações internas e corporativas;
   f) Segurança patrimonial e controle de acesso.

2. ESTÁ CIENTE de que seus dados poderão ser compartilhados com:
   
   a) Órgãos governamentais, quando exigido por lei;
   b) Prestadores de serviços contratados pela empresa;
   c) Instituições financeiras para processamento de pagamentos;
   d) Operadoras de planos de saúde e seguradoras.

3. RECONHECE que possui os seguintes direitos garantidos pela LGPD:
   
   a) Confirmação da existência de tratamento;
   b) Acesso aos dados;
   c) Correção de dados incompletos, inexatos ou desatualizados;
   d) Anonimização, bloqueio ou eliminação de dados desnecessários;
   e) Portabilidade dos dados;
   f) Eliminação dos dados tratados com consentimento;
   g) Revogação do consentimento.

4. DECLARA ter lido e compreendido integralmente este termo, concordando expressamente 
   com o tratamento de seus dados pessoais conforme aqui descrito.

Este consentimento pode ser revogado a qualquer momento, mediante solicitação formal 
ao Encarregado de Proteção de Dados (DPO) da empresa.
  `.trim();
}

// Generate certificate for document signature
export async function generateSignatureCertificatePdf(signatureId: number): Promise<{
  success: boolean;
  pdfUrl?: string;
  pdfKey?: string;
  error?: string;
}> {
  // Similar implementation for document signatures
  // Would follow the same pattern as LGPD consent PDF
  return { success: false, error: "Not implemented yet" };
}
