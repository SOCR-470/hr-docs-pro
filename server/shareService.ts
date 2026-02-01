import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { 
  documentShares, 
  documents,
  employees,
  lgpdConsents,
  InsertDocumentShare
} from "../drizzle/schema";
import { nanoid } from "nanoid";

// ============ DOCUMENT SHARE SERVICE ============

// Criar compartilhamento de documentos
export async function createDocumentShare(
  employeeId: number,
  documentIds: number[],
  recipientName: string,
  recipientEmail: string,
  recipientType: "accountant" | "lawyer" | "partner" | "other",
  message: string | null,
  validityDays: number,
  createdBy: number
): Promise<{ success: boolean; share?: typeof documentShares.$inferSelect; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Banco de dados indisponível" };
  
  // Verificar consentimento LGPD para compartilhamento
  const consent = await db
    .select()
    .from(lgpdConsents)
    .where(and(
      eq(lgpdConsents.employeeId, employeeId),
      eq(lgpdConsents.status, "signed")
    ))
    .limit(1);
  
  if (consent.length === 0) {
    return { 
      success: false, 
      error: "Funcionário não possui consentimento LGPD válido para compartilhamento de documentos" 
    };
  }
  
  // Verificar se os documentos existem e pertencem ao funcionário
  const docs = await db
    .select()
    .from(documents)
    .where(and(
      inArray(documents.id, documentIds),
      eq(documents.employeeId, employeeId)
    ));
  
  if (docs.length !== documentIds.length) {
    return { success: false, error: "Um ou mais documentos não foram encontrados" };
  }
  
  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);
  
  const result = await db.insert(documentShares).values({
    employeeId,
    token,
    recipientName,
    recipientEmail,
    recipientType,
    documentIds: documentIds,
    message,
    status: "active",
    expiresAt,
    createdBy
  });
  
  const insertId = result[0].insertId;
  const created = await db.select().from(documentShares).where(eq(documentShares.id, insertId)).limit(1);
  
  return { success: true, share: created[0] };
}

// Obter compartilhamento por token (acesso público)
export async function getShareByToken(token: string): Promise<{
  share: typeof documentShares.$inferSelect;
  employee: typeof employees.$inferSelect;
  documents: Array<typeof documents.$inferSelect>;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const shareResult = await db
    .select({
      share: documentShares,
      employee: employees
    })
    .from(documentShares)
    .innerJoin(employees, eq(documentShares.employeeId, employees.id))
    .where(eq(documentShares.token, token))
    .limit(1);
  
  if (!shareResult[0]) return null;
  
  const { share, employee } = shareResult[0];
  
  // Verificar se expirou
  if (share.status !== "active" || (share.expiresAt && new Date() > share.expiresAt)) {
    return null;
  }
  
  // Obter documentos
  const documentIds = share.documentIds as number[];
  const docs = await db
    .select()
    .from(documents)
    .where(inArray(documents.id, documentIds));
  
  // Registrar acesso
  await db.update(documentShares).set({
    accessCount: (share.accessCount || 0) + 1,
    lastAccessAt: new Date()
  }).where(eq(documentShares.id, share.id));
  
  return { share, employee, documents: docs };
}

// Listar compartilhamentos por funcionário
export async function getSharesByEmployee(employeeId: number): Promise<Array<typeof documentShares.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(documentShares).where(eq(documentShares.employeeId, employeeId));
}

// Listar todos os compartilhamentos ativos
export async function listActiveShares(): Promise<Array<{
  share: typeof documentShares.$inferSelect;
  employee: typeof employees.$inferSelect;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      share: documentShares,
      employee: employees
    })
    .from(documentShares)
    .innerJoin(employees, eq(documentShares.employeeId, employees.id))
    .where(eq(documentShares.status, "active"));
  
  return result;
}

// Revogar compartilhamento
export async function revokeShare(shareId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(documentShares).set({
    status: "revoked"
  }).where(eq(documentShares.id, shareId));
  
  return true;
}

// Obter documentos do funcionário para seleção
export async function getEmployeeDocumentsForShare(employeeId: number): Promise<Array<{
  id: number;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  status: string;
  createdAt: Date;
  documentType: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const docs = await db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      status: documents.status,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.employeeId, employeeId));
  
  return docs.map(d => ({ ...d, documentType: null }));
}

// Verificar se funcionário tem consentimento LGPD válido
export async function hasValidLgpdConsent(employeeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const consent = await db
    .select()
    .from(lgpdConsents)
    .where(and(
      eq(lgpdConsents.employeeId, employeeId),
      eq(lgpdConsents.status, "signed")
    ))
    .limit(1);
  
  return consent.length > 0;
}
