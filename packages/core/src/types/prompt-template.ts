/**
 * Prompt Template Types
 *
 * Type definitions for the Prompt Architect feature:
 * - Prompt templates (versioned, categorized, rated)
 * - Template versions (change history)
 * - Prompt ratings (quality feedback)
 */

import type { BoardID, SessionID, UserID, UUID } from './id';

// ============================================================================
// Branded ID Types
// ============================================================================

/** Prompt template identifier */
export type PromptTemplateID = UUID;

/** Prompt template version identifier */
export type PromptTemplateVersionID = UUID;

/** Prompt rating identifier */
export type PromptRatingID = UUID;

// ============================================================================
// Category & Target Types
// ============================================================================

/** Template categories */
export type PromptTemplateCategory = 'session' | 'zone' | 'scheduler' | 'generic';

/** Architect generation target */
export type PromptArchitectTarget = 'zone' | 'session' | 'scheduler';

/** Architect action types */
export type PromptArchitectAction = 'clarify' | 'generate';

// ============================================================================
// Prompt Template
// ============================================================================

export interface PromptTemplate {
  /** Unique template identifier */
  template_id: PromptTemplateID;

  /** Board this template belongs to (null = global) */
  board_id: BoardID | null;

  /** User who created the template */
  created_by: UserID;

  /** Template title */
  title: string;

  /** Template description */
  description: string | null;

  /** Template category */
  category: PromptTemplateCategory;

  /** Template content (Handlebars for zones, static text for sessions) */
  template: string;

  /** Template variables used (JSON array of variable names) */
  variables: string[] | null;

  /** Generation metadata (JSON) */
  metadata: PromptTemplateMetadata | null;

  /** Current version number */
  version: number;

  /** Parent template ID (for forks) */
  parent_id: PromptTemplateID | null;

  /** Whether this is the latest version */
  is_latest: boolean;

  /** Number of times this template has been used */
  usage_count: number;

  /** Average rating (1-5) */
  avg_rating: number;

  /** Computed quality score */
  quality_score?: number;

  created_at: Date;
  updated_at: Date;
}

/** Metadata stored with a template about its generation context */
export interface PromptTemplateMetadata {
  /** Original description used for generation */
  original_description?: string;
  /** Clarification Q&A pairs */
  clarifications?: Record<string, string>;
  /** Target type used during generation */
  target?: PromptArchitectTarget;
  /** Model used for generation */
  model?: string;
}

// ============================================================================
// Prompt Template Version
// ============================================================================

export interface PromptTemplateVersion {
  /** Unique version identifier */
  version_id: PromptTemplateVersionID;

  /** Parent template */
  template_id: PromptTemplateID;

  /** Version number */
  version: number;

  /** Template content at this version */
  template: string;

  /** Variables at this version */
  variables: string[] | null;

  /** Change note describing what was modified */
  change_note: string | null;

  /** User who created this version */
  created_by: UserID;

  created_at: Date;
}

// ============================================================================
// Prompt Rating
// ============================================================================

export interface PromptRating {
  /** Unique rating identifier */
  rating_id: PromptRatingID;

  /** Template being rated */
  template_id: PromptTemplateID;

  /** Session where the template was used (optional) */
  session_id: SessionID | null;

  /** User who submitted the rating */
  rated_by: UserID;

  /** Rating value (1-5 stars) */
  rating: number;

  /** Optional feedback text */
  feedback: string | null;

  created_at: Date;
}

// ============================================================================
// Architect Service Types
// ============================================================================

/** Clarification question from the architect */
export interface ArchitectClarificationQuestion {
  question: string;
  options?: string[];
  priority: 'high' | 'medium' | 'low';
}

/** Input to the architect service */
export interface PromptArchitectInput {
  /** Action to perform */
  action?: PromptArchitectAction;
  /** Plain-English description of what the prompt should do */
  description: string;
  /** Target type */
  target: PromptArchitectTarget;
  /** User's answers to clarification questions */
  clarifications?: Record<string, string>;
  /** Whether to save the generated template to the library */
  save?: boolean;
  /** Optional board ID for saved templates */
  board_id?: string;
}

/** Clarification response from the architect */
export interface PromptArchitectClarifyResult {
  questions: ArchitectClarificationQuestion[];
}

/** Generation response from the architect */
export interface PromptArchitectGenerateResult {
  title: string;
  template: string;
  variables_used: string[];
  template_id?: PromptTemplateID;
}

// ============================================================================
// Create/Patch Input Types
// ============================================================================

export type PromptTemplateCreate = Omit<
  PromptTemplate,
  | 'template_id'
  | 'created_at'
  | 'updated_at'
  | 'version'
  | 'is_latest'
  | 'usage_count'
  | 'avg_rating'
  | 'quality_score'
>;

export type PromptTemplatePatch = Partial<
  Pick<PromptTemplate, 'title' | 'description' | 'template' | 'variables' | 'category'>
> & {
  change_note?: string;
};

export type PromptRatingCreate = Omit<PromptRating, 'rating_id' | 'created_at'>;
