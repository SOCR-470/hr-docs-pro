import { db } from "./db";
import { 
  notifications, 
  notificationPreferences, 
  notificationDigests,
  users,
  employees,
  vacations,
  complianceAlerts,
  documents,
  employeeChecklistItems,
  employeeChecklists,
  checklistItems,
  laborLawsuits,
  lawsuitHearings,
  lawsuitDeadlines
} from "../drizzle/schema";
import { eq, and, desc, gte, lte, isNull, sql, or } from "drizzle-orm";
import { sendEmail } from "./emailService";

// ============ NOTIFICATIONS ============

// Create notification
export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  priority?: string;
  expiresAt?: Date;
}) {
  const [result] = await db.insert(notifications).values({
    ...data,
    type: data.type as any,
    priority: (data.priority || "medium") as any,
    isRead: false,
  });
  
  return result.insertId;
}

// Get user notifications
export async function getUserNotifications(userId: number, limit = 50, unreadOnly = false) {
  let query = db.select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  
  const results = await query;
  
  if (unreadOnly) {
    return results.filter(n => !n.isRead);
  }
  
  return results;
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number) {
  await db.update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(eq(notifications.id, notificationId));
  return { success: true };
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: number) {
  await db.update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));
  return { success: true };
}

// Get unread count
export async function getUnreadNotificationCount(userId: number) {
  const results = await db.select()
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));
  
  return results.length;
}

// Delete old notifications
export async function cleanupOldNotifications(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  await db.delete(notifications)
    .where(and(
      eq(notifications.isRead, true),
      lte(notifications.createdAt, cutoffDate)
    ));
  
  return { success: true };
}

// ============ NOTIFICATION PREFERENCES ============

// Get or create user preferences
export async function getUserPreferences(userId: number) {
  const [existing] = await db.select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  
  if (existing) return existing;
  
  // Create default preferences
  const [result] = await db.insert(notificationPreferences).values({
    userId,
    dailyDigest: true,
    dailyDigestTime: "08:00",
    weeklyDigest: true,
    weeklyDigestDay: 1, // Monday
    notifyDocumentExpiring: true,
    notifyVacationExpiring: true,
    notifyNewAlert: true,
    notifyChecklistPending: true,
    notifySignatureRequired: true,
    notifyLawsuitUpdate: true,
    emailEnabled: true,
    inAppEnabled: true,
  });
  
  return db.select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .then(r => r[0]);
}

// Update user preferences
export async function updateUserPreferences(userId: number, data: Partial<{
  dailyDigest: boolean;
  dailyDigestTime: string;
  weeklyDigest: boolean;
  weeklyDigestDay: number;
  notifyDocumentExpiring: boolean;
  notifyVacationExpiring: boolean;
  notifyNewAlert: boolean;
  notifyChecklistPending: boolean;
  notifySignatureRequired: boolean;
  notifyLawsuitUpdate: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}>) {
  await db.update(notificationPreferences)
    .set(data)
    .where(eq(notificationPreferences.userId, userId));
  return { success: true };
}

// ============ DIGEST GENERATION ============

