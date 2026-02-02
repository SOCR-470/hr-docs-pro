CREATE TABLE `company_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(200) NOT NULL,
	`tradeName` varchar(200),
	`cnpj` varchar(18) NOT NULL,
	`stateRegistration` varchar(20),
	`municipalRegistration` varchar(20),
	`address` varchar(300),
	`addressNumber` varchar(20),
	`addressComplement` varchar(100),
	`neighborhood` varchar(100),
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`phone` varchar(20),
	`email` varchar(320),
	`website` varchar(200),
	`legalRepName` varchar(200),
	`legalRepCpf` varchar(14),
	`legalRepPosition` varchar(100),
	`logoUrl` text,
	`logoKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` enum('admission','safety','benefits','confidentiality','termination','other') NOT NULL DEFAULT 'other',
	`content` text NOT NULL,
	`availableVariables` json,
	`requiresSignature` boolean DEFAULT true,
	`requiresWitness` boolean DEFAULT false,
	`witnessCount` int DEFAULT 0,
	`version` varchar(20) DEFAULT '1.0',
	`isActive` boolean DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`modelId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`generatedContent` text NOT NULL,
	`filledData` json,
	`status` enum('draft','pending_signature','signed','printed','uploaded','cancelled','expired') NOT NULL DEFAULT 'draft',
	`sentAt` timestamp,
	`sentTo` varchar(320),
	`sentBy` int,
	`verificationCode` varchar(6),
	`verificationCodeExpiresAt` timestamp,
	`verificationAttempts` int DEFAULT 0,
	`signedAt` timestamp,
	`signedName` varchar(200),
	`signedCpf` varchar(14),
	`signedBirthDate` varchar(10),
	`signatureImage` text,
	`signatureType` enum('drawn','typed','uploaded'),
	`ipAddress` varchar(45),
	`userAgent` text,
	`geoLocation` varchar(100),
	`witnesses` json,
	`pdfUrl` text,
	`pdfKey` varchar(255),
	`uploadedSignatureUrl` text,
	`uploadedSignatureKey` varchar(255),
	`printedAt` timestamp,
	`printedBy` int,
	`expiresAt` timestamp,
	`finalDocumentId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generated_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `generated_documents_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `document_models` ADD CONSTRAINT `document_models_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_modelId_document_models_id_fk` FOREIGN KEY (`modelId`) REFERENCES `document_models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_sentBy_users_id_fk` FOREIGN KEY (`sentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_printedBy_users_id_fk` FOREIGN KEY (`printedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_finalDocumentId_documents_id_fk` FOREIGN KEY (`finalDocumentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;