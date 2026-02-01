import { getDb } from "./db";
import { 
  documentTemplates, 
  templateItems, 
  documents, 
  documentTypes,
  employees,
  complianceAlerts
} from "../drizzle/schema";
import { eq, and, or, isNull } from "drizzle-orm";

/**
 * Service for automatic template application to employees based on position/department
 * 
 * Flow:
 * 1. When an employee is created/updated, find matching templates
 * 2. Apply base template (isBase = true) + position-specific template
 * 3. Create pending documents for each template item
 * 4. Allow adding extra documents later
 */

interface TemplateApplicationResult {
  success: boolean;
  appliedTemplates: number[];
  createdDocuments: number;
  errors: string[];
}

// Find templates that match an employee's position and department
export async function findMatchingTemplates(
  position: string | null,
  departmentId: number | null
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  // Get base template (applies to all)
  const baseTemplates = await db.select()
    .from(documentTemplates)
    .where(and(
      eq(documentTemplates.isBase, true),
      eq(documentTemplates.isActive, true)
    ));

  // Get position-specific templates
  let positionTemplates: any[] = [];
  if (position) {
    positionTemplates = await db.select()
      .from(documentTemplates)
      .where(and(
        eq(documentTemplates.position, position),
        eq(documentTemplates.isActive, true),
        eq(documentTemplates.isBase, false)
      ));
  }

  // Get department-specific templates
  let departmentTemplates: any[] = [];
  if (departmentId) {
    departmentTemplates = await db.select()
      .from(documentTemplates)
      .where(and(
        eq(documentTemplates.departmentId, departmentId),
        isNull(documentTemplates.position),
        eq(documentTemplates.isActive, true),
        eq(documentTemplates.isBase, false)
      ));
  }

  // Combine all templates (base first, then department, then position)
  return [...baseTemplates, ...departmentTemplates, ...positionTemplates];
}

// Apply templates to a new employee
export async function applyTemplatesToEmployee(
  employeeId: number,
  options?: {
    templateIds?: number[]; // Specific templates to apply (optional)
    skipExisting?: boolean; // Skip if employee already has documents
  }
): Promise<TemplateApplicationResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, appliedTemplates: [], createdDocuments: 0, errors: ["Database not available"] };
  }

  const result: TemplateApplicationResult = {
    success: true,
    appliedTemplates: [],
    createdDocuments: 0,
    errors: []
  };

  try {
    // Get employee data
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId));

    if (!employee) {
      return { success: false, appliedTemplates: [], createdDocuments: 0, errors: ["Employee not found"] };
    }

    // Check if employee already has documents (skip if option set)
    if (options?.skipExisting) {
      const existingDocs = await db.select()
        .from(documents)
        .where(eq(documents.employeeId, employeeId))
        .limit(1);

      if (existingDocs.length > 0) {
        return { 
          success: true, 
          appliedTemplates: [], 
          createdDocuments: 0, 
          errors: ["Employee already has documents, skipping template application"] 
        };
      }
    }

    // Find matching templates
    let templatesToApply: any[];
    if (options?.templateIds && options.templateIds.length > 0) {
      // Use specific templates
      templatesToApply = await db.select()
        .from(documentTemplates)
        .where(and(
          eq(documentTemplates.isActive, true),
          // Filter by provided IDs would need IN clause
        ));
      templatesToApply = templatesToApply.filter(t => options.templateIds!.includes(t.id));
    } else {
      // Auto-detect templates based on position/department
      templatesToApply = await findMatchingTemplates(
        employee.position,
        employee.departmentId
      );
    }

    // Apply each template
    for (const template of templatesToApply) {
      try {
        // Get template items
        const items = await db.select({
          item: templateItems,
          docType: documentTypes
        })
          .from(templateItems)
          .leftJoin(documentTypes, eq(templateItems.documentTypeId, documentTypes.id))
          .where(eq(templateItems.templateId, template.id));

        // Create pending documents for each item
        for (const { item, docType } of items) {
          if (!docType) continue;

          // Calculate expiration date if applicable
          let expiresAt: Date | null = null;
          if (item.hasExpiration && item.expirationDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + item.expirationDays);
          }

          // Check if document already exists for this employee/type
          const existingDoc = await db.select()
            .from(documents)
            .where(and(
              eq(documents.employeeId, employeeId),
              eq(documents.documentTypeId, item.documentTypeId)
            ))
            .limit(1);

          if (existingDoc.length > 0) {
            // Document already exists, skip
            continue;
          }

          // Create pending document entry
          await db.insert(documents).values({
            employeeId,
            documentTypeId: item.documentTypeId,
            fileName: `[PENDENTE] ${docType.name}`,
            fileUrl: "", // Empty until uploaded
            fileKey: "",
            status: "pending",
            expiresAt: expiresAt,
          });

          result.createdDocuments++;

          // Create alert for required documents
          if (item.isRequired) {
            await db.insert(complianceAlerts).values({
              employeeId,
              type: "document_missing",
              severity: "medium",
              title: `Documento Pendente: ${docType.name}`,
              description: `O documento "${docType.name}" é obrigatório e ainda não foi enviado.${expiresAt ? ` Vencimento: ${expiresAt.toLocaleDateString('pt-BR')}` : ''}`,
              status: "open",
            });
          }
        }

        result.appliedTemplates.push(template.id);
      } catch (error) {
        result.errors.push(`Error applying template ${template.id}: ${error}`);
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      appliedTemplates: result.appliedTemplates,
      createdDocuments: result.createdDocuments,
      errors: [...result.errors, String(error)]
    };
  }
}