// Generate daily digest for a user
export async function generateDailyDigest(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.email) return null;
  
  const prefs = await getUserPreferences(userId);
  if (!prefs.dailyDigest || !prefs.emailEnabled) return null;
  
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Collect items for digest
  const items: Array<{ category: string; title: string; description: string; priority: string }> = [];
  
  // 1. Expiring documents (next 7 days)
  if (prefs.notifyDocumentExpiring) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringDocs = await db.select({
      document: documents,
      employee: employees,
    })
    .from(documents)
    .innerJoin(employees, eq(documents.employeeId, employees.id))
    .where(and(
      eq(documents.status, "valid"),
      gte(documents.expiresAt, now),
      lte(documents.expiresAt, sevenDaysFromNow)
    ));
    
    for (const doc of expiringDocs) {
      items.push({
        category: "Documentos",
        title: `Documento expirando: ${doc.document.fileName}`,
        description: `Funcionário: ${doc.employee.name} - Expira em: ${formatDate(doc.document.expiresAt!)}`,
        priority: "medium",
      });
    }
  }
  
  // 2. Expiring vacations (next 30 days)
  if (prefs.notifyVacationExpiring) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringVacations = await db.select({
      vacation: vacations,
      employee: employees,
    })
    .from(vacations)
    .innerJoin(employees, eq(vacations.employeeId, employees.id))
    .where(and(
      eq(vacations.status, "available"),
      lte(vacations.concessivePeriodEnd, thirtyDaysFromNow)
    ));
    
    for (const v of expiringVacations) {
      items.push({
        category: "Férias",
        title: `Férias vencendo: ${v.employee.name}`,
        description: `Período concessivo termina em: ${formatDate(v.vacation.concessivePeriodEnd)}`,
        priority: "high",
      });
    }
  }
  
  // 3. New alerts (last 24h)
  if (prefs.notifyNewAlert) {
    const newAlerts = await db.select({
      alert: complianceAlerts,
      employee: employees,
    })
    .from(complianceAlerts)
    .innerJoin(employees, eq(complianceAlerts.employeeId, employees.id))
    .where(and(
      eq(complianceAlerts.status, "open"),
      gte(complianceAlerts.createdAt, yesterday)
    ));
    
    for (const a of newAlerts) {
      items.push({
        category: "Alertas",
        title: a.alert.title,
        description: `Funcionário: ${a.employee.name} - Severidade: ${a.alert.severity}`,
        priority: a.alert.severity === 'critical' ? 'urgent' : a.alert.severity,
      });
    }
  }
  
  // 4. Pending checklist items
  if (prefs.notifyChecklistPending) {
    const pendingItems = await db.select({
      progress: employeeChecklistItems,
      item: checklistItems,
      checklist: employeeChecklists,
      employee: employees,
    })
    .from(employeeChecklistItems)
    .innerJoin(checklistItems, eq(employeeChecklistItems.itemId, checklistItems.id))
    .innerJoin(employeeChecklists, eq(employeeChecklistItems.empChecklistId, employeeChecklists.id))
    .innerJoin(employees, eq(employeeChecklists.employeeId, employees.id))
    .where(and(
      eq(employeeChecklistItems.status, "pending"),
      eq(employeeChecklistItems.assignedTo, userId)
    ));
    
    for (const p of pendingItems) {
      const isOverdue = p.progress.dueDate && new Date(p.progress.dueDate) < now;
      items.push({
        category: "Checklist",
        title: p.item.title,
        description: `Funcionário: ${p.employee.name}${isOverdue ? ' - ATRASADO' : ''}`,
        priority: isOverdue ? "high" : "medium",
      });
    }
  }
  
  // 5. Upcoming hearings (next 7 days)
  if (prefs.notifyLawsuitUpdate) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcomingHearings = await db.select({
      hearing: lawsuitHearings,
      lawsuit: laborLawsuits,
    })
    .from(lawsuitHearings)
    .innerJoin(laborLawsuits, eq(lawsuitHearings.lawsuitId, laborLawsuits.id))
    .where(and(
      eq(lawsuitHearings.status, "scheduled"),
      gte(lawsuitHearings.scheduledDate, now),
      lte(lawsuitHearings.scheduledDate, sevenDaysFromNow)
    ));
    
    for (const h of upcomingHearings) {
      items.push({
        category: "Jurídico",
        title: `Audiência: ${h.lawsuit.processNumber}`,
        description: `Data: ${formatDate(h.hearing.scheduledDate)} - ${h.hearing.hearingType}`,
        priority: "high",
      });
    }
  }
  
  if (items.length === 0) return null;
  
  // Create digest record
  const [digestResult] = await db.insert(notificationDigests).values({
    userId,
    type: "daily",
    periodStart: yesterday,
    periodEnd: now,
    itemsIncluded: items.length,
    summary: items,
    status: "pending",
  });
  
  // Send email
  const emailHtml = generateDigestEmailHtml(items, "Resumo Diário", user.name || "Usuário");
  
  try {
    await sendEmail({
      to: user.email,
      subject: `[HR Docs Pro] Resumo Diário - ${formatDate(now)}`,
      html: emailHtml,
    });
    
    await db.update(notificationDigests)
      .set({
        status: "sent",
        sentAt: new Date(),
      })
      .where(eq(notificationDigests.id, digestResult.insertId));
    
    return { success: true, itemCount: items.length };
  } catch (error) {
    await db.update(notificationDigests)
      .set({
        status: "failed",
        errorMessage: String(error),
      })
      .where(eq(notificationDigests.id, digestResult.insertId));
    
    return { success: false, error: String(error) };
  }
}

