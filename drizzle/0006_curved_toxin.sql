ALTER TABLE `generated_documents` ADD `documentHash` varchar(64);--> statement-breakpoint
ALTER TABLE `generated_documents` ADD `certificateUrl` text;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD `certificateKey` varchar(255);