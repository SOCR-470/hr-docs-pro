CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`recurringDocId` int,
	`documentId` int,
	`type` enum('late_arrival','early_departure','unauthorized_overtime','missing_punch','absence_without_justification','payslip_calculation_error','irregular_discount','salary_mismatch','document_expired','document_missing','document_expiring_soon') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`title` varchar(200) NOT NULL,
	`description` text,
	`details` json,
	`status` enum('open','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'open',
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`category` enum('admission','recurring','compliance','personal') NOT NULL,
	`isRequired` boolean DEFAULT true,
	`validityDays` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`documentTypeId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`status` enum('pending','valid','expired','rejected') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp,
	`extractedData` json,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`position` varchar(100),
	`departmentId` int,
	`admissionDate` timestamp,
	`salary` decimal(10,2),
	`workHours` varchar(50) DEFAULT '08:00-17:00',
	`status` enum('active','inactive','on_leave') NOT NULL DEFAULT 'active',
	`complianceScore` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_cpf_unique` UNIQUE(`cpf`)
);
--> statement-breakpoint
CREATE TABLE `external_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`documentTypeId` int,
	`token` varchar(64) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(200),
	`recipientType` enum('accountant','lawyer','partner','other') DEFAULT 'other',
	`message` text,
	`status` enum('pending','sent','uploaded','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`uploadedDocumentId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `external_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `external_requests_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `recurring_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`type` enum('timesheet','payslip') NOT NULL,
	`referenceDate` timestamp NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`ocrText` text,
	`extractedData` json,
	`aiAnalysis` json,
	`complianceStatus` enum('compliant','warning','non_compliant','pending') NOT NULL DEFAULT 'pending',
	`complianceScore` int DEFAULT 100,
	`processedAt` timestamp,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recurring_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_alerts` ADD CONSTRAINT `compliance_alerts_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_alerts` ADD CONSTRAINT `compliance_alerts_recurringDocId_recurring_documents_id_fk` FOREIGN KEY (`recurringDocId`) REFERENCES `recurring_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_alerts` ADD CONSTRAINT `compliance_alerts_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_alerts` ADD CONSTRAINT `compliance_alerts_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_documentTypeId_document_types_id_fk` FOREIGN KEY (`documentTypeId`) REFERENCES `document_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `external_requests` ADD CONSTRAINT `external_requests_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `external_requests` ADD CONSTRAINT `external_requests_documentTypeId_document_types_id_fk` FOREIGN KEY (`documentTypeId`) REFERENCES `document_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `external_requests` ADD CONSTRAINT `external_requests_uploadedDocumentId_documents_id_fk` FOREIGN KEY (`uploadedDocumentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `external_requests` ADD CONSTRAINT `external_requests_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_documents` ADD CONSTRAINT `recurring_documents_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_documents` ADD CONSTRAINT `recurring_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;