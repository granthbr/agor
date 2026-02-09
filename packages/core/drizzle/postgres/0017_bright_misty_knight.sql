CREATE TABLE "prompt_ratings" (
	"rating_id" varchar(36) PRIMARY KEY NOT NULL,
	"template_id" varchar(36) NOT NULL,
	"session_id" varchar(36),
	"rated_by" varchar(36) DEFAULT 'anonymous' NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_template_versions" (
	"version_id" varchar(36) PRIMARY KEY NOT NULL,
	"template_id" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"template" text NOT NULL,
	"variables" text,
	"change_note" text,
	"created_by" varchar(36) DEFAULT 'anonymous' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"template_id" varchar(36) PRIMARY KEY NOT NULL,
	"board_id" varchar(36),
	"created_by" varchar(36) DEFAULT 'anonymous' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"template" text NOT NULL,
	"variables" text,
	"metadata" text,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" varchar(36),
	"is_latest" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"avg_rating" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_ratings" ADD CONSTRAINT "prompt_ratings_template_id_prompt_templates_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_ratings" ADD CONSTRAINT "prompt_ratings_session_id_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("session_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_template_id_prompt_templates_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_board_id_boards_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("board_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_ratings_template_idx" ON "prompt_ratings" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "prompt_ratings_session_idx" ON "prompt_ratings" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "prompt_ratings_rated_by_idx" ON "prompt_ratings" USING btree ("rated_by");--> statement-breakpoint
CREATE INDEX "prompt_template_versions_template_idx" ON "prompt_template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "prompt_template_versions_version_idx" ON "prompt_template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "prompt_templates_board_idx" ON "prompt_templates" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "prompt_templates_category_idx" ON "prompt_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "prompt_templates_created_by_idx" ON "prompt_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "prompt_templates_parent_idx" ON "prompt_templates" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "prompt_templates_is_latest_idx" ON "prompt_templates" USING btree ("is_latest");--> statement-breakpoint
CREATE INDEX "prompt_templates_created_idx" ON "prompt_templates" USING btree ("created_at");