import { nanoid } from "nanoid";
import * as db from "./db";
import { analyzeTimesheetWithVision } from "./aiAnalysis";
import { storagePut } from "./storage";

// Supported time clock systems
export type TimeclockSystem = 'generic' | 'dimep' | 'henry' | 'secullum' | 'topdata' | 'manual';

export interface TimeclockConfig {
  system: TimeclockSystem;
  apiUrl?: string;
  apiKey?: string;
  enabled: boolean;
  syncInterval?: number; // minutes
  lastSync?: Date;
}

export interface TimeclockRecord {
  employeeCpf: string;
  employeeName?: string;
  date: Date;
  punches: Array<{
    time: string;
    type: 'entry' | 'exit' | 'break_start' | 'break_end';
  }>;
  totalHours?: number;
  overtime?: number;
  absences?: number;
  rawData?: string;
}

export interface TimeclockImportResult {
  success: boolean;
  totalRecords: number;
  imported: number;
  errors: Array<{ record: number; error: string }>;
  alerts: number;
}

// Parse different time clock file formats
export function parseTimeclockFile(
  content: string,
  format: TimeclockSystem
): TimeclockRecord[] {
  switch (format) {
    case 'dimep':
      return parseDimepFormat(content);
    case 'henry':
      return parseHenryFormat(content);
    case 'secullum':
      return parseSecullumFormat(content);
    case 'topdata':
      return parseTopdataFormat(content);
    case 'generic':
    case 'manual':
    default:
      return parseGenericFormat(content);
  }
}

// Generic CSV/TXT format parser
function parseGenericFormat(content: string): TimeclockRecord[] {
  const records: TimeclockRecord[] = [];
  const lines = content.trim().split('\n');
  
  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('cpf') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try different separators
    const parts = line.includes(';') ? line.split(';') : 
                  line.includes('\t') ? line.split('\t') : 
                  line.split(',');
    
    if (parts.length < 3) continue;
    
    const cpf = parts[0]?.replace(/\D/g, '');
    const dateStr = parts[1]?.trim();
    const punchesStr = parts.slice(2);
    
    if (!cpf || !dateStr) continue;
    
    // Parse date (DD/MM/YYYY or YYYY-MM-DD)
    let date: Date;
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      date = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      date = new Date(dateStr);
    }
    
    // Parse punches
    const punches = punchesStr
      .filter(p => p?.trim())
      .map((p, idx) => ({
        time: p.trim(),
        type: (idx % 2 === 0 ? 'entry' : 'exit') as 'entry' | 'exit',
      }));
    
    records.push({
      employeeCpf: cpf,
      date,
      punches,
      rawData: line,
    });
  }
  
  return records;
}

// DIMEP format parser
function parseDimepFormat(content: string): TimeclockRecord[] {
  // DIMEP AFD format (Portaria 1510)
  const records: TimeclockRecord[] = [];
  const lines = content.trim().split('\n');
  
  for (const line of lines) {
    // Type 3 = punch record
    if (!line.startsWith('3')) continue;
    
    const cpf = line.substring(23, 34).trim();
    const dateStr = line.substring(10, 18); // DDMMYYYY
    const timeStr = line.substring(18, 22); // HHMM
    
    const date = new Date(
      Number(dateStr.substring(4, 8)),
      Number(dateStr.substring(2, 4)) - 1,
      Number(dateStr.substring(0, 2))
    );
    
    const time = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
    
    // Find or create record for this CPF/date
    let record = records.find(
      r => r.employeeCpf === cpf && r.date.toDateString() === date.toDateString()
    );
    
    if (!record) {
      record = { employeeCpf: cpf, date, punches: [] };
      records.push(record);
    }
    
    record.punches.push({
      time,
      type: record.punches.length % 2 === 0 ? 'entry' : 'exit',
    });
  }
  
  return records;
}

// Henry format parser
function parseHenryFormat(content: string): TimeclockRecord[] {
  // Similar to generic but with specific column positions
  return parseGenericFormat(content);
}

// Secullum format parser
function parseSecullumFormat(content: string): TimeclockRecord[] {
  // Secullum exports in specific format
  return parseGenericFormat(content);
}

// Topdata format parser
function parseTopdataFormat(content: string): TimeclockRecord[] {
  // Topdata Inner Rep format
  return parseGenericFormat(content);
}

