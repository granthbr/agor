import type { BoardID, CommentID, MessageID, SessionID, TaskID, UserID, WorktreeID } from './id';

/**
 * Board Comment - Human-to-human conversations and collaboration
 *
 * Flexible attachment strategy supporting:
 * - Board-level: General conversations (no attachments)
 * - Object-level: Attached to sessions, tasks, messages, or worktrees
 * - Spatial: Positioned on canvas (absolute or relative to objects)
 *
 * @see context/explorations/user-comments-and-conversation.md
 */
export interface BoardComment {
  /** Unique comment identifier (UUIDv7) */
  comment_id: CommentID;

  /** Board this comment belongs to */
  board_id: BoardID;

  /** User who created the comment */
  created_by: UserID;

  /** Comment content (Markdown-supported) */
  content: string;

  /** First 200 chars for list views */
  content_preview: string;

  // ============================================================================
  // Optional Attachments (Phase 2)
  // ============================================================================

  /** Optional: Attached to session */
  session_id?: SessionID;

  /** Optional: Attached to task */
  task_id?: TaskID;

  /** Optional: Attached to message */
  message_id?: MessageID;

  /** Optional: Attached to worktree */
  worktree_id?: WorktreeID;

  // ============================================================================
  // Threading & Metadata
  // ============================================================================

  /** Optional: Parent comment for threaded replies */
  parent_comment_id?: CommentID;

  /** Whether comment is resolved (GitHub PR-style) */
  resolved: boolean;

  /** Whether comment was edited after creation */
  edited: boolean;

  // ============================================================================
  // Spatial Positioning (Phase 3)
  // ============================================================================

  /** Optional: Spatial positioning on canvas */
  position?: {
    /** Absolute board coordinates (React Flow coordinates) */
    absolute?: { x: number; y: number };
    /** OR relative to session (follows session when it moves) */
    relative?: {
      session_id: string;
      offset_x: number;
      offset_y: number;
    };
  };

  // ============================================================================
  // Mentions (Phase 4)
  // ============================================================================

  /** Optional: @mentioned user IDs */
  mentions?: UserID[];

  // ============================================================================
  // Timestamps
  // ============================================================================

  created_at: Date;
  updated_at?: Date;
}

/**
 * Comment attachment type determination
 *
 * Hierarchy (most specific → least specific):
 * 1. message - Attached to specific message
 * 2. task - Attached to task
 * 3. session-spatial - Spatial pin on session
 * 4. session - Attached to session
 * 5. worktree - Attached to worktree
 * 6. board-spatial - Spatial pin on board
 * 7. board - General board conversation
 */
export type CommentAttachmentType =
  | 'message'
  | 'task'
  | 'session-spatial'
  | 'session'
  | 'worktree'
  | 'board-spatial'
  | 'board';

/**
 * Helper function to determine comment attachment type
 */
export function getCommentAttachmentType(comment: BoardComment): CommentAttachmentType {
  // Most specific → least specific
  if (comment.message_id) return 'message';
  if (comment.task_id) return 'task';
  if (comment.session_id && comment.position?.relative) return 'session-spatial';
  if (comment.session_id) return 'session';
  if (comment.worktree_id) return 'worktree';
  if (comment.position?.absolute) return 'board-spatial';
  return 'board'; // Default: board-level conversation
}

/**
 * Create input for new comment (omits auto-generated fields)
 */
export type BoardCommentCreate = Omit<
  BoardComment,
  'comment_id' | 'created_at' | 'updated_at' | 'content_preview'
> & {
  content: string; // Will auto-generate content_preview
};

/**
 * Patch input for updating comment (partial)
 */
export type BoardCommentPatch = Partial<Pick<BoardComment, 'content' | 'resolved'>> & {
  edited?: boolean; // Auto-set to true when content is updated
};
