import { db } from "./db";
import { 
  checklistTemplates, 
  checklistItems, 
  employeeChecklists, 
  employeeChecklistItems,
  employees,
  departments,
  documentModels,
  documentTypes,
  notifications,
  users
} from "../drizzle/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

// ============ CHECKLIST TEMPLATES ============

// Create checklist template
export async function createChecklistTemplate(data: {
  name: string;
  type: "onboarding" | "offboarding";
  description?: string;
  departmentId?: number;
  position?: string;
  isDefault?: boolean;
  createdBy: number;
}) {
  const [result] = await db.insert(checklistTemplates).values({
    ...data,
    isActive: true,
  });
  
  return result.insertId;
}

// Get checklist templates
export async function getChecklistTemplates(type?: "onboarding" | "offboarding") {
  let query = db.select({
    template: checklistTemplates,
    department: {
      id: departments.id,
      name: departments.name,
    },
  })
  .from(checklistTemplates)
  .leftJoin(departments, eq(checklistTemplates.departmentId, departments.id))
  .where(eq(checklistTemplates.isActive, true))
  .orderBy(checklistTemplates.name);
  
  const results = await query;
  
  if (type) {
    return results.filter(r => r.template.type === type);
  }
  
  return results;
}

// Get template with items
export async function getTemplateWithItems(templateId: number) {
  const [template] = await db.select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, templateId));
  
  if (!template) return null;
  
  const items = await db.select({
    item: checklistItems,
    documentModel: {
      id: documentModels.id,
      name: documentModels.name,
    },
    documentType: {
      id: documentTypes.id,
      name: documentTypes.name,
    },
  })
  .from(checklistItems)
  .leftJoin(documentModels, eq(checklistItems.documentModelId, documentModels.id))
  .leftJoin(documentTypes, eq(checklistItems.documentTypeId, documentTypes.id))
  .where(eq(checklistItems.templateId, templateId))
  .orderBy(checklistItems.sortOrder);
  
  return { template, items };
}

// Update template
export async function updateChecklistTemplate(id: number, data: Partial<{
  name: string;
  description: string;
  departmentId: number;
  position: string;
  isDefault: boolean;
  isActive: boolean;
}>) {
  await db.update(checklistTemplates)
    .set(data as any)
    .where(eq(checklistTemplates.id, id));
  return { success: true };
}

// Delete template (soft)
export async function deleteChecklistTemplate(id: number) {
  await db.update(checklistTemplates)
    .set({ isActive: false })
    .where(eq(checklistTemplates.id, id));
  return { success: true };
}

// ============ CHECKLIST ITEMS ============

// Add item to template
export async function addChecklistItem(data: {
  templateId: number;
  title: string;
  description?: string;
  category: string;
  responsibleRole: string;
  daysToComplete?: number;
  isMandatory?: boolean;
  documentModelId?: number;
  documentTypeId?: number;
  sortOrder?: number;
}) {
  const [result] = await db.insert(checklistItems).values({
    ...data,
    category: data.category as any,
    responsibleRole: data.responsibleRole as any,
    daysToComplete: data.daysToComplete || 0,
    isMandatory: data.isMandatory !== false,
    sortOrder: data.sortOrder || 0,
  });
  
  return result.insertId;
}

// Update checklist item
export async function updateChecklistItem(id: number, data: Partial<{
  title: string;
  description: string;
  category: string;
  responsibleRole: string;
  daysToComplete: number;
  isMandatory: boolean;
  documentModelId: number;
  documentTypeId: number;
  sortOrder: number;
}>) {
  await db.update(checklistItems)
    .set(data as any)
    .where(eq(checklistItems.id, id));
  return { success: true };
}

// Delete checklist item
export async function deleteChecklistItem(id: number) {
  await db.delete(checklistItems).where(eq(checklistItems.id, id));
  return { success: true };
}

// ============ EMPLOYEE CHECKLISTS ============

