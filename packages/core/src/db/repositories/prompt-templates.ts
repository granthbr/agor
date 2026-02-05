/**
 * Prompt Templates Repository
 *
 * Type-safe CRUD operations for prompt templates with versioning support.
 */

import type {
  PromptTemplate,
  PromptTemplateCategory,
  PromptTemplateID,
  PromptTemplateMetadata,
  PromptTemplateVersion,
  UUID,
} from '@agor/core/types';
import { and, eq, like } from 'drizzle-orm';
import { generateId } from '../../lib/ids';
import type { Database } from '../client';
import { deleteFrom, insert, select, update } from '../database-wrapper';
import {
  type PromptTemplateInsert,
  type PromptTemplateRow,
  type PromptTemplateVersionInsert,
  type PromptTemplateVersionRow,
  promptTemplates,
  promptTemplateVersions,
} from '../schema';
import { type BaseRepository, EntityNotFoundError, RepositoryError } from './base';

/**
 * Prompt templates repository implementation
 */
export class PromptTemplatesRepository
  implements BaseRepository<PromptTemplate, Partial<PromptTemplate>>
{
  constructor(private db: Database) {}

  /**
   * Convert database row to PromptTemplate type
   */
  private rowToTemplate(row: PromptTemplateRow): PromptTemplate {
    return {
      template_id: row.template_id as PromptTemplateID,
      board_id: row.board_id ? (row.board_id as UUID) : null,
      created_by: row.created_by as UUID,
      title: row.title,
      description: row.description,
      category: row.category as PromptTemplateCategory,
      template: row.template,
      variables: row.variables ? (JSON.parse(row.variables as string) as string[]) : null,
      metadata: row.metadata
        ? (JSON.parse(row.metadata as string) as PromptTemplateMetadata)
        : null,
      version: row.version,
      parent_id: row.parent_id ? (row.parent_id as PromptTemplateID) : null,
      is_latest: Boolean(row.is_latest),
      usage_count: row.usage_count ?? 0,
      avg_rating: row.avg_rating ?? 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  /**
   * Convert PromptTemplate to database insert format
   */
  private templateToInsert(data: Partial<PromptTemplate>): PromptTemplateInsert {
    const now = Date.now();
    const templateId = data.template_id ?? generateId();

    return {
      template_id: templateId,
      board_id: data.board_id ?? null,
      created_by: data.created_by ?? 'anonymous',
      title: data.title ?? '',
      description: data.description ?? null,
      category: data.category ?? 'generic',
      template: data.template ?? '',
      variables: data.variables ? JSON.stringify(data.variables) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      version: data.version ?? 1,
      parent_id: data.parent_id ?? null,
      is_latest: data.is_latest ?? true,
      usage_count: data.usage_count ?? 0,
      avg_rating: data.avg_rating ?? 0,
      created_at: new Date(data.created_at ?? now),
      updated_at: new Date(data.updated_at ?? now),
    };
  }

  async create(data: Partial<PromptTemplate>): Promise<PromptTemplate> {
    try {
      const insertData = this.templateToInsert(data);
      await insert(this.db, promptTemplates).values(insertData).run();

      const row = await select(this.db)
        .from(promptTemplates)
        .where(eq(promptTemplates.template_id, insertData.template_id))
        .one();

      if (!row) {
        throw new RepositoryError('Failed to retrieve created template');
      }

      return this.rowToTemplate(row);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        `Failed to create template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async findById(id: string): Promise<PromptTemplate | null> {
    try {
      const row = await select(this.db)
        .from(promptTemplates)
        .where(eq(promptTemplates.template_id, id))
        .one();

      return row ? this.rowToTemplate(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async findAll(filters?: {
    board_id?: string;
    category?: PromptTemplateCategory;
    search?: string;
    is_latest?: boolean;
  }): Promise<PromptTemplate[]> {
    try {
      let query = select(this.db).from(promptTemplates);

      const conditions = [];
      if (filters?.board_id) {
        conditions.push(eq(promptTemplates.board_id, filters.board_id));
      }
      if (filters?.category) {
        conditions.push(eq(promptTemplates.category, filters.category));
      }
      if (filters?.is_latest !== undefined) {
        conditions.push(eq(promptTemplates.is_latest, filters.is_latest));
      }
      if (filters?.search) {
        conditions.push(like(promptTemplates.title, `%${filters.search}%`));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const rows = await query.all();
      return rows.map((row: PromptTemplateRow) => this.rowToTemplate(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find templates: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async update(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate> {
    try {
      const current = await this.findById(id);
      if (!current) {
        throw new EntityNotFoundError('PromptTemplate', id);
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.template !== undefined) updateData.template = updates.template;
      if (updates.variables !== undefined)
        updateData.variables = updates.variables ? JSON.stringify(updates.variables) : null;
      if (updates.metadata !== undefined)
        updateData.metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.version !== undefined) updateData.version = updates.version;
      if (updates.is_latest !== undefined) updateData.is_latest = updates.is_latest;
      if (updates.usage_count !== undefined) updateData.usage_count = updates.usage_count;
      if (updates.avg_rating !== undefined) updateData.avg_rating = updates.avg_rating;

      await update(this.db, promptTemplates)
        .set(updateData)
        .where(eq(promptTemplates.template_id, id))
        .run();

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError('Failed to retrieve updated template');
      }

      return updated;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      if (error instanceof EntityNotFoundError) throw error;
      throw new RepositoryError(
        `Failed to update template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Delete versions first
      await deleteFrom(this.db, promptTemplateVersions)
        .where(eq(promptTemplateVersions.template_id, id))
        .run();

      const result = await deleteFrom(this.db, promptTemplates)
        .where(eq(promptTemplates.template_id, id))
        .run();

      if (result.rowsAffected === 0) {
        throw new EntityNotFoundError('PromptTemplate', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new RepositoryError(
        `Failed to delete template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Create a version snapshot of the current template state
   */
  async createVersion(
    templateId: string,
    changeNote: string | null,
    createdBy: string
  ): Promise<PromptTemplateVersion> {
    try {
      const current = await this.findById(templateId);
      if (!current) {
        throw new EntityNotFoundError('PromptTemplate', templateId);
      }

      const versionId = generateId();
      const insertData: PromptTemplateVersionInsert = {
        version_id: versionId,
        template_id: templateId,
        version: current.version,
        template: current.template,
        variables: current.variables ? JSON.stringify(current.variables) : null,
        change_note: changeNote,
        created_by: createdBy,
        created_at: new Date(),
      };

      await insert(this.db, promptTemplateVersions).values(insertData).run();

      const row = await select(this.db)
        .from(promptTemplateVersions)
        .where(eq(promptTemplateVersions.version_id, versionId))
        .one();

      if (!row) {
        throw new RepositoryError('Failed to retrieve created version');
      }

      return this.rowToVersion(row);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      if (error instanceof EntityNotFoundError) throw error;
      throw new RepositoryError(
        `Failed to create version: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Get all versions for a template
   */
  async getVersions(templateId: string): Promise<PromptTemplateVersion[]> {
    try {
      const rows = await select(this.db)
        .from(promptTemplateVersions)
        .where(eq(promptTemplateVersions.template_id, templateId))
        .all();

      return rows.map((row: PromptTemplateVersionRow) => this.rowToVersion(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to get versions: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Increment usage count for a template
   */
  async incrementUsageCount(id: string): Promise<void> {
    const current = await this.findById(id);
    if (!current) return;

    await this.update(id, { usage_count: current.usage_count + 1 });
  }

  /**
   * Update average rating for a template
   */
  async updateAvgRating(id: string, avgRating: number): Promise<void> {
    await this.update(id, { avg_rating: avgRating });
  }

  private rowToVersion(row: PromptTemplateVersionRow): PromptTemplateVersion {
    return {
      version_id: row.version_id as UUID,
      template_id: row.template_id as UUID,
      version: row.version,
      template: row.template,
      variables: row.variables ? (JSON.parse(row.variables as string) as string[]) : null,
      change_note: row.change_note,
      created_by: row.created_by as UUID,
      created_at: new Date(row.created_at),
    };
  }
}
