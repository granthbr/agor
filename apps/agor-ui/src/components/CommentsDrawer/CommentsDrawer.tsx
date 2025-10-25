import type { AgorClient } from '@agor/core/api';
import type { BoardComment, User } from '@agor/core/types';
import { CommentOutlined } from '@ant-design/icons';
import { Bubble, Sender } from '@ant-design/x';
import { Badge, Button, Drawer, Space, Spin, Typography, theme } from 'antd';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

const { Title } = Typography;

export interface CommentsDrawerProps {
  client: AgorClient | null;
  boardId: string;
  comments: BoardComment[];
  users: User[];
  currentUserId: string;
  loading?: boolean;
  open: boolean;
  onClose: () => void;
  onSendComment: (content: string) => void;
  onResolveComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

type FilterMode = 'all' | 'unresolved' | 'mentions';

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  boardId,
  comments,
  users,
  currentUserId,
  loading = false,
  open,
  onClose,
  onSendComment,
  onResolveComment,
  onDeleteComment,
}) => {
  const { token } = theme.useToken();
  const [filter, setFilter] = useState<FilterMode>('all');

  // Get user by ID helper (memoized to avoid recreating on every render)
  const getUserById = useCallback(
    (userId: string): User | undefined => {
      return users.find(u => u.user_id === userId);
    },
    [users]
  );

  // Filter comments based on selected filter
  const filteredComments = useMemo(() => {
    switch (filter) {
      case 'unresolved':
        return comments.filter(c => !c.resolved);
      case 'mentions':
        return comments.filter(c => c.mentions?.includes(currentUserId));
      default:
        return comments;
    }
  }, [comments, filter, currentUserId]);

  // Convert comments to Bubble.List items format
  const bubbleItems = useMemo(() => {
    return filteredComments
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(comment => {
        const user = getUserById(comment.created_by);
        const isCurrentUser = comment.created_by === currentUserId;

        return {
          key: comment.comment_id,
          placement: (isCurrentUser ? 'end' : 'start') as 'start' | 'end',
          avatar: { children: user?.emoji || '👤' },
          content: comment.content,
          header: (
            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 4 }}>
              <Space size={4}>
                <span>{user?.name || 'Anonymous'}</span>
                <span>•</span>
                <span>{new Date(comment.created_at).toLocaleTimeString()}</span>
                {comment.edited && <span style={{ fontStyle: 'italic' }}>(edited)</span>}
                {comment.resolved && (
                  <Badge
                    count="Resolved"
                    style={{
                      backgroundColor: token.colorSuccess,
                      fontSize: 10,
                      height: 16,
                      lineHeight: '16px',
                    }}
                  />
                )}
              </Space>
            </div>
          ),
          footer:
            onResolveComment || onDeleteComment ? (
              <div style={{ marginTop: 4 }}>
                <Space size="small">
                  {onResolveComment && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => onResolveComment(comment.comment_id)}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      {comment.resolved ? 'Unresolve' : 'Resolve'}
                    </Button>
                  )}
                  {onDeleteComment && isCurrentUser && (
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => onDeleteComment(comment.comment_id)}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      Delete
                    </Button>
                  )}
                </Space>
              </div>
            ) : undefined,
        };
      });
  }, [
    filteredComments,
    currentUserId,
    getUserById,
    onResolveComment,
    onDeleteComment,
    token.colorTextSecondary,
    token.colorSuccess,
  ]);

  return (
    <Drawer
      title={
        <Space>
          <CommentOutlined />
          <span>Comments</span>
          <Badge count={filteredComments.length} showZero={false} />
        </Space>
      }
      placement="left"
      width={420}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      {/* Filter Tabs */}
      <div
        style={{
          padding: 16,
          borderBottom: `1px solid ${token.colorBorder}`,
          backgroundColor: token.colorBgContainer,
        }}
      >
        <Space>
          <Button
            type={filter === 'all' ? 'primary' : 'default'}
            size="small"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            type={filter === 'unresolved' ? 'primary' : 'default'}
            size="small"
            onClick={() => setFilter('unresolved')}
          >
            Unresolved
          </Button>
          <Button
            type={filter === 'mentions' ? 'primary' : 'default'}
            size="small"
            onClick={() => setFilter('mentions')}
          >
            Mentions
          </Button>
        </Space>
      </div>

      {/* Conversation List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
          backgroundColor: token.colorBgLayout,
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin tip="Loading comments..." />
          </div>
        ) : filteredComments.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 32,
              color: token.colorTextSecondary,
            }}
          >
            <CommentOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
            <div>No comments yet</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>Start a conversation about this board</div>
          </div>
        ) : (
          <Bubble.List items={bubbleItems} />
        )}
      </div>

      {/* Input Box */}
      <div
        style={{
          padding: 16,
          borderTop: `1px solid ${token.colorBorder}`,
          backgroundColor: token.colorBgContainer,
        }}
      >
        <Sender
          placeholder="Add a comment..."
          onSubmit={content => onSendComment(content)}
          style={{
            backgroundColor: token.colorBgContainer,
          }}
        />
      </div>
    </Drawer>
  );
};