// Start checklist for employee
export async function startEmployeeChecklist(data: {
  employeeId: number;
  templateId: number;
  type: "onboarding" | "offboarding";
  startDate: Date;
  createdBy: number;
}) {
  // Get template items
  const items = await db.select()
    .from(checklistItems)
    .where(eq(checklistItems.templateId, data.templateId));
  
  // Calculate target completion date (max days from items)
  const maxDays = Math.max(...items.map(i => i.daysToComplete || 0), 30);
  const targetCompletionDate = new Date(data.startDate);
  targetCompletionDate.setDate(targetCompletionDate.getDate() + maxDays);
  
  // Create employee checklist
  const [result] = await db.insert(employeeChecklists).values({
    employeeId: data.employeeId,
    templateId: data.templateId,
    type: data.type,
    startDate: data.startDate,
    targetCompletionDate,
    status: "in_progress",
    totalItems: items.length,
    completedItems: 0,
    createdBy: data.createdBy,
  });
  
  const checklistId = result.insertId;
  
  // Create items for this checklist
  for (const item of items) {
    const dueDate = new Date(data.startDate);
    dueDate.setDate(dueDate.getDate() + (item.daysToComplete || 0));
    
    await db.insert(employeeChecklistItems).values({
      empChecklistId: checklistId,
      itemId: item.id,
      status: "pending",
      dueDate,
    });
  }
  
  return checklistId;
}

// Get employee checklists
export async function getEmployeeChecklists(filters?: {
  employeeId?: number;
  type?: string;
  status?: string;
}) {
  const results = await db.select({
    checklist: employeeChecklists,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
      departmentId: employees.departmentId,
    },
    template: {
      id: checklistTemplates.id,
      name: checklistTemplates.name,
    },
  })
  .from(employeeChecklists)
  .innerJoin(employees, eq(employeeChecklists.employeeId, employees.id))
  .innerJoin(checklistTemplates, eq(employeeChecklists.templateId, checklistTemplates.id))
  .orderBy(desc(employeeChecklists.createdAt));
  
  let filtered = results;
  
  if (filters?.employeeId) {
    filtered = filtered.filter(r => r.checklist.employeeId === filters.employeeId);
  }
  
  if (filters?.type) {
    filtered = filtered.filter(r => r.checklist.type === filters.type);
  }
  
  if (filters?.status) {
    filtered = filtered.filter(r => r.checklist.status === filters.status);
  }
  
  return filtered;
}

// Get checklist with items progress
export async function getChecklistProgress(checklistId: number) {
  const [checklist] = await db.select({
    checklist: employeeChecklists,
    employee: {
      id: employees.id,
      name: employees.name,
      position: employees.position,
    },
    template: {
      id: checklistTemplates.id,
      name: checklistTemplates.name,
    },
  })
  .from(employeeChecklists)
  .innerJoin(employees, eq(employeeChecklists.employeeId, employees.id))
  .innerJoin(checklistTemplates, eq(employeeChecklists.templateId, checklistTemplates.id))
  .where(eq(employeeChecklists.id, checklistId));
  
  if (!checklist) return null;
  
  const items = await db.select({
    progress: employeeChecklistItems,
    item: checklistItems,
  })
  .from(employeeChecklistItems)
  .innerJoin(checklistItems, eq(employeeChecklistItems.itemId, checklistItems.id))
  .where(eq(employeeChecklistItems.empChecklistId, checklistId))
  .orderBy(checklistItems.sortOrder);
  
  return { ...checklist, items };
}

// Update checklist item status
export async function updateChecklistItemStatus(
  itemProgressId: number, 
  status: string,
  completedBy?: number,
  notes?: string
) {
  const updateData: any = { status };
  
  if (status === 'completed') {
    updateData.completedAt = new Date();
    updateData.completedBy = completedBy;
  }
  
  if (notes) {
    updateData.notes = notes;
  }
  
  await db.update(employeeChecklistItems)
    .set(updateData)
    .where(eq(employeeChecklistItems.id, itemProgressId));
  
  // Update checklist progress
  const [itemProgress] = await db.select()
    .from(employeeChecklistItems)
    .where(eq(employeeChecklistItems.id, itemProgressId));
  
  if (itemProgress) {
    await updateChecklistProgress(itemProgress.empChecklistId);
  }
  
  return { success: true };
}

