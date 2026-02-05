/**
 * Prompt Templates Service
 *
 * CRUD service for prompt templates with auto-versioning on edit.
 * Uses DrizzleService adapter with PromptTemplatesRepository.
 */

import { PAGINATION } from '@agor/core/config';
import { type Database, PromptTemplatesRepository } from '@agor/core/db';
import type { PromptTemplate, PromptTemplateCategory, QueryParams } from '@agor/core/types';
import { DrizzleService } from '../adapters/drizzle';

export type PromptTemplatesParams = QueryParams<{
  board_id?: string;
  category?: PromptTemplateCategory;
  search?: string;
  is_latest?: boolean;
  $limit?: number;
  $skip?: number;
  $sort?: Record<string, 1 | -1>;
}>;

export class PromptTemplatesService extends DrizzleService<
  PromptTemplate,
  Partial<PromptTemplate>,
  PromptTemplatesParams
> {
  private templatesRepo: PromptTemplatesRepository;

  constructor(db: Database) {
    const templatesRepo = new PromptTemplatesRepository(db);
    super(templatesRepo, {
      id: 'template_id',
      resourceType: 'PromptTemplate',
      paginate: {
        default: PAGINATION.DEFAULT_LIMIT,
        max: PAGINATION.MAX_LIMIT,
      },
    });

    this.templatesRepo = templatesRepo;
  }

  /**
   * Override find to support filtering by board, category, and search.
   */
  async find(params?: PromptTemplatesParams) {
    const filters = params?.query || {};

    const allTemplates = await this.templatesRepo.findAll({
      board_id: filters.board_id,
      category: filters.category as PromptTemplateCategory | undefined,
      search: filters.search,
      is_latest: filters.is_latest,
    });

    // Compute quality score for each template
    const withScores = allTemplates.map((t) => ({
      ...t,
      quality_score: computeQualityScore(t),
    }));

    // Apply sorting
    const sortKey = filters.$sort ? Object.keys(filters.$sort)[0] : undefined;
    const sortDir = sortKey ? filters.$sort![sortKey] : 1;

    let sorted = withScores;
    if (sortKey === 'quality_score' || (!sortKey && withScores.length > 0)) {
      // Default sort by quality score
      sorted = withScores.sort((a, b) => {
        const aVal = a.quality_score ?? 0;
        const bVal = b.quality_score ?? 0;
        return sortDir === 1 ? aVal - bVal : bVal - aVal;
      });
    } else if (sortKey === 'usage_count') {
      sorted = withScores.sort((a, b) =>
        sortDir === 1 ? a.usage_count - b.usage_count : b.usage_count - a.usage_count
      );
    } else if (sortKey === 'avg_rating') {
      sorted = withScores.sort((a, b) =>
        sortDir === 1 ? a.avg_rating - b.avg_rating : b.avg_rating - a.avg_rating
      );
    } else if (sortKey === 'created_at') {
      sorted = withScores.sort((a, b) =>
        sortDir === 1
          ? a.created_at.getTime() - b.created_at.getTime()
          : b.created_at.getTime() - a.created_at.getTime()
      );
    }

    // Apply pagination
    const $limit = filters.$limit ?? PAGINATION.DEFAULT_LIMIT;
    const $skip = filters.$skip ?? 0;
    const paginated = sorted.slice($skip, $skip + $limit);

    return {
      total: sorted.length,
      limit: $limit,
      skip: $skip,
      data: paginated,
    };
  }

  /**
   * Override patch to support auto-versioning.
   * Creates a version snapshot before applying updates.
   */
  async patch(id: string | null, data: Partial<PromptTemplate>, params?: PromptTemplatesParams) {
    if (id === null) {
      return super.patch(id, data, params);
    }

    // Get current template before modification
    const current = await this.templatesRepo.findById(id);
    if (!current) {
      return super.patch(id, data, params);
    }

    // If template content is being changed, create a version snapshot
    if (data.template !== undefined && data.template !== current.template) {
      const changeNote = (data as { change_note?: string }).change_note ?? null;
      await this.templatesRepo.createVersion(id, changeNote, current.created_by);

      // Increment version
      data.version = current.version + 1;
    }

    return super.patch(id, data, params);
  }

  /**
   * Get version history for a template
   */
  async getVersions(templateId: string) {
    return this.templatesRepo.getVersions(templateId);
  }

  /**
   * Increment usage count
   */
  async incrementUsage(templateId: string) {
    return this.templatesRepo.incrementUsageCount(templateId);
  }
}

/**
 * Compute quality score for sorting.
 * score = (avg_rating * 0.6) + (log2(usage_count + 1) * 0.3) + (recency * 0.1)
 */
function computeQualityScore(template: PromptTemplate): number {
  const ratingScore = (template.avg_rating ?? 0) * 0.6;

  const usageScore = Math.log2((template.usage_count ?? 0) + 1) * 0.3;

  // Recency: 1.0 for today, decaying to 0.0 for 30+ days old
  const daysSinceUpdate = (Date.now() - template.updated_at.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - daysSinceUpdate / 30) * 0.1;

  return ratingScore + usageScore + recencyScore;
}

/**
 * Service factory function
 */
export function createPromptTemplatesService(db: Database): PromptTemplatesService {
  return new PromptTemplatesService(db);
}
