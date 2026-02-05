/**
 * Prompt Ratings Repository
 *
 * Type-safe CRUD operations for prompt template ratings.
 */

import type { PromptRating, PromptRatingID, UUID } from '@agor/core/types';
import { eq } from 'drizzle-orm';
import { generateId } from '../../lib/ids';
import type { Database } from '../client';
import { deleteFrom, insert, select } from '../database-wrapper';
import { type PromptRatingInsert, type PromptRatingRow, promptRatings } from '../schema';
import { type BaseRepository, EntityNotFoundError, RepositoryError } from './base';

/**
 * Prompt ratings repository implementation
 */
export class PromptRatingsRepository
  implements BaseRepository<PromptRating, Partial<PromptRating>>
{
  constructor(private db: Database) {}

  private rowToRating(row: PromptRatingRow): PromptRating {
    return {
      rating_id: row.rating_id as PromptRatingID,
      template_id: row.template_id as UUID,
      session_id: row.session_id ? (row.session_id as UUID) : null,
      rated_by: row.rated_by as UUID,
      rating: row.rating,
      feedback: row.feedback,
      created_at: new Date(row.created_at),
    };
  }

  async create(data: Partial<PromptRating>): Promise<PromptRating> {
    try {
      const ratingId = data.rating_id ?? generateId();
      const now = Date.now();

      const insertData: PromptRatingInsert = {
        rating_id: ratingId,
        template_id: data.template_id!,
        session_id: data.session_id ?? null,
        rated_by: data.rated_by ?? 'anonymous',
        rating: data.rating ?? 3,
        feedback: data.feedback ?? null,
        created_at: new Date(data.created_at ?? now),
      };

      await insert(this.db, promptRatings).values(insertData).run();

      const row = await select(this.db)
        .from(promptRatings)
        .where(eq(promptRatings.rating_id, ratingId))
        .one();

      if (!row) {
        throw new RepositoryError('Failed to retrieve created rating');
      }

      return this.rowToRating(row);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        `Failed to create rating: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async findById(id: string): Promise<PromptRating | null> {
    try {
      const row = await select(this.db)
        .from(promptRatings)
        .where(eq(promptRatings.rating_id, id))
        .one();

      return row ? this.rowToRating(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find rating: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async findAll(): Promise<PromptRating[]> {
    try {
      const rows = await select(this.db).from(promptRatings).all();
      return rows.map((row: PromptRatingRow) => this.rowToRating(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find ratings: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async findByTemplate(templateId: string): Promise<PromptRating[]> {
    try {
      const rows = await select(this.db)
        .from(promptRatings)
        .where(eq(promptRatings.template_id, templateId))
        .all();

      return rows.map((row: PromptRatingRow) => this.rowToRating(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find ratings by template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Calculate average rating for a template
   */
  async calculateAvgRating(templateId: string): Promise<number> {
    const ratings = await this.findByTemplate(templateId);
    if (ratings.length === 0) return 0;

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
  }

  async update(id: string, _updates: Partial<PromptRating>): Promise<PromptRating> {
    // Ratings are immutable - throw error
    throw new RepositoryError('Ratings cannot be updated. Delete and re-create instead.');
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await deleteFrom(this.db, promptRatings)
        .where(eq(promptRatings.rating_id, id))
        .run();

      if (result.rowsAffected === 0) {
        throw new EntityNotFoundError('PromptRating', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new RepositoryError(
        `Failed to delete rating: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }
}