// Generate weekly digest
export async function generateWeeklyDigest(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.email) return null;
  
  const prefs = await getUserPreferences(userId);
  if (!prefs.weeklyDigest || !prefs.emailEnabled) return null;
  
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  // Collect summary items
  const summary = {
    newAlerts: 0,
    resolvedAlerts: 0,
    documentsExpiring: 0,
    vacationsExpiring: 0,
    checklistsCompleted: 0,
    checklistsPending: 0,
    newLawsuits: 0,
    upcomingHearings: 0,
  };
  
  // Count new alerts
  const newAlerts = await db.select()
    .from(complianceAlerts)
    .where(gte(complianceAlerts.createdAt, weekAgo));
  summary.newAlerts = newAlerts.length;
  
  // Count resolved alerts
  const resolvedAlerts = await db.select()
    .from(complianceAlerts)
    .where(and(
      eq(complianceAlerts.status, "resolved"),
      gte(complianceAlerts.resolvedAt, weekAgo)
    ));
  summary.resolvedAlerts = resolvedAlerts.length;
  
  // Count expiring documents (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringDocs = await db.select()
    .from(documents)
    .where(and(
      eq(documents.status, "valid"),
      gte(documents.expiresAt, now),
      lte(documents.expiresAt, thirtyDaysFromNow)
    ));
  summary.documentsExpiring = expiringDocs.length;
  
  // Count expiring vacations
  const expiringVacations = await db.select()
    .from(vacations)
    .where(and(
      eq(vacations.status, "available"),
      lte(vacations.concessivePeriodEnd, thirtyDaysFromNow)
    ));
  summary.vacationsExpiring = expiringVacations.length;
  
  // Count checklists
  const completedChecklists = await db.select()
    .from(employeeChecklists)
    .where(and(
      eq(employeeChecklists.status, "completed"),
      gte(employeeChecklists.completedAt, weekAgo)
    ));
  summary.checklistsCompleted = completedChecklists.length;
  
  const pendingChecklists = await db.select()
    .from(employeeChecklists)
    .where(eq(employeeChecklists.status, "in_progress"));
  summary.checklistsPending = pendingChecklists.length;
  
  // Count new lawsuits
  const newLawsuits = await db.select()
    .from(laborLawsuits)
    .where(gte(laborLawsuits.createdAt, weekAgo));
  summary.newLawsuits = newLawsuits.length;
  
  // Count upcoming hearings
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const upcomingHearings = await db.select()
    .from(lawsuitHearings)
    .where(and(
      eq(lawsuitHearings.status, "scheduled"),
      gte(lawsuitHearings.scheduledDate, now),
      lte(lawsuitHearings.scheduledDate, sevenDaysFromNow)
    ));
  summary.upcomingHearings = upcomingHearings.length;
  
  // Create digest record
  const [digestResult] = await db.insert(notificationDigests).values({
    userId,
    type: "weekly",
    periodStart: weekAgo,
    periodEnd: now,
    itemsIncluded: Object.values(summary).reduce((a, b) => a + b, 0),
    summary,
    status: "pending",
  });
  
  // Send email
  const emailHtml = generateWeeklyDigestEmailHtml(summary, user.name || "Usuário");
  
  try {
    await sendEmail({
      to: user.email,
      subject: `[HR Docs Pro] Resumo Semanal - ${formatDate(weekAgo)} a ${formatDate(now)}`,
      html: emailHtml,
    });
    
    await db.update(notificationDigests)
      .set({
        status: "sent",
        sentAt: new Date(),
      })
      .where(eq(notificationDigests.id, digestResult.insertId));
    
    return { success: true, summary };
  } catch (error) {
    await db.update(notificationDigests)
      .set({
        status: "failed",
        errorMessage: String(error),
      })
      .where(eq(notificationDigests.id, digestResult.insertId));
    
    return { success: false, error: String(error) };
  }
}

// Send digests to all users
export async function sendDailyDigestsToAllUsers() {
  const allUsers = await db.select().from(users);
  
  let sent = 0;
  let failed = 0;
  
  for (const user of allUsers) {
    try {
      const result = await generateDailyDigest(user.id);
      if (result?.success) sent++;
    } catch (error) {
      failed++;
    }
  }
  
  return { sent, failed };
}