// Update checklist progress counts
async function updateChecklistProgress(checklistId: number) {
  const items = await db.select()
    .from(employeeChecklistItems)
    .where(eq(employeeChecklistItems.empChecklistId, checklistId));
  
  const completedCount = items.filter(i => i.status === 'completed' || i.status === 'skipped').length;
  const totalCount = items.length;
  
  const isComplete = completedCount === totalCount;
  
  await db.update(employeeChecklists)
    .set({
      completedItems: completedCount,
      totalItems: totalCount,
      status: isComplete ? "completed" : "in_progress",
      completedAt: isComplete ? new Date() : null,
    })
    .where(eq(employeeChecklists.id, checklistId));
}

// Assign item to user
export async function assignChecklistItem(itemProgressId: number, assignedTo: number) {
  await db.update(employeeChecklistItems)
    .set({ assignedTo })
    .where(eq(employeeChecklistItems.id, itemProgressId));
  
  // Create notification for assigned user
  const [itemProgress] = await db.select({
    progress: employeeChecklistItems,
    item: checklistItems,
    checklist: employeeChecklists,
    employee: employees,
  })
  .from(employeeChecklistItems)
  .innerJoin(checklistItems, eq(employeeChecklistItems.itemId, checklistItems.id))
  .innerJoin(employeeChecklists, eq(employeeChecklistItems.empChecklistId, employeeChecklists.id))
  .innerJoin(employees, eq(employeeChecklists.employeeId, employees.id))
  .where(eq(employeeChecklistItems.id, itemProgressId));
  
  if (itemProgress) {
    await db.insert(notifications).values({
      userId: assignedTo,
      type: "checklist_pending",
      title: "Nova Tarefa de Checklist",
      message: `Você foi designado para: ${itemProgress.item.title} - ${itemProgress.employee.name}`,
      relatedEntityType: "checklist_item",
      relatedEntityId: itemProgressId,
      priority: "medium",
      isRead: false,
    });
  }
  
  return { success: true };
}

// ============ DEFAULT TEMPLATES ============

// Create default onboarding template
export async function createDefaultOnboardingTemplate(createdBy: number) {
  // Check if default exists
  const existing = await db.select()
    .from(checklistTemplates)
    .where(and(
      eq(checklistTemplates.type, "onboarding"),
      eq(checklistTemplates.isDefault, true)
    ));
  
  if (existing.length > 0) {
    return { templateId: existing[0].id, created: false };
  }
  
  const templateId = await createChecklistTemplate({
    name: "Onboarding Padrão",
    type: "onboarding",
    description: "Checklist padrão para admissão de novos funcionários",
    isDefault: true,
    createdBy,
  });
  
  const items = [
    // Documentos
    { title: "Coletar documentos pessoais", category: "documents", responsibleRole: "hr", daysToComplete: 0, sortOrder: 1 },
    { title: "Coletar foto 3x4", category: "documents", responsibleRole: "hr", daysToComplete: 0, sortOrder: 2 },
    { title: "Coletar comprovante de residência", category: "documents", responsibleRole: "hr", daysToComplete: 0, sortOrder: 3 },
    { title: "Coletar certidão de nascimento/casamento", category: "documents", responsibleRole: "hr", daysToComplete: 0, sortOrder: 4 },
    { title: "Coletar carteira de trabalho", category: "documents", responsibleRole: "hr", daysToComplete: 0, sortOrder: 5 },
    { title: "Assinar contrato de trabalho", category: "documents", responsibleRole: "hr", daysToComplete: 1, sortOrder: 6 },
    { title: "Assinar termo de confidencialidade", category: "documents", responsibleRole: "hr", daysToComplete: 1, sortOrder: 7 },
    
    // Equipamentos
    { title: "Entregar crachá", category: "equipment", responsibleRole: "hr", daysToComplete: 1, sortOrder: 10 },
    { title: "Entregar notebook/computador", category: "equipment", responsibleRole: "it", daysToComplete: 1, sortOrder: 11 },
    { title: "Entregar celular corporativo (se aplicável)", category: "equipment", responsibleRole: "it", daysToComplete: 3, sortOrder: 12 },
    { title: "Entregar EPIs (se aplicável)", category: "equipment", responsibleRole: "hr", daysToComplete: 1, sortOrder: 13 },
    
    // Acessos
    { title: "Criar email corporativo", category: "access", responsibleRole: "it", daysToComplete: 1, sortOrder: 20 },
    { title: "Criar acesso aos sistemas", category: "access", responsibleRole: "it", daysToComplete: 1, sortOrder: 21 },
    { title: "Configurar VPN (se aplicável)", category: "access", responsibleRole: "it", daysToComplete: 3, sortOrder: 22 },
    { title: "Adicionar em grupos de comunicação", category: "access", responsibleRole: "it", daysToComplete: 1, sortOrder: 23 },
    
    // Treinamentos
    { title: "Treinamento de integração", category: "training", responsibleRole: "hr", daysToComplete: 3, sortOrder: 30 },
    { title: "Apresentação da empresa e cultura", category: "training", responsibleRole: "hr", daysToComplete: 3, sortOrder: 31 },
    { title: "Treinamento de segurança do trabalho", category: "training", responsibleRole: "hr", daysToComplete: 7, sortOrder: 32 },
    { title: "Treinamento específico da função", category: "training", responsibleRole: "manager", daysToComplete: 14, sortOrder: 33 },
    
    // Administrativo
    { title: "Cadastrar no sistema de ponto", category: "administrative", responsibleRole: "hr", daysToComplete: 1, sortOrder: 40 },
    { title: "Cadastrar benefícios", category: "administrative", responsibleRole: "hr", daysToComplete: 3, sortOrder: 41 },
    { title: "Abrir conta salário (se necessário)", category: "administrative", responsibleRole: "finance", daysToComplete: 7, sortOrder: 42 },
    { title: "Agendar exame admissional", category: "administrative", responsibleRole: "hr", daysToComplete: 0, sortOrder: 43 },
  ];
  
  for (const item of items) {
    await addChecklistItem({
      templateId,
      ...item,
      isMandatory: true,
    });
  }
  
  return { templateId, created: true };
}

