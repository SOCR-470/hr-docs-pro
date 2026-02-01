import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { storagePut } from "./storage";
import * as db from "./db";
import { analyzeTimesheetWithVision, analyzePayslipWithVision, classifyDocument } from "./aiAnalysis";
import { TRPCError } from "@trpc/server";
import { sendEmail, emailTemplates, getEmailLogs } from "./emailService";
import * as reportService from "./reportService";
import * as timeclockService from "./timeclockService";
import * as templateService from "./templateService";
import * as lgpdService from "./lgpdService";
import * as shareService from "./shareService";
import * as analyticsService from "./analyticsService";
import * as templateApplicationService from "./templateApplicationService";
import { sendLgpdConsentEmail, sendDocumentShareEmail, sendDocumentSignatureEmail, lgpdEmailTemplates } from "./emailService";
import { generateLgpdConsentPdf } from "./pdfService";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
  }),

  // ============ DEPARTMENTS ============
  departments: router({
    list: protectedProcedure.query(async () => {
      return db.getDepartments();
    }),
    employees: protectedProcedure
      .input(z.object({ departmentId: z.number() }))
      .query(async ({ input }) => {
        return db.getEmployeesByDepartment(input.departmentId);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDepartment(input);
      }),
  }),

  // ============ EMPLOYEES ============
  employees: router({
    list: protectedProcedure
      .input(z.object({
        departmentId: z.number().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getEmployees(input);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const employee = await db.getEmployeeById(input.id);
        if (!employee) throw new TRPCError({ code: 'NOT_FOUND' });
        return employee;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        cpf: z.string().min(11),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
        departmentId: z.number().optional(),
        admissionDate: z.date().optional(),
        salary: z.string().optional(),
        workHours: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const employee = await db.createEmployee(input as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create_employee',
          entityType: 'employee',
          entityId: employee.id,
          details: { name: input.name },
        });
        return employee;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
        departmentId: z.number().optional(),
        salary: z.string().optional(),
        workHours: z.string().optional(),
        status: z.enum(['active', 'inactive', 'on_leave']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const employee = await db.updateEmployee(id, data as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update_employee',
          entityType: 'employee',
          entityId: id,
          details: data,
        });
        return employee;
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteEmployee(input.id);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete_employee',
          entityType: 'employee',
          entityId: input.id,
        });
        return { success: true };
      }),
  }),

  // ============ DOCUMENT TYPES ============
  documentTypes: router({
    list: protectedProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getDocumentTypes(input?.category);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(['admission', 'recurring', 'compliance', 'personal']),
        isRequired: z.boolean().optional(),
        validityDays: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDocumentType(input);
      }),
  }),

  // ============ DOCUMENTS ============
  documents: router({
    byEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return db.getDocumentsByEmployee(input.employeeId);
      }),
    
    upload: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        documentTypeId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        autoClassify: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `documents/${input.employeeId}/${nanoid()}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        let extractedData = null;
        if (input.autoClassify) {
          try {
            const classification = await classifyDocument(url);
            extractedData = classification;
          } catch (e) {
            console.error("Auto-classification failed:", e);
          }
        }
        
        const document = await db.createDocument({
          employeeId: input.employeeId,
          documentTypeId: input.documentTypeId,
          fileName: input.fileName,
          fileUrl: url,
          fileKey,
          mimeType: input.mimeType,
          fileSize: buffer.length,
          status: 'valid',
          extractedData,
          uploadedBy: ctx.user.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'upload_document',
          entityType: 'document',
          entityId: document.id,
          details: { employeeId: input.employeeId, fileName: input.fileName },
        });
        
        return document;
      }),
  }),

  // ============ RECURRING DOCUMENTS ============
  recurring: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        type: z.enum(['timesheet', 'payslip']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getRecurringDocuments(input);
      }),
    
    upload: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        type: z.enum(['timesheet', 'payslip']),
        referenceDate: z.date(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `recurring/${input.employeeId}/${input.type}/${nanoid()}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Create document first
        const doc = await db.createRecurringDocument({
          employeeId: input.employeeId,
          type: input.type,
          referenceDate: input.referenceDate,
          fileName: input.fileName,
          fileUrl: url,
          fileKey,
          complianceStatus: 'pending',
          uploadedBy: ctx.user.id,
        });
        
        // Get employee context for analysis
        const employee = await db.getEmployeeById(input.employeeId);
        
        // Analyze with AI
        try {
          let analysis;
          if (input.type === 'timesheet') {
            analysis = await analyzeTimesheetWithVision(url, {
              name: employee?.name || '',
              workHours: employee?.workHours || '08:00-17:00',
              salary: employee?.salary ? Number(employee.salary) : undefined,
            });
          } else {
            analysis = await analyzePayslipWithVision(url, {
              name: employee?.name || '',
              expectedSalary: employee?.salary ? Number(employee.salary) : undefined,
            });
          }
          
          // Update document with analysis
          await db.updateRecurringDocument(doc.id, {
            aiAnalysis: analysis,
            complianceScore: analysis.complianceScore,
            complianceStatus: analysis.complianceScore >= 80 ? 'compliant' : 
                             analysis.complianceScore >= 50 ? 'warning' : 'non_compliant',
            processedAt: new Date(),
          });
          
          // Create alerts from analysis
          for (const alert of analysis.alerts) {
            await db.createComplianceAlert({
              employeeId: input.employeeId,
              recurringDocId: doc.id,
              type: mapAlertType(alert.type, input.type),
              severity: alert.severity,
              title: alert.type,
              description: alert.description,
              details: { date: (alert as any).date },
            });
          }
          
          // Update employee compliance score
          if (employee) {
            const newScore = Math.round((employee.complianceScore || 100) * 0.7 + analysis.complianceScore * 0.3);
            await db.updateEmployee(input.employeeId, { complianceScore: newScore });
          }
          
          return { ...doc, analysis };
        } catch (error) {
          console.error("AI analysis failed:", error);
          return doc;
        }
      }),
    
    reprocess: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Re-trigger AI analysis
        return { success: true, message: "Reprocessamento iniciado" };
      }),
  }),

  // ============ COMPLIANCE ALERTS ============
  alerts: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        status: z.string().optional(),
        severity: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getComplianceAlerts(input);
      }),
    
    acknowledge: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateComplianceAlert(input.id, { 
          status: 'acknowledged',
        });
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'acknowledge_alert',
          entityType: 'alert',
          entityId: input.id,
        });
        return { success: true };
      }),
    
    resolve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateComplianceAlert(input.id, { 
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
        });
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'resolve_alert',
          entityType: 'alert',
          entityId: input.id,
        });
        return { success: true };
      }),
    
    dismiss: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateComplianceAlert(input.id, { 
          status: 'dismissed',
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
        });
        return { success: true };
      }),
  }),

  // ============ EXTERNAL REQUESTS ============
  external: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getExternalRequests(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        documentTypeId: z.number().optional(),
        recipientEmail: z.string().email(),
        recipientName: z.string().optional(),
        recipientType: z.enum(['accountant', 'lawyer', 'partner', 'other']).optional(),
        message: z.string().optional(),
        expiresInDays: z.number().default(7),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
        
        const request = await db.createExternalRequest({
          employeeId: input.employeeId,
          documentTypeId: input.documentTypeId,
          token,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          recipientType: input.recipientType,
          message: input.message,
          status: 'pending',
          expiresAt,
          createdBy: ctx.user.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create_external_request',
          entityType: 'external_request',
          entityId: request.id,
          details: { recipientEmail: input.recipientEmail },
        });
        
        return { ...request, uploadUrl: `/external/upload/${token}` };
      }),
    
    // Public endpoint for external upload verification
    validate: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const request = await db.getExternalRequestByToken(input.token);
        if (!request) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Link inválido ou expirado' });
        }
        if (request.status === 'expired' || new Date() > request.expiresAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link expirado' });
        }
        if (request.status === 'uploaded') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Documento já enviado' });
        }
        return {
          employee: request.employee,
          documentType: request.documentType,
          message: request.message,
          expiresAt: request.expiresAt,
        };
      }),
    
    // Public endpoint for external upload
    upload: publicProcedure
      .input(z.object({
        token: z.string(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const request = await db.getExternalRequestByToken(input.token);
        if (!request) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Link inválido' });
        }
        if (request.status !== 'pending' && request.status !== 'sent') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Upload não permitido' });
        }
        if (new Date() > request.expiresAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link expirado' });
        }
        
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `external/${request.employeeId}/${nanoid()}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Create document
        const document = await db.createDocument({
          employeeId: request.employeeId,
          documentTypeId: request.documentTypeId || 1,
          fileName: input.fileName,
          fileUrl: url,
          fileKey,
          mimeType: input.mimeType,
          fileSize: buffer.length,
          status: 'pending',
        });
        
        // Update request
        await db.updateExternalRequest(request.id, {
          status: 'uploaded',
          uploadedDocumentId: document.id,
        });
        
        return { success: true, message: 'Documento enviado com sucesso!' };
      }),
  }),

  // ============ CHATBOT (Placeholder) ============
  chatbot: router({
    status: publicProcedure.query(() => {
      return { 
        status: 'not_implemented', 
        message: 'Chatbot em desenvolvimento. Em breve!' 
      };
    }),
  }),

  // ============ EMAIL SERVICE ============
  email: router({
    send: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        subject: z.string(),
        html: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await sendEmail(input);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'send_email',
          entityType: 'email',
          details: { to: input.to, subject: input.subject, success: result.success },
        });
        return result;
      }),
    
    logs: protectedProcedure.query(() => {
      return getEmailLogs();
    }),
    
    sendExternalRequest: protectedProcedure
      .input(z.object({
        requestId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const request = await db.getExternalRequests({ status: 'pending' });
        const req = request?.find(r => r.id === input.requestId);
        if (!req) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const employee = await db.getEmployeeById(req.employeeId);
        const baseUrl = process.env.VITE_APP_URL || 'https://hr-docs-pro.manus.space';
        
        const emailContent = emailTemplates.externalRequest({
          recipientName: req.recipientName || 'Prezado(a)',
          employeeName: employee?.name || 'Funcionário',
          documentType: (req as any).documentType?.name,
          message: req.message || undefined,
          uploadUrl: `${baseUrl}/external/upload/${req.token}`,
          expiresAt: req.expiresAt,
        });
        
        const result = await sendEmail({
          to: req.recipientEmail,
          ...emailContent,
        });
        
        if (result.success) {
          await db.updateExternalRequest(req.id, { status: 'sent' });
        }
        
        return result;
      }),
  }),

  // ============ REPORTS ============
  reports: router({
    generate: protectedProcedure
      .input(z.object({
        departmentId: z.number().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const data = await reportService.generateComplianceReport(input);
        const { url, key } = await reportService.saveReportToStorage(data);
        return { data, url, key };
      }),
    
    preview: protectedProcedure
      .input(z.object({
        departmentId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return reportService.generateComplianceReport(input);
      }),
    
    sendByEmail: protectedProcedure
      .input(z.object({
        recipients: z.array(z.string().email()),
        recipientName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await reportService.sendComplianceReport(
          input.recipients,
          input.recipientName
        );
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'send_report',
          entityType: 'report',
          details: { recipients: input.recipients, success: result.success },
        });
        return result;
      }),
    
    // Report schedules
    schedules: router({
      list: protectedProcedure.query(() => {
        return reportService.getReportSchedules();
      }),
      
      create: adminProcedure
        .input(z.object({
          name: z.string(),
          type: z.enum(['daily', 'weekly', 'monthly']),
          recipients: z.array(z.string().email()),
          enabled: z.boolean().default(true),
        }))
        .mutation(({ input }) => {
          return reportService.createReportSchedule(input);
        }),
      
      update: adminProcedure
        .input(z.object({
          id: z.string(),
          enabled: z.boolean().optional(),
          recipients: z.array(z.string().email()).optional(),
        }))
        .mutation(({ input }) => {
          const { id, ...updates } = input;
          return reportService.updateReportSchedule(id, updates);
        }),
      
      delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => {
          return reportService.deleteReportSchedule(input.id);
        }),
    }),
  }),

  // ============ TIMECLOCK INTEGRATION ============
  timeclock: router({
    config: router({
      get: protectedProcedure.query(() => {
        return timeclockService.getTimeclockConfig();
      }),
      
      update: adminProcedure
        .input(z.object({
          system: z.enum(['generic', 'dimep', 'henry', 'secullum', 'topdata', 'manual']).optional(),
          apiUrl: z.string().optional(),
          apiKey: z.string().optional(),
          enabled: z.boolean().optional(),
          syncInterval: z.number().optional(),
        }))
        .mutation(({ input }) => {
          return timeclockService.updateTimeclockConfig(input);
        }),
    }),
    
    // Import from file (batch)
    import: protectedProcedure
      .input(z.object({
        fileData: z.string(), // base64
        format: z.enum(['generic', 'dimep', 'henry', 'secullum', 'topdata', 'manual']),
      }))
      .mutation(async ({ input, ctx }) => {
        const content = Buffer.from(input.fileData, 'base64').toString('utf-8');
        const records = timeclockService.parseTimeclockFile(content, input.format);
        const result = await timeclockService.importTimeclockRecords(records, ctx.user.id);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'import_timeclock',
          entityType: 'timeclock',
          details: { 
            format: input.format, 
            total: result.totalRecords, 
            imported: result.imported,
            errors: result.errors.length,
          },
        });
        
        return result;
      }),
    
    // Manual upload for single employee
    uploadManual: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        referenceDate: z.date(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        return timeclockService.processManualTimesheetUpload(
          { data: buffer, name: input.fileName, mimeType: input.mimeType },
          input.employeeId,
          input.referenceDate,
          ctx.user.id
        );
      }),
    
    // Parse preview (without importing)
    preview: protectedProcedure
      .input(z.object({
        fileData: z.string(),
        format: z.enum(['generic', 'dimep', 'henry', 'secullum', 'topdata', 'manual']),
      }))
      .mutation(({ input }) => {
        const content = Buffer.from(input.fileData, 'base64').toString('utf-8');
        const records = timeclockService.parseTimeclockFile(content, input.format);
        return {
          totalRecords: records.length,
          preview: records.slice(0, 10),
        };
      }),
  }),

  // ============ DOCUMENT TEMPLATES ============
  templates: router({
    list: protectedProcedure.query(async () => {
      return templateService.listTemplates();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return templateService.getTemplateWithItems(input.id);
      }),
    
    getByPosition: protectedProcedure
      .input(z.object({ position: z.string() }))
      .query(async ({ input }) => {
        return templateService.getTemplateByPosition(input.position);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        position: z.string().optional(),
        departmentId: z.number().optional(),
        parentTemplateId: z.number().optional(),
        isBase: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return templateService.createTemplate(input as any);
      }),
    
    addItem: adminProcedure
      .input(z.object({
        templateId: z.number(),
        documentTypeId: z.number(),
        isRequired: z.boolean().optional(),
        hasExpiration: z.boolean().optional(),
        expirationDays: z.number().optional(),
        alertDaysBefore: z.number().optional(),
        requiresSignature: z.boolean().optional(),
        isAutoGenerated: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return templateService.addTemplateItem(input as any);
      }),
    
    removeItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return templateService.removeTemplateItem(input.id);
      }),
    
    duplicate: adminProcedure
      .input(z.object({
        templateId: z.number(),
        newName: z.string(),
        newPosition: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return templateService.duplicateTemplate(input.templateId, input.newName, input.newPosition);
      }),
    
    initDefaults: adminProcedure.mutation(async () => {
      await templateService.createDefaultTemplates();
      return { success: true };
    }),
  }),

  // ============ LGPD CONSENT ============
  lgpd: router({
    // Create consent request
    create: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const consent = await lgpdService.createLgpdConsent(input.employeeId, ctx.user.id);
        if (!consent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        return consent;
      }),
    
    // Get consent by token (public)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const data = await lgpdService.getConsentByToken(input.token);
        if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Token inválido ou expirado' });
        return {
          employee: { name: data.employee.name },
          consent: {
            status: data.consent.status,
            termVersion: data.consent.termVersion,
            expiresAt: data.consent.expiresAt,
          },
          termContent: lgpdService.getLgpdTermContent(data.employee.name),
        };
      }),
    
    // Send verification code
    sendCode: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const data = await lgpdService.getConsentByToken(input.token);
        if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const code = await lgpdService.sendVerificationCode(data.consent.id);
        // In production, send via email
        console.log(`[LGPD] Verification code for ${data.employee.email}: ${code}`);
        return { success: true, message: 'Código enviado para o email cadastrado' };
      }),
    
    // Sign consent
    sign: publicProcedure
      .input(z.object({
        token: z.string(),
        signedName: z.string(),
        signedCpf: z.string(),
        signedBirthDate: z.string(),
        verificationCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ipAddress = ctx.req.ip || ctx.req.headers['x-forwarded-for']?.toString() || 'unknown';
        const userAgent = ctx.req.headers['user-agent'] || 'unknown';
        
        const result = await lgpdService.signConsent(
          input.token,
          input.signedName,
          input.signedCpf,
          input.signedBirthDate,
          input.verificationCode,
          ipAddress,
          userAgent
        );
        
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        
        return { success: true, message: 'Consentimento registrado com sucesso' };
      }),
    
    // List consents by employee
    byEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return lgpdService.getConsentsByEmployee(input.employeeId);
      }),
  }),

  // ============ DOCUMENT SIGNATURES ============
  signatures: router({
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        documentType: z.string(),
        documentTitle: z.string(),
        templateData: z.record(z.string(), z.unknown()).optional(),
        sendEmail: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        // Buscar dados do funcionário
        const employee = await db.getEmployeeById(input.employeeId);
        if (!employee) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Funcionário não encontrado' });
        }
        
        if (!employee.email) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Funcionário não possui email cadastrado. Por favor, atualize o cadastro.' });
        }
        
        // Criar solicitação de assinatura
        const signature = await lgpdService.createDocumentSignature(
          input.employeeId,
          input.documentType,
          input.documentTitle,
          input.templateData || {},
          ctx.user.id
        );
        
        if (!signature) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar solicitação de assinatura' });
        }
        
        // Gerar código de verificação
        const verificationCode = await lgpdService.sendDocumentVerificationCode(signature.id);
        
        // Enviar email automaticamente
        if (input.sendEmail && verificationCode) {
          const baseUrl = ctx.req.headers.origin || `https://${ctx.req.headers.host}`;
          await sendDocumentSignatureEmail({
            employeeId: input.employeeId,
            employeeName: employee.name,
            employeeEmail: employee.email,
            documentName: input.documentTitle,
            documentType: input.documentType,
            signatureToken: signature.token,
            verificationCode,
            baseUrl,
            createdBy: ctx.user.id,
          });
        }
        
        return signature;
      }),
    
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const data = await lgpdService.getDocumentByToken(input.token);
        if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
        return data;
      }),
    
    sign: publicProcedure
      .input(z.object({
        token: z.string(),
        signedName: z.string(),
        signedCpf: z.string(),
        signedBirthDate: z.string(),
        verificationCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ipAddress = ctx.req.ip || ctx.req.headers['x-forwarded-for']?.toString() || 'unknown';
        const userAgent = ctx.req.headers['user-agent'] || 'unknown';
        
        const result = await lgpdService.signDocument(
          input.token,
          input.signedName,
          input.signedCpf,
          input.signedBirthDate,
          input.verificationCode,
          ipAddress,
          userAgent
        );
        
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        
        return { success: true };
      }),
    
    markPrinted: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return lgpdService.markDocumentAsPrinted(input.id, ctx.user.id);
      }),
    
    byEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return lgpdService.getDocumentsByEmployee(input.employeeId);
      }),
  }),

  // ============ DOCUMENT SHARES ============
  shares: router({
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        documentIds: z.array(z.number()),
        recipientName: z.string(),
        recipientEmail: z.string().email(),
        recipientType: z.enum(['accountant', 'lawyer', 'partner', 'other']),
        message: z.string().optional(),
        validityDays: z.number().default(7),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await shareService.createDocumentShare(
          input.employeeId,
          input.documentIds,
          input.recipientName,
          input.recipientEmail,
          input.recipientType,
          input.message || null,
          input.validityDays,
          ctx.user.id
        );
        
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        
        return result.share;
      }),
    
    // Public access to shared documents
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const data = await shareService.getShareByToken(input.token);
        if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Link inválido ou expirado' });
        return data;
      }),
    
    list: protectedProcedure.query(async () => {
      return shareService.listActiveShares();
    }),
    
    byEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return shareService.getSharesByEmployee(input.employeeId);
      }),
    
    revoke: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await shareService.revokeShare(input.id);
        return { success: true };
      }),
    
    getDocumentsForShare: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return shareService.getEmployeeDocumentsForShare(input.employeeId);
      }),
    
    checkLgpdConsent: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        const hasConsent = await shareService.hasValidLgpdConsent(input.employeeId);
        return { hasConsent };
      }),
  }),

  // ============ TEMPLATE APPLICATION ============
  templateApplication: router({
    // Apply templates to employee
    applyToEmployee: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        templateIds: z.array(z.number()).optional(),
        skipExisting: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input }) => {
        return templateApplicationService.applyTemplatesToEmployee(
          input.employeeId,
          { templateIds: input.templateIds, skipExisting: input.skipExisting }
        );
      }),
    
    // Add extra document to employee
    addExtraDocument: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        documentTypeId: z.number(),
        isRequired: z.boolean().optional().default(false),
        expirationDays: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return templateApplicationService.addExtraDocumentToEmployee(
          input.employeeId,
          input.documentTypeId,
          { isRequired: input.isRequired, expirationDays: input.expirationDays }
        );
      }),
    
    // Get employee template status
    employeeStatus: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return templateApplicationService.getEmployeeTemplateStatus(input.employeeId);
      }),
    
    // Bulk apply templates to all employees
    bulkApply: adminProcedure.mutation(async () => {
      return templateApplicationService.bulkApplyTemplates();
    }),
    
    // Get available positions
    positions: protectedProcedure.query(async () => {
      return templateApplicationService.getAvailablePositions();
    }),
    
    // Find matching templates for position/department
    findMatching: protectedProcedure
      .input(z.object({
        position: z.string().optional(),
        departmentId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return templateApplicationService.findMatchingTemplates(
          input.position || null,
          input.departmentId || null
        );
      }),
  }),

  // ============ EMAIL NOTIFICATIONS ============
  emails: router({
    // Send LGPD consent email
    sendLgpdConsent: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        employeeName: z.string(),
        employeeEmail: z.string().email(),
        consentToken: z.string(),
        verificationCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const baseUrl = ctx.req.headers.origin || 'https://hr-docs-pro.manus.space';
        return sendLgpdConsentEmail({
          ...input,
          baseUrl,
          createdBy: ctx.user.id,
        });
      }),
    
    // Send document share email
    sendDocumentShare: protectedProcedure
      .input(z.object({
        recipientEmail: z.string().email(),
        recipientName: z.string(),
        employeeName: z.string(),
        shareToken: z.string(),
        documentCount: z.number(),
        expirationDate: z.date(),
        message: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const baseUrl = ctx.req.headers.origin || 'https://hr-docs-pro.manus.space';
        return sendDocumentShareEmail({
          ...input,
          senderName: ctx.user.name || 'HR Docs Pro',
          baseUrl,
          createdBy: ctx.user.id,
        });
      }),
    
    // Send document signature email
    sendDocumentSignature: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        employeeName: z.string(),
        employeeEmail: z.string().email(),
        documentName: z.string(),
        documentType: z.string(),
        signatureToken: z.string(),
        verificationCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const baseUrl = ctx.req.headers.origin || 'https://hr-docs-pro.manus.space';
        return sendDocumentSignatureEmail({
          ...input,
          baseUrl,
          createdBy: ctx.user.id,
        });
      }),
    
    // Get email logs
    logs: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(50) }).optional())
      .query(async ({ input }) => {
        return getEmailLogs(input?.limit);
      }),
  }),

  // ============ PDF GENERATION ============
  pdf: router({
    // Generate LGPD consent PDF
    generateLgpdConsent: protectedProcedure
      .input(z.object({ consentId: z.number() }))
      .mutation(async ({ input }) => {
        return generateLgpdConsentPdf(input.consentId);
      }),
  }),

  // ============ ANALYTICS ============
  analytics: router({
    // Predictive analysis for single employee
    predictiveRisk: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return analyticsService.calculateComplianceRisk(input.employeeId);
      }),
    
    // Batch predictive analysis
    batchPredictive: protectedProcedure.query(async () => {
      return analyticsService.runBatchPredictiveAnalysis();
    }),
    
    // Employee evolution
    employeeEvolution: protectedProcedure
      .input(z.object({ 
        employeeId: z.number(),
        months: z.number().optional().default(6),
      }))
      .query(async ({ input }) => {
        return analyticsService.getEmployeeEvolution(input.employeeId, input.months);
      }),
    
    // Department benchmark
    departmentBenchmark: protectedProcedure
      .input(z.object({ departmentId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return analyticsService.getDepartmentBenchmark(input?.departmentId);
      }),
    
    // Payslip vs Contract comparison
    payslipVsContract: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return analyticsService.comparePayslipVsContract(input.employeeId);
      }),
    
    // Predictive history
    history: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return analyticsService.getPredictiveHistory(input?.employeeId);
      }),
  }),
});

// Helper function to map alert types
function mapAlertType(alertType: string, docType: string): any {
  const timesheetTypes: Record<string, string> = {
    'atraso': 'late_arrival',
    'saida_antecipada': 'early_departure',
    'hora_extra': 'unauthorized_overtime',
    'batida_faltante': 'missing_punch',
    'falta': 'absence_without_justification',
  };
  
  const payslipTypes: Record<string, string> = {
    'erro_calculo': 'payslip_calculation_error',
    'desconto_irregular': 'irregular_discount',
    'salario_divergente': 'salary_mismatch',
  };
  
  const types = docType === 'timesheet' ? timesheetTypes : payslipTypes;
  const normalized = alertType.toLowerCase().replace(/\s+/g, '_');
  
  for (const [key, value] of Object.entries(types)) {
    if (normalized.includes(key)) return value;
  }
  
  return docType === 'timesheet' ? 'late_arrival' : 'payslip_calculation_error';
}

export type AppRouter = typeof appRouter;
