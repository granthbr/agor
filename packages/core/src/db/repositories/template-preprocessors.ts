/**
 * Template Preprocessors Repository
 *
 * Manages the many-to-many relationship between templates and their preprocessor fragments.
 * Preprocessors are templates with category='preprocessor' that get composed with other templates.
 */

import type { PromptTemplate, PromptTemplateID } from '@agor/core/types';
import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { deleteFrom, insert, select } from '../database-wrapper';
import { promptTemplates, type TemplatePreprocessorInsert, templatePreprocessors } from '../schema';
import { RepositoryError } from './base';

export class TemplatePreprocessorRepository {
  constructor(private db: Database) {}

  /**
   * List preprocessor templates attached to a template, ordered by sort_order
   */
  async listByTemplate(templateId: PromptTemplateID): Promise<PromptTemplate[]> {
    try {
      const rows = await select(this.db)
        .from(templatePreprocessors)
        .where(eq(templatePreprocessors.template_id, templateId))
        .orderBy(asc(templatePreprocessors.sort_order))
        .all();

      if (rows.length === 0) return [];

      // Fetch the full preprocessor templates
      const templates: PromptTemplate[] = [];
      for (const row of rows) {
        const tpl = await select(this.db)
          .from(promptTemplates)
          .where(eq(promptTemplates.template_id, row.preprocessor_id))
          .one();
        if (tpl) {
          templates.push(this.rowToTemplate(tpl));
        }
      }

      return templates;
    } catch (error) {
      throw new RepositoryError(
        `Failed to list preprocessors for template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Atomic replace: delete all preprocessors for a template, then insert new ones with sort_order = index
   */
  async setPreprocessors(
    templateId: PromptTemplateID,
    preprocessorIds: PromptTemplateID[]
  ): Promise<void> {
    try {
      // Delete all existing relationships
      await deleteFrom(this.db, templatePreprocessors)
        .where(eq(templatePreprocessors.template_id, templateId))
        .run();

      // Insert new relationships
      if (preprocessorIds.length > 0) {
        const inserts: TemplatePreprocessorInsert[] = preprocessorIds.map((ppId, index) => ({
          template_id: templateId,
          preprocessor_id: ppId,
          sort_order: index,
          created_at: new Date(),
        }));

        await insert(this.db, templatePreprocessors).values(inserts).run();
      }
    } catch (error) {
      throw new RepositoryError(
        `Failed to set preprocessors: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Add a single preprocessor to a template
   */
  async addPreprocessor(
    templateId: PromptTemplateID,
    preprocessorId: PromptTemplateID,
    sortOrder: number
  ): Promise<void> {
    try {
      const record: TemplatePreprocessorInsert = {
        template_id: templateId,
        preprocessor_id: preprocessorId,
        sort_order: sortOrder,
        created_at: new Date(),
      };

      await insert(this.db, templatePreprocessors).values(record).run();
    } catch (error) {
      throw new RepositoryError(
        `Failed to add preprocessor: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Remove a single preprocessor from a template
   */
  async removePreprocessor(
    templateId: PromptTemplateID,
    preprocessorId: PromptTemplateID
  ): Promise<void> {
    try {
      await deleteFrom(this.db, templatePreprocessors)
        .where(
          and(
            eq(templatePreprocessors.template_id, templateId),
            eq(templatePreprocessors.preprocessor_id, preprocessorId)
          )
        )
        .run();
    } catch (error) {
      throw new RepositoryError(
        `Failed to remove preprocessor: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: schema row type varies by dialect
  private rowToTemplate(row: any): PromptTemplate {
    return {
      template_id: row.template_id as PromptTemplateID,
      board_id: row.board_id,
      created_by: row.created_by,
      title: row.title,
      description: row.description,
      category: row.category,
      template: row.template,
      variables: row.variables ? JSON.parse(row.variables) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      version: row.version,
      parent_id: row.parent_id,
      is_latest: Boolean(row.is_latest),
      usage_count: row.usage_count,
      avg_rating: row.avg_rating,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