export async function sendWeeklyDigestsToAllUsers() {
  const allUsers = await db.select().from(users);
  
  let sent = 0;
  let failed = 0;
  
  for (const user of allUsers) {
    try {
      const result = await generateWeeklyDigest(user.id);
      if (result?.success) sent++;
    } catch (error) {
      failed++;
    }
  }
  
  return { sent, failed };
}

// ============ HELPERS ============

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function generateDigestEmailHtml(items: Array<{ category: string; title: string; description: string; priority: string }>, title: string, userName: string): string {
  const groupedItems: Record<string, typeof items> = {};
  
  for (const item of items) {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  }
  
  let itemsHtml = '';
  for (const [category, categoryItems] of Object.entries(groupedItems)) {
    itemsHtml += `
      <h3 style="color: #1e40af; margin-top: 20px; margin-bottom: 10px;">${category}</h3>
      <ul style="margin: 0; padding-left: 20px;">
    `;
    
    for (const item of categoryItems) {
      const priorityColor = item.priority === 'urgent' ? '#dc2626' : 
                           item.priority === 'high' ? '#ea580c' : '#6b7280';
      itemsHtml += `
        <li style="margin-bottom: 8px;">
          <strong style="color: ${priorityColor};">${item.title}</strong>
          <br><span style="color: #6b7280; font-size: 14px;">${item.description}</span>
        </li>
      `;
    }
    
    itemsHtml += '</ul>';
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">${title}</h1>
        <p style="color: #bfdbfe; margin: 10px 0 0 0;">HR Docs Pro</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151;">Olá, <strong>${userName}</strong>!</p>
        <p style="color: #374151;">Aqui está seu resumo de pendências e atualizações:</p>
        
        ${itemsHtml}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Este é um email automático do HR Docs Pro. 
            Você pode configurar suas preferências de notificação no sistema.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateWeeklyDigestEmailHtml(summary: Record<string, number>, userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Resumo Semanal</h1>
        <p style="color: #bfdbfe; margin: 10px 0 0 0;">HR Docs Pro</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151;">Olá, <strong>${userName}</strong>!</p>
        <p style="color: #374151;">Aqui está o resumo da semana:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background: #e0e7ff;">
            <td style="padding: 12px; font-weight: bold; color: #1e40af;">Categoria</td>
            <td style="padding: 12px; font-weight: bold; color: #1e40af; text-align: center;">Quantidade</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Novos Alertas</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${summary.newAlerts > 0 ? '#dc2626' : '#16a34a'};">${summary.newAlerts}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Alertas Resolvidos</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #16a34a;">${summary.resolvedAlerts}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Documentos Expirando (30 dias)</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${summary.documentsExpiring > 0 ? '#ea580c' : '#16a34a'};">${summary.documentsExpiring}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Férias Vencendo (30 dias)</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${summary.vacationsExpiring > 0 ? '#ea580c' : '#16a34a'};">${summary.vacationsExpiring}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Checklists Concluídos</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #16a34a;">${summary.checklistsCompleted}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Checklists Pendentes</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${summary.checklistsPending > 0 ? '#ea580c' : '#16a34a'};">${summary.checklistsPending}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Novos Processos</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${summary.newLawsuits}</td>
          </tr>
          <tr>
            <td style="padding: 12px;">Audiências Próximas (7 dias)</td>
            <td style="padding: 12px; text-align: center; font-weight: bold; color: ${summary.upcomingHearings > 0 ? '#dc2626' : '#16a34a'};">${summary.upcomingHearings}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Este é um email automático do HR Docs Pro. 
            Você pode configurar suas preferências de notificação no sistema.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}


// ============ EXPORTED UTILITIES FOR TESTING ============

export function formatNotificationDate(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getNotificationPriority(type: string): "high" | "medium" | "low" {
  const highPriority = [
    "vacation_expiring",
    "document_expired",
    "checklist_overdue",
    "lawsuit_hearing",
    "deadline_critical",
  ];
  
  const lowPriority = [
    "checklist_completed",
    "document_signed",
    "vacation_approved",
    "benefit_assigned",
    "info",
  ];
  
  if (highPriority.includes(type)) return "high";
  if (lowPriority.includes(type)) return "low";
  return "medium";
}
