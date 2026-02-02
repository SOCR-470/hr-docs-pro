CREATE TABLE `emp_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empChecklistId` int NOT NULL,
	`itemId` int NOT NULL,
	`status` enum('pending','in_progress','completed','skipped','blocked') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`assignedTo` int,
	`completedBy` int,
	`documentId` int,
	`genDocId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emp_checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emp_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`templateId` int NOT NULL,
	`type` enum('onboarding','offboarding') NOT NULL,
	`startDate` timestamp NOT NULL,
	`targetCompletionDate` timestamp,
	`completedAt` timestamp,
	`status` enum('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
	`totalItems` int DEFAULT 0,
	`completedItems` int DEFAULT 0,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emp_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `employee_checklist_items`;--> statement-breakpoint
DROP TABLE `employee_checklists`;--> statement-breakpoint
ALTER TABLE `emp_checklist_items` ADD CONSTRAINT `emp_checklist_items_empChecklistId_emp_checklists_id_fk` FOREIGN KEY (`empChecklistId`) REFERENCES `emp_checklists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklist_items` ADD CONSTRAINT `emp_checklist_items_itemId_checklist_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `checklist_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklist_items` ADD CONSTRAINT `emp_checklist_items_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklist_items` ADD CONSTRAINT `emp_checklist_items_completedBy_users_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklist_items` ADD CONSTRAINT `emp_checklist_items_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklist_items` ADD CONSTRAINT `emp_checklist_items_genDocId_generated_documents_id_fk` FOREIGN KEY (`genDocId`) REFERENCES `generated_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklists` ADD CONSTRAINT `emp_checklists_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklists` ADD CONSTRAINT `emp_checklists_templateId_checklist_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `checklist_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emp_checklists` ADD CONSTRAINT `emp_checklists_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;