// Add extra documents to an employee's folder (beyond template)
export async function addExtraDocumentToEmployee(
  employeeId: number,
  documentTypeId: number,
  options?: {
    isRequired?: boolean;
    expirationDays?: number;
  }
): Promise<{ success: boolean; documentId?: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get document type info
    const [docType] = await db.select()
      .from(documentTypes)
      .where(eq(documentTypes.id, documentTypeId));

    if (!docType) {
      return { success: false, error: "Document type not found" };
    }

    // Calculate expiration if provided
    let expiresAt: Date | null = null;
    if (options?.expirationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + options.expirationDays);
    }

    // Create pending document
    const result = await db.insert(documents).values({
      employeeId,
      documentTypeId,
      fileName: `[PENDENTE] ${docType.name}`,
      fileUrl: "",
      fileKey: "",
      status: "pending",
      expiresAt,
    }).$returningId();

    const documentId = result[0]?.id;

    // Create alert if required
    if (options?.isRequired) {
      await db.insert(complianceAlerts).values({
        employeeId,
        type: "document_missing",
        severity: "medium",
        title: `Documento Adicional Pendente: ${docType.name}`,
        description: `O documento "${docType.name}" foi adicionado como obrigatório.${expiresAt ? ` Vencimento: ${expiresAt.toLocaleDateString('pt-BR')}` : ''}`,
        status: "open",
      });
    }

    return { success: true, documentId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Get template application status for an employee
export async function getEmployeeTemplateStatus(employeeId: number): Promise<{
  appliedTemplates: any[];
  pendingDocuments: any[];
  completedDocuments: any[];
  completionPercentage: number;
}> {
  const db = await getDb();
  if (!db) {
    return { appliedTemplates: [], pendingDocuments: [], completedDocuments: [], completionPercentage: 0 };
  }

  try {
    // Get employee
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId));

    if (!employee) {
      return { appliedTemplates: [], pendingDocuments: [], completedDocuments: [], completionPercentage: 0 };
    }

    // Find matching templates
    const matchingTemplates = await findMatchingTemplates(
      employee.position,
      employee.departmentId
    );

    // Get all documents for employee
    const employeeDocs = await db.select({
      doc: documents,
      docType: documentTypes
    })
      .from(documents)
      .leftJoin(documentTypes, eq(documents.documentTypeId, documentTypes.id))
      .where(eq(documents.employeeId, employeeId));

    const pendingDocuments = employeeDocs.filter(d => 
      d.doc.status === "pending" || !d.doc.fileUrl
    );

    const completedDocuments = employeeDocs.filter(d => 
      d.doc.status === "valid" && d.doc.fileUrl
    );

    const total = employeeDocs.length;
    const completed = completedDocuments.length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      appliedTemplates: matchingTemplates,
      pendingDocuments: pendingDocuments.map(d => ({
        ...d.doc,
        documentType: d.docType
      })),
      completedDocuments: completedDocuments.map(d => ({
        ...d.doc,
        documentType: d.docType
      })),
      completionPercentage
    };
  } catch (error) {
    console.error("[Template] Error getting employee template status:", error);
    return { appliedTemplates: [], pendingDocuments: [], completedDocuments: [], completionPercentage: 0 };
  }
}

// Bulk apply templates to all employees without documents
export async function bulkApplyTemplates(): Promise<{
  success: boolean;
  processedEmployees: number;
  totalDocumentsCreated: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, processedEmployees: 0, totalDocumentsCreated: 0, errors: ["Database not available"] };
  }

  const result = {
    success: true,
    processedEmployees: 0,
    totalDocumentsCreated: 0,
    errors: [] as string[]
  };

  try {
    // Get all active employees
    const allEmployees = await db.select()
      .from(employees)
      .where(eq(employees.status, "active"));

    for (const employee of allEmployees) {
      const applicationResult = await applyTemplatesToEmployee(employee.id, {
        skipExisting: true
      });

      if (applicationResult.createdDocuments > 0) {
        result.processedEmployees++;
        result.totalDocumentsCreated += applicationResult.createdDocuments;
      }

      if (applicationResult.errors.length > 0) {
        result.errors.push(...applicationResult.errors.map(e => `Employee ${employee.id}: ${e}`));
      }
    }

    return result;
  } catch (error) {
    return {
      ...result,
      success: false,
      errors: [...result.errors, String(error)]
    };
  }
}

// Get available positions from employees table
export async function getAvailablePositions(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const positions = await db.selectDistinct({ position: employees.position })
      .from(employees)
      .where(eq(employees.status, "active"));

    return positions
      .map(p => p.position)
      .filter((p): p is string => p !== null);
  } catch (error) {
    console.error("[Template] Error getting positions:", error);
    return [];
  }
}
