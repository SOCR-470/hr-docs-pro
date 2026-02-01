import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { 
  documentTemplates, 
  templateItems, 
  documentTypes,
  InsertDocumentTemplate,
  InsertTemplateItem 
} from "../drizzle/schema";

// ============ TEMPLATE SERVICE ============

export interface TemplateWithItems {
  template: typeof documentTemplates.$inferSelect;
  items: Array<typeof templateItems.$inferSelect & { documentType?: typeof documentTypes.$inferSelect }>;
}

// Criar template
export async function createTemplate(data: InsertDocumentTemplate): Promise<typeof documentTemplates.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(documentTemplates).values(data);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(documentTemplates).where(eq(documentTemplates.id, insertId)).limit(1);
  return created[0] || null;
}

// Listar templates
export async function listTemplates(includeInactive = false): Promise<Array<typeof documentTemplates.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  if (includeInactive) {
    return db.select().from(documentTemplates);
  }
  
  return db.select().from(documentTemplates).where(eq(documentTemplates.isActive, true));
}

// Obter template por ID com itens
export async function getTemplateWithItems(templateId: number): Promise<TemplateWithItems | null> {
  const db = await getDb();
  if (!db) return null;
  
  const template = await db.select().from(documentTemplates).where(eq(documentTemplates.id, templateId)).limit(1);
  if (!template[0]) return null;
  
  const items = await db
    .select({
      item: templateItems,
      docType: documentTypes
    })
    .from(templateItems)
    .leftJoin(documentTypes, eq(templateItems.documentTypeId, documentTypes.id))
    .where(eq(templateItems.templateId, templateId));
  
  return {
    template: template[0],
    items: items.map(i => ({ ...i.item, documentType: i.docType || undefined }))
  };
}

// Obter template por cargo/posição
export async function getTemplateByPosition(position: string): Promise<TemplateWithItems | null> {
  const db = await getDb();
  if (!db) return null;
  
  const template = await db
    .select()
    .from(documentTemplates)
    .where(and(
      eq(documentTemplates.position, position),
      eq(documentTemplates.isActive, true)
    ))
    .limit(1);
  
  if (!template[0]) {
    // Fallback para template base
    const baseTemplate = await db
      .select()
      .from(documentTemplates)
      .where(and(
        eq(documentTemplates.isBase, true),
        eq(documentTemplates.isActive, true)
      ))
      .limit(1);
    
    if (!baseTemplate[0]) return null;
    return getTemplateWithItems(baseTemplate[0].id);
  }
  
  return getTemplateWithItems(template[0].id);
}

// Adicionar item ao template
export async function addTemplateItem(data: InsertTemplateItem): Promise<typeof templateItems.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(templateItems).values(data);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(templateItems).where(eq(templateItems.id, insertId)).limit(1);
  return created[0] || null;
}

// Remover item do template
export async function removeTemplateItem(itemId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(templateItems).where(eq(templateItems.id, itemId));
  return true;
}

// Atualizar template
export async function updateTemplate(
  templateId: number, 
  data: Partial<InsertDocumentTemplate>
): Promise<typeof documentTemplates.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(documentTemplates).set(data).where(eq(documentTemplates.id, templateId));
  
  const updated = await db.select().from(documentTemplates).where(eq(documentTemplates.id, templateId)).limit(1);
  return updated[0] || null;
}

// Duplicar template
export async function duplicateTemplate(
  templateId: number, 
  newName: string, 
  newPosition?: string
): Promise<typeof documentTemplates.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  
  const original = await getTemplateWithItems(templateId);
  if (!original) return null;
  
  // Criar novo template
  const newTemplate = await createTemplate({
    name: newName,
    description: original.template.description,
    position: newPosition || null,
    departmentId: original.template.departmentId,
    parentTemplateId: templateId,
    isBase: false,
    isActive: true
  });
  
  if (!newTemplate) return null;
  
  // Copiar itens
  for (const item of original.items) {
    await addTemplateItem({
      templateId: newTemplate.id,
      documentTypeId: item.documentTypeId,
      isRequired: item.isRequired,
      hasExpiration: item.hasExpiration,
      expirationDays: item.expirationDays,
      alertDaysBefore: item.alertDaysBefore,
      requiresSignature: item.requiresSignature,
      isAutoGenerated: item.isAutoGenerated,
      sortOrder: item.sortOrder,
      condition: item.condition
    });
  }
  
  return newTemplate;
}

