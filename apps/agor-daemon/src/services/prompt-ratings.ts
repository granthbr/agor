/**
 * Prompt Ratings Service
 *
 * CRUD service for prompt template ratings.
 * On create, recalculates the parent template's avg_rating.
 */

import { PAGINATION } from '@agor/core/config';
import { type Database, PromptRatingsRepository, PromptTemplatesRepository } from '@agor/core/db';
import type { PromptRating, QueryParams } from '@agor/core/types';
import { DrizzleService } from '../adapters/drizzle';

export type PromptRatingsParams = QueryParams<{
  template_id?: string;
  session_id?: string;
  rated_by?: string;
  $limit?: number;
  $skip?: number;
}>;

export class PromptRatingsService extends DrizzleService<
  PromptRating,
  Partial<PromptRating>,
  PromptRatingsParams
> {
  private ratingsRepo: PromptRatingsRepository;
  private templatesRepo: PromptTemplatesRepository;

  constructor(db: Database) {
    const ratingsRepo = new PromptRatingsRepository(db);
    super(ratingsRepo, {
      id: 'rating_id',
      resourceType: 'PromptRating',
      paginate: {
        default: PAGINATION.DEFAULT_LIMIT,
        max: PAGINATION.MAX_LIMIT,
      },
    });

    this.ratingsRepo = ratingsRepo;
    this.templatesRepo = new PromptTemplatesRepository(db);
  }

  /**
   * Override create to recalculate avg_rating on the parent template.
   */
  async create(
    data: Partial<PromptRating> | Partial<PromptRating>[],
    params?: PromptRatingsParams
  ) {
    const result = await super.create(data, params);

    // Recalculate avg_rating for the template
    const rating = Array.isArray(result) ? result[0] : result;
    if (rating?.template_id) {
      const avgRating = await this.ratingsRepo.calculateAvgRating(rating.template_id);
      await this.templatesRepo.updateAvgRating(rating.template_id, avgRating);
    }

    return result;
  }

  /**
   * Override find to support filtering by template.
   */
  async find(params?: PromptRatingsParams) {
    const filters = params?.query || {};

    if (filters.template_id) {
      const ratings = await this.ratingsRepo.findByTemplate(filters.template_id);
      const $limit = filters.$limit ?? PAGINATION.DEFAULT_LIMIT;
      const $skip = filters.$skip ?? 0;
      const paginated = ratings.slice($skip, $skip + $limit);

      return {
        total: ratings.length,
        limit: $limit,
        skip: $skip,
        data: paginated,
      };
    }

    return super.find(params);
  }
}

/**
 * Service factory function
 */
export function createPromptRatingsService(db: Database): PromptRatingsService {
  return new PromptRatingsService(db);
}
