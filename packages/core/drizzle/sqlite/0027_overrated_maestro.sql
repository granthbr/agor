CREATE TABLE `prompt_ratings` (
	`rating_id` text(36) PRIMARY KEY NOT NULL,
	`template_id` text(36) NOT NULL,
	`session_id` text(36),
	`rated_by` text(36) DEFAULT 'anonymous' NOT NULL,
	`rating` integer NOT NULL,
	`feedback` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`template_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`session_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `prompt_ratings_template_idx` ON `prompt_ratings` (`template_id`);--> statement-breakpoint
CREATE INDEX `prompt_ratings_session_idx` ON `prompt_ratings` (`session_id`);--> statement-breakpoint
CREATE INDEX `prompt_ratings_rated_by_idx` ON `prompt_ratings` (`rated_by`);--> statement-breakpoint
CREATE TABLE `prompt_template_versions` (
	`version_id` text(36) PRIMARY KEY NOT NULL,
	`template_id` text(36) NOT NULL,
	`version` integer NOT NULL,
	`template` text NOT NULL,
	`variables` text,
	`change_note` text,
	`created_by` text(36) DEFAULT 'anonymous' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`template_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prompt_template_versions_template_idx` ON `prompt_template_versions` (`template_id`);--> statement-breakpoint
CREATE INDEX `prompt_template_versions_version_idx` ON `prompt_template_versions` (`template_id`,`version`);--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`template_id` text(36) PRIMARY KEY NOT NULL,
	`board_id` text(36),
	`created_by` text(36) DEFAULT 'anonymous' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`template` text NOT NULL,
	`variables` text,
	`metadata` text,
	`version` integer DEFAULT 1 NOT NULL,
	`parent_id` text(36),
	`is_latest` integer DEFAULT true NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`avg_rating` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`board_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `prompt_templates_board_idx` ON `prompt_templates` (`board_id`);--> statement-breakpoint
CREATE INDEX `prompt_templates_category_idx` ON `prompt_templates` (`category`);--> statement-breakpoint
CREATE INDEX `prompt_templates_created_by_idx` ON `prompt_templates` (`created_by`);--> statement-breakpoint
CREATE INDEX `prompt_templates_parent_idx` ON `prompt_templates` (`parent_id`);--> statement-breakpoint
CREATE INDEX `prompt_templates_is_latest_idx` ON `prompt_templates` (`is_latest`);--> statement-breakpoint
CREATE INDEX `prompt_templates_created_idx` ON `prompt_templates` (`created_at`);