CREATE TABLE "template_preprocessors" (
	"template_id" varchar(36) NOT NULL,
	"preprocessor_id" varchar(36) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "template_preprocessors_template_id_preprocessor_id_pk" PRIMARY KEY("template_id","preprocessor_id")
);
--> statement-breakpoint
ALTER TABLE "template_preprocessors" ADD CONSTRAINT "template_preprocessors_template_id_prompt_templates_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_preprocessors" ADD CONSTRAINT "template_preprocessors_preprocessor_id_prompt_templates_template_id_fk" FOREIGN KEY ("preprocessor_id") REFERENCES "public"."prompt_templates"("template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_preprocessors_template_idx" ON "template_preprocessors" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_preprocessors_preprocessor_idx" ON "template_preprocessors" USING btree ("preprocessor_id");