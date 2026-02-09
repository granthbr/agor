CREATE TABLE `template_preprocessors` (
	`template_id` text(36) NOT NULL,
	`preprocessor_id` text(36) NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`template_id`, `preprocessor_id`),
	FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`template_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preprocessor_id`) REFERENCES `prompt_templates`(`template_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `template_preprocessors_template_idx` ON `template_preprocessors` (`template_id`);--> statement-breakpoint
CREATE INDEX `template_preprocessors_preprocessor_idx` ON `template_preprocessors` (`preprocessor_id`);