// Create default offboarding template
export async function createDefaultOffboardingTemplate(createdBy: number) {
  // Check if default exists
  const existing = await db.select()
    .from(checklistTemplates)
    .where(and(
      eq(checklistTemplates.type, "offboarding"),
      eq(checklistTemplates.isDefault, true)
    ));
  
  if (existing.length > 0) {
    return { templateId: existing[0].id, created: false };
  }
  
  const templateId = await createChecklistTemplate({
    name: "Offboarding Padrão",
    type: "offboarding",
    description: "Checklist padrão para desligamento de funcionários",
    isDefault: true,
    createdBy,
  });
  
  const items = [
    // Documentos
    { title: "Comunicar desligamento formal", category: "documents", responsibleRole: "hr", daysToComplete: 0, sortOrder: 1 },
    { title: "Assinar termo de rescisão", category: "documents", responsibleRole: "hr", daysToComplete: 1, sortOrder: 2 },
    { title: "Entregar carta de referência (se aplicável)", category: "documents", responsibleRole: "hr", daysToComplete: 5, sortOrder: 3 },
    { title: "Atualizar CTPS", category: "documents", responsibleRole: "hr", daysToComplete: 3, sortOrder: 4 },
    
    // Equipamentos
    { title: "Devolver crachá", category: "equipment", responsibleRole: "hr", daysToComplete: 0, sortOrder: 10 },
    { title: "Devolver notebook/computador", category: "equipment", responsibleRole: "it", daysToComplete: 0, sortOrder: 11 },
    { title: "Devolver celular corporativo", category: "equipment", responsibleRole: "it", daysToComplete: 0, sortOrder: 12 },
    { title: "Devolver EPIs", category: "equipment", responsibleRole: "hr", daysToComplete: 0, sortOrder: 13 },
    { title: "Devolver chaves/cartões de acesso", category: "equipment", responsibleRole: "hr", daysToComplete: 0, sortOrder: 14 },
    
    // Acessos
    { title: "Revogar acesso ao email", category: "access", responsibleRole: "it", daysToComplete: 0, sortOrder: 20 },
    { title: "Revogar acesso aos sistemas", category: "access", responsibleRole: "it", daysToComplete: 0, sortOrder: 21 },
    { title: "Desativar VPN", category: "access", responsibleRole: "it", daysToComplete: 0, sortOrder: 22 },
    { title: "Remover de grupos de comunicação", category: "access", responsibleRole: "it", daysToComplete: 0, sortOrder: 23 },
    { title: "Backup de dados do funcionário", category: "access", responsibleRole: "it", daysToComplete: 1, sortOrder: 24 },
    
    // Administrativo
    { title: "Calcular rescisão", category: "administrative", responsibleRole: "finance", daysToComplete: 3, sortOrder: 30 },
    { title: "Cancelar benefícios", category: "administrative", responsibleRole: "hr", daysToComplete: 1, sortOrder: 31 },
    { title: "Agendar exame demissional", category: "administrative", responsibleRole: "hr", daysToComplete: 0, sortOrder: 32 },
    { title: "Realizar entrevista de desligamento", category: "administrative", responsibleRole: "hr", daysToComplete: 1, sortOrder: 33 },
    { title: "Transferir responsabilidades", category: "administrative", responsibleRole: "manager", daysToComplete: 5, sortOrder: 34 },
  ];
  
  for (const item of items) {
    await addChecklistItem({
      templateId,
      ...item,
      isMandatory: true,
    });
  }
  
  return { templateId, created: true };
}

