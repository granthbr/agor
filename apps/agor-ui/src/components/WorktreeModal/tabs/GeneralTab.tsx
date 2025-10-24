import type { Repo, Session, Worktree } from '@agor/core/types';
import { DeleteOutlined, EditOutlined, FolderOutlined, LinkOutlined } from '@ant-design/icons';
import { Button, Descriptions, Input, message, Space, Tag, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { DeleteWorktreePopconfirm } from '../../DeleteWorktreePopconfirm';

const { Paragraph } = Typography;
const { TextArea } = Input;

interface GeneralTabProps {
  worktree: Worktree;
  repo: Repo;
  sessions: Session[];
  onUpdate?: (worktreeId: string, updates: Partial<Worktree>) => void;
  onDelete?: (worktreeId: string, deleteFromFilesystem: boolean) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  worktree,
  repo,
  sessions,
  onUpdate,
  onDelete,
}) => {
  const { token } = theme.useToken();
  const [editingIssue, setEditingIssue] = useState(false);
  const [editingPR, setEditingPR] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  const [issueUrl, setIssueUrl] = useState(worktree.issue_url || '');
  const [prUrl, setPrUrl] = useState(worktree.pull_request_url || '');
  const [notes, setNotes] = useState(worktree.notes || '');

  // Sync local state with prop changes (from WebSocket updates)
  useEffect(() => {
    setIssueUrl(worktree.issue_url || '');
  }, [worktree.issue_url]);

  useEffect(() => {
    setPrUrl(worktree.pull_request_url || '');
  }, [worktree.pull_request_url]);

  useEffect(() => {
    setNotes(worktree.notes || '');
  }, [worktree.notes]);

  const handleSaveIssue = () => {
    onUpdate?.(worktree.worktree_id, { issue_url: issueUrl || undefined });
    setEditingIssue(false);
    message.success('Issue URL updated');
  };

  const handleSavePR = () => {
    onUpdate?.(worktree.worktree_id, { pull_request_url: prUrl || undefined });
    setEditingPR(false);
    message.success('Pull request URL updated');
  };

  const handleSaveNotes = () => {
    onUpdate?.(worktree.worktree_id, { notes: notes || undefined });
    setEditingNotes(false);
    message.success('Notes updated');
  };

  const handleDelete = (deleteFromFilesystem: boolean) => {
    onDelete?.(worktree.worktree_id, deleteFromFilesystem);
  };

  return (
    <div style={{ width: '100%', maxHeight: '70vh', overflowY: 'auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Basic Information */}
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Name">
            <Typography.Text strong>{worktree.name}</Typography.Text>
            {worktree.new_branch && (
              <Tag color="green" style={{ marginLeft: 8, fontSize: 11 }}>
                New Branch
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Repository">
            <Space>
              <FolderOutlined />
              <Typography.Text>{repo.name}</Typography.Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Branch">
            <Typography.Text code>{worktree.ref}</Typography.Text>
          </Descriptions.Item>
          {worktree.base_ref && (
            <Descriptions.Item label="Base Branch">
              <Typography.Text code>
                {worktree.base_ref}
                {worktree.base_sha && ` (${worktree.base_sha.substring(0, 7)})`}
              </Typography.Text>
            </Descriptions.Item>
          )}
          {worktree.tracking_branch && (
            <Descriptions.Item label="Tracking">
              <Typography.Text code>{worktree.tracking_branch}</Typography.Text>
            </Descriptions.Item>
          )}
          {worktree.last_commit_sha && (
            <Descriptions.Item label="Current SHA">
              <Typography.Text code>{worktree.last_commit_sha.substring(0, 7)}</Typography.Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Path">
            <Typography.Text code style={{ fontSize: 11 }}>
              {worktree.path}
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        {/* Work Context */}
        <div>
          <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
            Work Context
          </Typography.Text>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Issue URL */}
            <div>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Text type="secondary">Issue:</Typography.Text>
                {!editingIssue && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditingIssue(true)}
                  >
                    Edit
                  </Button>
                )}
              </Space>
              {editingIssue ? (
                <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                  <Input
                    value={issueUrl}
                    onChange={e => setIssueUrl(e.target.value)}
                    placeholder="https://github.com/user/repo/issues/42"
                    prefix={<LinkOutlined />}
                  />
                  <Button type="primary" onClick={handleSaveIssue}>
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIssueUrl(worktree.issue_url || '');
                      setEditingIssue(false);
                    }}
                  >
                    Cancel
                  </Button>
                </Space.Compact>
              ) : issueUrl ? (
                <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                  <Typography.Text code style={{ fontSize: 12 }}>
                    {issueUrl}
                  </Typography.Text>
                </a>
              ) : (
                <Typography.Text type="secondary" italic>
                  No issue linked
                </Typography.Text>
              )}
            </div>

            {/* Pull Request URL */}
            <div>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Text type="secondary">Pull Request:</Typography.Text>
                {!editingPR && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditingPR(true)}
                  >
                    Edit
                  </Button>
                )}
              </Space>
              {editingPR ? (
                <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                  <Input
                    value={prUrl}
                    onChange={e => setPrUrl(e.target.value)}
                    placeholder="https://github.com/user/repo/pull/43"
                    prefix={<LinkOutlined />}
                  />
                  <Button type="primary" onClick={handleSavePR}>
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setPrUrl(worktree.pull_request_url || '');
                      setEditingPR(false);
                    }}
                  >
                    Cancel
                  </Button>
                </Space.Compact>
              ) : prUrl ? (
                <a href={prUrl} target="_blank" rel="noopener noreferrer">
                  <Typography.Text code style={{ fontSize: 12 }}>
                    {prUrl}
                  </Typography.Text>
                </a>
              ) : (
                <Typography.Text type="secondary" italic>
                  No pull request linked
                </Typography.Text>
              )}
            </div>

            {/* Notes */}
            <div>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Text type="secondary">Notes:</Typography.Text>
                {!editingNotes && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditingNotes(true)}
                  >
                    Edit
                  </Button>
                )}
              </Space>
              {editingNotes ? (
                <div style={{ marginTop: 4 }}>
                  <Typography.TextArea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Freeform notes about this worktree..."
                    rows={4}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Button type="primary" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setNotes(worktree.notes || '');
                        setEditingNotes(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </Space>
                </div>
              ) : notes ? (
                <Paragraph
                  style={{
                    background: token.colorBgLayout,
                    padding: 12,
                    borderRadius: token.borderRadius,
                    marginTop: 4,
                    marginBottom: 0,
                    border: `1px solid ${token.colorBorder}`,
                  }}
                >
                  {notes}
                </Paragraph>
              ) : (
                <Typography.Text type="secondary" italic>
                  No notes
                </Typography.Text>
              )}
            </div>
          </Space>
        </div>

        {/* Timestamps */}
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Created">
            {new Date(worktree.created_at).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Last Used">
            {worktree.last_used ? new Date(worktree.last_used).toLocaleString() : 'Never'}
          </Descriptions.Item>
        </Descriptions>

        {/* Actions */}
        <Space>
          <DeleteWorktreePopconfirm
            worktree={worktree}
            sessionCount={sessions.length}
            onConfirm={handleDelete}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete Worktree
            </Button>
          </DeleteWorktreePopconfirm>
          {/* TODO: Add "Open in Terminal" button once terminal integration is ready */}
        </Space>
      </Space>
    </div>
  );
};