// Obter itens herdados (do template pai)
export async function getInheritedItems(templateId: number): Promise<Array<typeof templateItems.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  const template = await db.select().from(documentTemplates).where(eq(documentTemplates.id, templateId)).limit(1);
  if (!template[0] || !template[0].parentTemplateId) return [];
  
  return db.select().from(templateItems).where(eq(templateItems.templateId, template[0].parentTemplateId));
}

// Obter todos os itens (próprios + herdados)
export async function getAllTemplateItems(templateId: number): Promise<Array<typeof templateItems.$inferSelect & { inherited: boolean }>> {
  const db = await getDb();
  if (!db) return [];
  
  const ownItems = await db.select().from(templateItems).where(eq(templateItems.templateId, templateId));
  const inheritedItems = await getInheritedItems(templateId);
  
  return [
    ...inheritedItems.map(i => ({ ...i, inherited: true })),
    ...ownItems.map(i => ({ ...i, inherited: false }))
  ];
}

// Criar templates padrão
export async function createDefaultTemplates(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Verificar se já existem templates
  const existing = await db.select().from(documentTemplates).limit(1);
  if (existing.length > 0) return;
  
  // Obter tipos de documentos
  const docTypes = await db.select().from(documentTypes);
  const getDocTypeId = (name: string) => docTypes.find(d => d.name.toLowerCase().includes(name.toLowerCase()))?.id;
  
  // Template Base (todos os funcionários)
  const baseTemplate = await createTemplate({
    name: "Template Base - Todos os Funcionários",
    description: "Documentos obrigatórios para todos os funcionários",
    isBase: true,
    isActive: true
  });
  
  if (baseTemplate) {
    const baseItems = [
      { name: "contrato", required: true, signature: true, autoGen: true },
      { name: "rg", required: true, signature: false, autoGen: false },
      { name: "cpf", required: true, signature: false, autoGen: false },
      { name: "comprovante", required: true, signature: false, autoGen: false },
      { name: "aso", required: true, signature: false, autoGen: false, expDays: 365, alert: 30 },
      { name: "lgpd", required: true, signature: true, autoGen: true },
    ];
    
    for (let i = 0; i < baseItems.length; i++) {
      const item = baseItems[i];
      const docTypeId = getDocTypeId(item.name);
      if (docTypeId) {
        await addTemplateItem({
          templateId: baseTemplate.id,
          documentTypeId: docTypeId,
          isRequired: item.required,
          hasExpiration: !!item.expDays,
          expirationDays: item.expDays || null,
          alertDaysBefore: item.alert || 30,
          requiresSignature: item.signature,
          isAutoGenerated: item.autoGen,
          sortOrder: i + 1
        });
      }
    }
  }
  
  // Template Motorista
  const motoristaTemplate = await createTemplate({
    name: "Template Motorista",
    description: "Documentos específicos para motoristas",
    position: "Motorista",
    parentTemplateId: baseTemplate?.id,
    isBase: false,
    isActive: true
  });
  
  if (motoristaTemplate) {
    const motoristaItems = [
      { name: "cnh", required: true, expDays: 1825, alert: 60 }, // 5 anos
      { name: "toxicológico", required: true, expDays: 912, alert: 60 }, // 2.5 anos
    ];
    
    for (let i = 0; i < motoristaItems.length; i++) {
      const item = motoristaItems[i];
      const docTypeId = getDocTypeId(item.name);
      if (docTypeId) {
        await addTemplateItem({
          templateId: motoristaTemplate.id,
          documentTypeId: docTypeId,
          isRequired: item.required,
          hasExpiration: !!item.expDays,
          expirationDays: item.expDays || null,
          alertDaysBefore: item.alert || 30,
          sortOrder: i + 100
        });
      }
    }
  }
  
  // Template Produção
  const producaoTemplate = await createTemplate({
    name: "Template Produção",
    description: "Documentos específicos para funcionários de produção",
    position: "Produção",
    parentTemplateId: baseTemplate?.id,
    isBase: false,
    isActive: true
  });
  
  if (producaoTemplate) {
    const producaoItems = [
      { name: "epi", required: true, signature: true, autoGen: true },
    ];
    
    for (let i = 0; i < producaoItems.length; i++) {
      const item = producaoItems[i];
      const docTypeId = getDocTypeId(item.name);
      if (docTypeId) {
        await addTemplateItem({
          templateId: producaoTemplate.id,
          documentTypeId: docTypeId,
          isRequired: item.required,
          requiresSignature: item.signature || false,
          isAutoGenerated: item.autoGen || false,
          sortOrder: i + 100
        });
      }
    }
  }
}