// ============ SUMMARY & REPORTS ============

// Get checklist summary
export async function getChecklistSummary() {
  const allChecklists = await db.select().from(employeeChecklists);
  const allItems = await db.select().from(employeeChecklistItems);
  
  const onboarding = allChecklists.filter(c => c.type === 'onboarding');
  const offboarding = allChecklists.filter(c => c.type === 'offboarding');
  
  const activeOnboarding = onboarding.filter(c => c.status === 'in_progress').length;
  const activeOffboarding = offboarding.filter(c => c.status === 'in_progress').length;
  
  const pendingTasks = allItems.filter(i => i.status === 'pending' || i.status === 'in_progress').length;
  const now = new Date();
  const overdueTasks = allItems.filter(i => {
    if (i.status === 'completed' || i.status === 'skipped') return false;
    if (!i.dueDate) return false;
    return new Date(i.dueDate) < now;
  }).length;
  
  return {
    total: allChecklists.length,
    activeOnboarding,
    activeOffboarding,
    pendingTasks,
    overdueTasks,
    onboarding: {
      total: onboarding.length,
      inProgress: onboarding.filter(c => c.status === 'in_progress').length,
      completed: onboarding.filter(c => c.status === 'completed').length,
    },
    offboarding: {
      total: offboarding.length,
      inProgress: offboarding.filter(c => c.status === 'in_progress').length,
      completed: offboarding.filter(c => c.status === 'completed').length,
    },
  };
}

// Get overdue items
export async function getOverdueChecklistItems() {
  const now = new Date();
  
  const items = await db.select({
    progress: employeeChecklistItems,
    item: checklistItems,
    checklist: employeeChecklists,
    employee: {
      id: employees.id,
      name: employees.name,
    },
  })
  .from(employeeChecklistItems)
  .innerJoin(checklistItems, eq(employeeChecklistItems.itemId, checklistItems.id))
  .innerJoin(employeeChecklists, eq(employeeChecklistItems.empChecklistId, employeeChecklists.id))
  .innerJoin(employees, eq(employeeChecklists.employeeId, employees.id))
  .where(and(
    eq(employeeChecklistItems.status, "pending"),
    eq(employeeChecklists.status, "in_progress")
  ));
  
  return items.filter(i => i.progress.dueDate && new Date(i.progress.dueDate) < now);
}


// ============ EXPORTED UTILITIES FOR TESTING ============

export function calculateChecklistProgress(completedItems: number, totalItems: number): number {
  if (totalItems === 0) return 0;
  return Math.round((completedItems / totalItems) * 100);
}

export function getChecklistStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em Andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
  };
  return labels[status] || status;
}
