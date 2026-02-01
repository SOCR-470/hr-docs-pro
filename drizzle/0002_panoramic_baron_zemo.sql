CREATE TABLE `compliance_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`departmentId` int,
	`referenceMonth` varchar(7) NOT NULL,
	`complianceScore` int DEFAULT 100,
	`totalAlerts` int DEFAULT 0,
	`criticalAlerts` int DEFAULT 0,
	`highAlerts` int DEFAULT 0,
	`mediumAlerts` int DEFAULT 0,
	`lowAlerts` int DEFAULT 0,
	`documentsComplete` int DEFAULT 0,
	`documentsTotal` int DEFAULT 0,
	`lateArrivals` int DEFAULT 0,
	`absences` int DEFAULT 0,
	`overtimeHours` decimal(5,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`recipientName` varchar(200) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientType` enum('accountant','lawyer','partner','other') DEFAULT 'other',
	`documentIds` json NOT NULL,
	`message` text,
	`accessCount` int DEFAULT 0,
	`lastAccessAt` timestamp,
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_shares_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `document_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`documentType` varchar(100) NOT NULL,
	`documentTitle` varchar(200) NOT NULL,
	`token` varchar(64) NOT NULL,
	`templateData` json,
	`generatedContent` text,
	`status` enum('pending','sent','signed','printed','cancelled') NOT NULL DEFAULT 'pending',
	`signedAt` timestamp,
	`signedName` varchar(200),
	`signedCpf` varchar(14),
	`signedBirthDate` varchar(10),
	`verificationCode` varchar(6),
	`verificationCodeExpiresAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	`signedDocumentUrl` text,
	`signedDocumentKey` varchar(255),
	`printedAt` timestamp,
	`printedBy` int,
	`uploadedSignedUrl` text,
	`sentAt` timestamp,
	`sentBy` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_signatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_signatures_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `document_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`position` varchar(100),
	`departmentId` int,
	`parentTemplateId` int,
	`isBase` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(200),
	`subject` varchar(500) NOT NULL,
	`templateType` varchar(50) NOT NULL,
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`status` enum('pending','sent','failed','bounced') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`errorMessage` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lgpd_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`termVersion` varchar(20) NOT NULL DEFAULT '1.0',
	`termHash` varchar(64),
	`status` enum('pending','signed','revoked','expired') NOT NULL DEFAULT 'pending',
	`signedAt` timestamp,
	`signedName` varchar(200),
	`signedCpf` varchar(14),
	`signedBirthDate` varchar(10),
	`verificationCode` varchar(6),
	`verificationCodeExpiresAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	`documentUrl` text,
	`documentKey` varchar(255),
	`sentAt` timestamp,
	`sentBy` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lgpd_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `lgpd_consents_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `predictive_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`analysisDate` timestamp NOT NULL DEFAULT (now()),
	`riskScore` int DEFAULT 0,
	`riskLevel` enum('low','medium','high','critical') DEFAULT 'low',
	`predictedIssues` json,
	`patterns` json,
	`recommendations` json,
	`factors` json,
	`validUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `predictive_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`documentTypeId` int NOT NULL,
	`isRequired` boolean DEFAULT true,
	`hasExpiration` boolean DEFAULT false,
	`expirationDays` int,
	`alertDaysBefore` int DEFAULT 30,
	`requiresSignature` boolean DEFAULT false,
	`isAutoGenerated` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`condition` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `compliance_history` ADD CONSTRAINT `compliance_history_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_history` ADD CONSTRAINT `compliance_history_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_signatures` ADD CONSTRAINT `document_signatures_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_signatures` ADD CONSTRAINT `document_signatures_printedBy_users_id_fk` FOREIGN KEY (`printedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_signatures` ADD CONSTRAINT `document_signatures_sentBy_users_id_fk` FOREIGN KEY (`sentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_templates` ADD CONSTRAINT `document_templates_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_log` ADD CONSTRAINT `email_log_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lgpd_consents` ADD CONSTRAINT `lgpd_consents_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lgpd_consents` ADD CONSTRAINT `lgpd_consents_sentBy_users_id_fk` FOREIGN KEY (`sentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictive_analysis` ADD CONSTRAINT `predictive_analysis_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_items` ADD CONSTRAINT `template_items_templateId_document_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `document_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_items` ADD CONSTRAINT `template_items_documentTypeId_document_types_id_fk` FOREIGN KEY (`documentTypeId`) REFERENCES `document_types`(`id`) ON DELETE no action ON UPDATE no action;