// Import time clock records to the system
export async function importTimeclockRecords(
  records: TimeclockRecord[],
  userId: number
): Promise<TimeclockImportResult> {
  const result: TimeclockImportResult = {
    success: true,
    totalRecords: records.length,
    imported: 0,
    errors: [],
    alerts: 0,
  };
  
  // Get all employees for CPF matching
  const employees = await db.getEmployees();
  const employeeMap = new Map(
    employees?.map(e => [e.cpf.replace(/\D/g, ''), e]) || []
  );
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    try {
      // Find employee by CPF
      const employee = employeeMap.get(record.employeeCpf);
      
      if (!employee) {
        result.errors.push({
          record: i + 1,
          error: `Funcionário não encontrado: CPF ${record.employeeCpf}`,
        });
        continue;
      }
      
      // Generate timesheet content for analysis
      const timesheetContent = generateTimesheetContent(record, employee.name);
      
      // Store as file
      const fileKey = `timesheets/${employee.id}/${record.date.toISOString().split('T')[0]}-${nanoid(6)}.txt`;
      const buffer = Buffer.from(timesheetContent, 'utf-8');
      const { url } = await storagePut(fileKey, buffer, 'text/plain');
      
      // Create recurring document
      const doc = await db.createRecurringDocument({
        employeeId: employee.id,
        type: 'timesheet',
        referenceDate: record.date,
        fileName: `ponto-${record.date.toISOString().split('T')[0]}.txt`,
        fileUrl: url,
        fileKey,
        ocrText: timesheetContent,
        extractedData: {
          punches: record.punches,
          totalHours: record.totalHours,
          overtime: record.overtime,
        },
        complianceStatus: 'pending',
        uploadedBy: userId,
      });
      
      // Analyze with AI
      try {
        const analysis = await analyzeTimesheetWithVision(
          url,
          { name: employee.name, workHours: employee.workHours || '08:00-17:00' }
        );
        
        await db.updateRecurringDocument(doc.id, {
          aiAnalysis: analysis,
          complianceStatus: analysis.complianceScore >= 80 ? 'compliant' : 
                           analysis.complianceScore >= 60 ? 'warning' : 'non_compliant',
          complianceScore: analysis.complianceScore,
          processedAt: new Date(),
        });
        
        // Create alerts
        for (const alert of analysis.alerts) {
          await db.createComplianceAlert({
            employeeId: employee.id,
            recurringDocId: doc.id,
            type: mapAlertType(alert.type) as any,
            severity: alert.severity,
            title: alert.type,
            description: alert.description,
            details: { date: (alert as any).date },
          });
          result.alerts++;
        }
      } catch (error) {
        console.error(`[Timeclock] AI analysis failed for record ${i + 1}:`, error);
      }
      
      result.imported++;
    } catch (error) {
      result.errors.push({
        record: i + 1,
        error: String(error),
      });
    }
  }
  
  result.success = result.errors.length === 0;
  return result;
}

// Generate timesheet content from record
function generateTimesheetContent(record: TimeclockRecord, employeeName: string): string {
  const lines = [
    `FOLHA DE PONTO`,
    `Funcionário: ${employeeName}`,
    `CPF: ${record.employeeCpf}`,
    `Data: ${record.date.toLocaleDateString('pt-BR')}`,
    ``,
    `REGISTROS:`,
  ];
  
  for (const punch of record.punches) {
    const typeLabel = {
      entry: 'Entrada',
      exit: 'Saída',
      break_start: 'Início Intervalo',
      break_end: 'Fim Intervalo',
    }[punch.type];
    lines.push(`${punch.time} - ${typeLabel}`);
  }
  
  if (record.totalHours !== undefined) {
    lines.push(``, `Total de Horas: ${record.totalHours.toFixed(2)}h`);
  }
  
  if (record.overtime !== undefined && record.overtime > 0) {
    lines.push(`Horas Extras: ${record.overtime.toFixed(2)}h`);
  }
  
  return lines.join('\n');
}

// Map alert types
function mapAlertType(type: string): string {
  const mapping: Record<string, string> = {
    'Atraso': 'late_arrival',
    'Saída Antecipada': 'early_departure',
    'Hora Extra Não Autorizada': 'unauthorized_overtime',
    'Batida Faltante': 'missing_punch',
    'Falta Sem Justificativa': 'absence_without_justification',
  };
  return mapping[type] || 'late_arrival';
}

// Manual upload processing
export async function processManualTimesheetUpload(
  file: { data: Buffer; name: string; mimeType: string },
  employeeId: number,
  referenceDate: Date,
  userId: number
): Promise<{ success: boolean; docId?: number; error?: string }> {
  try {
    const employee = await db.getEmployeeById(employeeId);
    if (!employee) {
      return { success: false, error: 'Funcionário não encontrado' };
    }
    
    // Store file
    const fileKey = `timesheets/${employeeId}/${referenceDate.toISOString().split('T')[0]}-${nanoid(6)}-${file.name}`;
    const { url } = await storagePut(fileKey, file.data, file.mimeType);
    
    // Create document
    const doc = await db.createRecurringDocument({
      employeeId,
      type: 'timesheet',
      referenceDate,
      fileName: file.name,
      fileUrl: url,
      fileKey,
      complianceStatus: 'pending',
      uploadedBy: userId,
    });
    
    // Analyze with AI (async)
    analyzeTimesheetWithVision(url, { name: employee.name, workHours: employee.workHours || '08:00-17:00' })
      .then(async (analysis) => {
        await db.updateRecurringDocument(doc.id, {
          aiAnalysis: analysis,
          complianceStatus: analysis.complianceScore >= 80 ? 'compliant' : 
                           analysis.complianceScore >= 60 ? 'warning' : 'non_compliant',
          complianceScore: analysis.complianceScore,
          processedAt: new Date(),
        });
        
        // Create alerts
        for (const alert of analysis.alerts) {
          await db.createComplianceAlert({
            employeeId,
            recurringDocId: doc.id,
            type: mapAlertType(alert.type) as any,
            severity: alert.severity,
            title: alert.type,
            description: alert.description,
          });
        }
      })
      .catch(err => console.error('[Timeclock] AI analysis failed:', err));
    
    return { success: true, docId: doc.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Configuration storage (in-memory for demo)
let timeclockConfig: TimeclockConfig = {
  system: 'generic',
  enabled: false,
};

export function getTimeclockConfig(): TimeclockConfig {
  return timeclockConfig;
}

export function updateTimeclockConfig(config: Partial<TimeclockConfig>): TimeclockConfig {
  timeclockConfig = { ...timeclockConfig, ...config };
  return timeclockConfig;
}
