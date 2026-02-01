CREATE TABLE `court_communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lawsuitId` int,
	`communicationType` enum('email','official_diary','subpoena','notification','other') NOT NULL,
	`subject` varchar(500),
	`content` text,
	`senderEmail` varchar(320),
	`receivedAt` timestamp NOT NULL,
	`attachmentUrl` text,
	`attachmentKey` varchar(255),
	`attachmentName` varchar(255),
	`isProcessed` boolean DEFAULT false,
	`processedAt` timestamp,
	`processedBy` int,
	`extractedProcessNumber` varchar(30),
	`extractedDeadline` timestamp,
	`extractedData` json,
	`status` enum('unread','read','processed','archived') NOT NULL DEFAULT 'unread',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `court_communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escavador_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiKey` varchar(255),
	`isActive` boolean DEFAULT false,
	`lastSyncAt` timestamp,
	`syncFrequencyHours` int DEFAULT 24,
	`monitoredCnpj` varchar(20),
	`monitoredCompanyName` varchar(200),
	`webhookUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escavador_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `labor_lawsuits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processNumber` varchar(30) NOT NULL,
	`courtName` varchar(200) NOT NULL,
	`courtRegion` varchar(50),
	`courtCity` varchar(100),
	`courtState` varchar(2),
	`claimantId` int,
	`claimantName` varchar(200) NOT NULL,
	`claimantCpf` varchar(14),
	`claimantLawyer` varchar(200),
	`lawyerId` int,
	`lawsuitType` enum('labor_claim','work_accident','occupational_disease','moral_damage','harassment','wrongful_termination','salary_differences','overtime','other') NOT NULL DEFAULT 'labor_claim',
	`filingDate` timestamp,
	`distributionDate` timestamp,
	`claimAmount` decimal(15,2),
	`provisionAmount` decimal(15,2),
	`settlementAmount` decimal(15,2),
	`condemnationAmount` decimal(15,2),
	`status` enum('active','suspended','settled','won','lost','partially_lost','archived','appealed') NOT NULL DEFAULT 'active',
	`phase` enum('initial','instruction','judgment','appeal','execution','closed') NOT NULL DEFAULT 'initial',
	`claimSummary` text,
	`defenseStrategy` text,
	`notes` text,
	`escavadorId` varchar(100),
	`lastSyncAt` timestamp,
	`resultDate` timestamp,
	`resultSummary` text,
	`departmentId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labor_lawsuits_id` PRIMARY KEY(`id`),
	CONSTRAINT `labor_lawsuits_processNumber_unique` UNIQUE(`processNumber`)
);
--> statement-breakpoint
CREATE TABLE `lawsuit_deadlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lawsuitId` int NOT NULL,
	`deadlineType` enum('defense','reply','evidence','witness_list','appeal','counter_reasons','manifestation','payment','other') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`startDate` timestamp NOT NULL,
	`dueDate` timestamp NOT NULL,
	`businessDaysOnly` boolean DEFAULT true,
	`status` enum('pending','in_progress','completed','missed','extended') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`completedBy` int,
	`alert7DaysSent` boolean DEFAULT false,
	`alert3DaysSent` boolean DEFAULT false,
	`alert1DaySent` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lawsuit_deadlines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lawsuit_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lawsuitId` int NOT NULL,
	`hearingId` int,
	`documentType` enum('initial_petition','defense','reply','evidence','witness_list','expert_report','appeal','sentence','settlement','subpoena','court_order','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`linkedDocumentId` int,
	`linkedRecurringDocId` int,
	`receivedAt` timestamp,
	`dueDate` timestamp,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lawsuit_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lawsuit_financial` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lawsuitId` int NOT NULL,
	`transactionType` enum('court_fee','lawyer_fee','expert_fee','settlement_payment','condemnation_payment','deposit','other_expense','reimbursement') NOT NULL,
	`description` varchar(300) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`dueDate` timestamp,
	`paidDate` timestamp,
	`status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`installmentNumber` int,
	`totalInstallments` int,
	`receiptUrl` text,
	`receiptKey` varchar(255),
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lawsuit_financial_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lawsuit_hearings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lawsuitId` int NOT NULL,
	`hearingType` enum('initial','conciliation','instruction','judgment','other') NOT NULL,
	`scheduledDate` timestamp NOT NULL,
	`scheduledTime` varchar(10),
	`location` varchar(300),
	`isVirtual` boolean DEFAULT false,
	`virtualLink` text,
	`status` enum('scheduled','confirmed','rescheduled','completed','cancelled','postponed') NOT NULL DEFAULT 'scheduled',
	`outcome` text,
	`nextSteps` text,
	`alert7DaysSent` boolean DEFAULT false,
	`alert3DaysSent` boolean DEFAULT false,
	`alert1DaySent` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lawsuit_hearings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lawsuit_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lawsuitId` int NOT NULL,
	`movementDate` timestamp NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`source` enum('manual','escavador','email','datajud') NOT NULL DEFAULT 'manual',
	`externalId` varchar(100),
	`rawData` json,
	`isImportant` boolean DEFAULT false,
	`requiresAction` boolean DEFAULT false,
	`actionTaken` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lawsuit_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lawsuit_witnesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lawsuitId` int NOT NULL,
	`hearingId` int,
	`name` varchar(200) NOT NULL,
	`cpf` varchar(14),
	`phone` varchar(20),
	`email` varchar(320),
	`employeeId` int,
	`role` enum('company_witness','claimant_witness','expert') NOT NULL DEFAULT 'company_witness',
	`relationship` varchar(100),
	`expectedTestimony` text,
	`actualTestimony` text,
	`status` enum('pending','summoned','confirmed','testified','absent','excused') NOT NULL DEFAULT 'pending',
	`summonedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lawsuit_witnesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lawyers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`oabNumber` varchar(20) NOT NULL,
	`oabState` varchar(2) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`lawFirm` varchar(200),
	`specialization` varchar(100),
	`isInternal` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lawyers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `court_communications` ADD CONSTRAINT `court_communications_lawsuitId_labor_lawsuits_id_fk` FOREIGN KEY (`lawsuitId`) REFERENCES `labor_lawsuits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `court_communications` ADD CONSTRAINT `court_communications_processedBy_users_id_fk` FOREIGN KEY (`processedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labor_lawsuits` ADD CONSTRAINT `labor_lawsuits_claimantId_employees_id_fk` FOREIGN KEY (`claimantId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labor_lawsuits` ADD CONSTRAINT `labor_lawsuits_lawyerId_lawyers_id_fk` FOREIGN KEY (`lawyerId`) REFERENCES `lawyers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labor_lawsuits` ADD CONSTRAINT `labor_lawsuits_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labor_lawsuits` ADD CONSTRAINT `labor_lawsuits_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_deadlines` ADD CONSTRAINT `lawsuit_deadlines_lawsuitId_labor_lawsuits_id_fk` FOREIGN KEY (`lawsuitId`) REFERENCES `labor_lawsuits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_deadlines` ADD CONSTRAINT `lawsuit_deadlines_completedBy_users_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_documents` ADD CONSTRAINT `lawsuit_documents_lawsuitId_labor_lawsuits_id_fk` FOREIGN KEY (`lawsuitId`) REFERENCES `labor_lawsuits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_documents` ADD CONSTRAINT `lawsuit_documents_hearingId_lawsuit_hearings_id_fk` FOREIGN KEY (`hearingId`) REFERENCES `lawsuit_hearings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_documents` ADD CONSTRAINT `lawsuit_documents_linkedDocumentId_documents_id_fk` FOREIGN KEY (`linkedDocumentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_documents` ADD CONSTRAINT `lawsuit_documents_linkedRecurringDocId_recurring_documents_id_fk` FOREIGN KEY (`linkedRecurringDocId`) REFERENCES `recurring_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_documents` ADD CONSTRAINT `lawsuit_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_financial` ADD CONSTRAINT `lawsuit_financial_lawsuitId_labor_lawsuits_id_fk` FOREIGN KEY (`lawsuitId`) REFERENCES `labor_lawsuits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_financial` ADD CONSTRAINT `lawsuit_financial_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_hearings` ADD CONSTRAINT `lawsuit_hearings_lawsuitId_labor_lawsuits_id_fk` FOREIGN KEY (`lawsuitId`) REFERENCES `labor_lawsuits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_movements` ADD CONSTRAINT `lawsuit_movements_lawsuitId_labor_lawsuits_id_fk` FOREIGN KEY (`lawsuitId`) REFERENCES `labor_lawsuits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_witnesses` ADD CONSTRAINT `lawsuit_witnesses_lawsuitId_labor_lawsuits_id_fk` FOREIGN KEY (`lawsuitId`) REFERENCES `labor_lawsuits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_witnesses` ADD CONSTRAINT `lawsuit_witnesses_hearingId_lawsuit_hearings_id_fk` FOREIGN KEY (`hearingId`) REFERENCES `lawsuit_hearings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawsuit_witnesses` ADD CONSTRAINT `lawsuit_witnesses_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;