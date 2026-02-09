/**
 * Template Preprocessors Service
 *
 * Manages the many-to-many relationship between templates and preprocessor fragments.
 * Preprocessors are templates with category='preprocessor' that compose with other templates.
 */

import { type Database, TemplatePreprocessorRepository } from '@agor/core/db';
import type { PromptTemplate, PromptTemplateID } from '@agor/core/types';

export class TemplatePreprocessorsService {
  private repo: TemplatePreprocessorRepository;

  constructor(db: Database) {
    this.repo = new TemplatePreprocessorRepository(db);
  }

  /**
   * List preprocessors for a template (ordered by sort_order)
   */
  async find(params?: { query?: { template_id?: string } }): Promise<PromptTemplate[]> {
    const templateId = params?.query?.template_id;
    if (!templateId) {
      return [];
    }
    return this.repo.listByTemplate(templateId as PromptTemplateID);
  }

  /**
   * Set preprocessors for a template (atomic replace)
   * Body: { template_id, preprocessor_ids: string[] }
   */
  async create(
    data: { template_id: string; preprocessor_ids: string[] },
    _params?: unknown
  ): Promise<{ template_id: string; preprocessor_ids: string[] }> {
    await this.repo.setPreprocessors(
      data.template_id as PromptTemplateID,
      data.preprocessor_ids as PromptTemplateID[]
    );
    return data;
  }

  /**
   * Remove a single preprocessor from a template
   * id = preprocessor_id, query.template_id = parent template
   */
  async remove(
    id: string,
    params?: { query?: { template_id?: string } }
  ): Promise<{ template_id: string; preprocessor_id: string }> {
    const templateId = params?.query?.template_id;
    if (!templateId) {
      throw new Error('template_id query parameter is required');
    }
    await this.repo.removePreprocessor(templateId as PromptTemplateID, id as PromptTemplateID);
    return { template_id: templateId, preprocessor_id: id };
  }
}

/**
 * Service factory function
 */
export function createTemplatePreprocessorsService(db: Database): TemplatePreprocessorsService {
  return new TemplatePreprocessorsService(db);
}
