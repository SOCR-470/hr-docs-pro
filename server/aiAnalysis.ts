import { invokeLLM } from "./_core/llm";

// ============ OCR + DOCUMENT ANALYSIS ============

interface TimesheetAnalysis {
  employeeName?: string;
  referenceDate?: string;
  workDays: Array<{
    date: string;
    entryTime?: string;
    lunchOut?: string;
    lunchIn?: string;
    exitTime?: string;
    totalHours?: number;
    issues: string[];
  }>;
  summary: {
    totalDaysWorked: number;
    totalHours: number;
    lateArrivals: number;
    earlyDepartures: number;
    unauthorizedOvertime: number;
    missingPunches: number;
    absencesWithoutJustification: number;
  };
  alerts: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    date?: string;
  }>;
  complianceScore: number;
  rawText?: string;
}

interface PayslipAnalysis {
  employeeName?: string;
  referenceMonth?: string;
  baseSalary?: number;
  grossSalary?: number;
  netSalary?: number;
  earnings: Array<{
    description: string;
    value: number;
  }>;
  deductions: Array<{
    description: string;
    value: number;
    isRegular: boolean;
  }>;
  alerts: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;
  calculationCheck: {
    isCorrect: boolean;
    expectedNet?: number;
    actualNet?: number;
    difference?: number;
  };
  complianceScore: number;
  rawText?: string;
}

export async function analyzeTimesheetWithVision(
  imageUrl: string,
  employeeContext?: { name: string; workHours: string; salary?: number }
): Promise<TimesheetAnalysis> {
  const systemPrompt = `Você é um especialista em análise de folhas de ponto e compliance trabalhista brasileiro.
Analise a imagem da folha de ponto e extraia todas as informações relevantes.

Regras de compliance a verificar:
- Horário padrão de trabalho: ${employeeContext?.workHours || "08:00-17:00"} com 1h de almoço
- Atrasos: entrada após o horário definido
- Saída antecipada: saída antes do horário definido
- Horas extras não autorizadas: mais de 2h extras por dia ou trabalho em fins de semana
- Batidas faltantes: entrada sem saída ou vice-versa
- Faltas sem justificativa: dias úteis sem registro

Retorne um JSON estruturado com a análise completa.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analise esta folha de ponto${employeeContext?.name ? ` do funcionário ${employeeContext.name}` : ""} e retorne a análise em JSON.`
          },
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" }
          }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "timesheet_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            employeeName: { type: "string", description: "Nome do funcionário" },
            referenceDate: { type: "string", description: "Período de referência" },
            workDays: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  entryTime: { type: "string" },
                  lunchOut: { type: "string" },
                  lunchIn: { type: "string" },
                  exitTime: { type: "string" },
                  totalHours: { type: "number" },
                  issues: { type: "array", items: { type: "string" } }
                },
                required: ["date", "issues"],
                additionalProperties: false
              }
            },
            summary: {
              type: "object",
              properties: {
                totalDaysWorked: { type: "integer" },
                totalHours: { type: "number" },
                lateArrivals: { type: "integer" },
                earlyDepartures: { type: "integer" },
                unauthorizedOvertime: { type: "integer" },
                missingPunches: { type: "integer" },
                absencesWithoutJustification: { type: "integer" }
              },
              required: ["totalDaysWorked", "totalHours", "lateArrivals", "earlyDepartures", "unauthorizedOvertime", "missingPunches", "absencesWithoutJustification"],
              additionalProperties: false
            },
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  description: { type: "string" },
                  date: { type: "string" }
                },
                required: ["type", "severity", "description"],
                additionalProperties: false
              }
            },
            complianceScore: { type: "integer", description: "Score de 0 a 100" },
            rawText: { type: "string", description: "Texto extraído da imagem" }
          },
          required: ["workDays", "summary", "alerts", "complianceScore"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");
  const textContent = typeof content === 'string' ? content : (content[0] as any)?.text || '';
  return JSON.parse(textContent) as TimesheetAnalysis;
}

export async function analyzePayslipWithVision(
  imageUrl: string,
  employeeContext?: { name: string; expectedSalary?: number }
): Promise<PayslipAnalysis> {
  const systemPrompt = `Você é um especialista em análise de holerites e compliance trabalhista brasileiro.
Analise a imagem do holerite e extraia todas as informações relevantes.

Regras de compliance a verificar:
- Salário base deve corresponder ao contrato${employeeContext?.expectedSalary ? ` (esperado: R$ ${employeeContext.expectedSalary})` : ""}
- INSS: verificar se o desconto está correto conforme tabela vigente
- IRRF: verificar se o desconto está correto conforme tabela vigente
- FGTS: deve ser 8% do salário bruto
- Descontos irregulares: qualquer desconto não previsto em lei ou contrato
- Cálculos: verificar se salário líquido = bruto - descontos

Retorne um JSON estruturado com a análise completa.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analise este holerite${employeeContext?.name ? ` do funcionário ${employeeContext.name}` : ""} e retorne a análise em JSON.`
          },
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" }
          }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "payslip_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            employeeName: { type: "string" },
            referenceMonth: { type: "string" },
            baseSalary: { type: "number" },
            grossSalary: { type: "number" },
            netSalary: { type: "number" },
            earnings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  value: { type: "number" }
                },
                required: ["description", "value"],
                additionalProperties: false
              }
            },
            deductions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  value: { type: "number" },
                  isRegular: { type: "boolean" }
                },
                required: ["description", "value", "isRegular"],
                additionalProperties: false
              }
            },
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  description: { type: "string" }
                },
                required: ["type", "severity", "description"],
                additionalProperties: false
              }
            },
            calculationCheck: {
              type: "object",
              properties: {
                isCorrect: { type: "boolean" },
                expectedNet: { type: "number" },
                actualNet: { type: "number" },
                difference: { type: "number" }
              },
              required: ["isCorrect"],
              additionalProperties: false
            },
            complianceScore: { type: "integer" },
            rawText: { type: "string" }
          },
          required: ["earnings", "deductions", "alerts", "calculationCheck", "complianceScore"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");
  const textContent = typeof content === 'string' ? content : (content[0] as any)?.text || '';
  return JSON.parse(textContent) as PayslipAnalysis;
}

export async function classifyDocument(imageUrl: string): Promise<{
  documentType: string;
  confidence: number;
  extractedData: Record<string, any>;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Você é um especialista em classificação de documentos de RH.
Classifique o documento e extraia dados relevantes.

Tipos possíveis:
- contrato_trabalho: Contrato de trabalho
- rg: Documento de identidade
- cpf: CPF
- ctps: Carteira de trabalho
- comprovante_residencia: Comprovante de residência
- certidao_nascimento: Certidão de nascimento
- titulo_eleitor: Título de eleitor
- certificado_reservista: Certificado de reservista
- cnh: Carteira de motorista
- atestado_medico: Atestado médico
- aso: Atestado de saúde ocupacional
- epi: Ficha de EPI
- advertencia: Advertência
- ferias: Aviso de férias
- trct: Termo de rescisão
- outro: Outro documento`
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Classifique este documento e extraia os dados relevantes." },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            documentType: { type: "string" },
            confidence: { type: "number", description: "0 a 1" },
            extractedData: {
              type: "object",
              additionalProperties: true
            }
          },
          required: ["documentType", "confidence", "extractedData"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");
  const textContent = typeof content === 'string' ? content : (content[0] as any)?.text || '';
  return JSON.parse(textContent);
}
