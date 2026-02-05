/**
 * Version history timeline for a prompt template.
 */

import type { PromptTemplateVersion } from '@agor/core/types';
import { HistoryOutlined } from '@ant-design/icons';
import { List, Typography } from 'antd';

const { Text } = Typography;

interface VersionHistoryProps {
  versions: PromptTemplateVersion[];
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({ versions }) => {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  if (sorted.length === 0) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        No version history
      </Text>
    );
  }

  return (
    <List
      size="small"
      dataSource={sorted}
      renderItem={(v) => (
        <List.Item style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <HistoryOutlined style={{ fontSize: 12, opacity: 0.5 }} />
            <Text strong style={{ fontSize: 12 }}>
              v{v.version}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, flex: 1 }}>
              {v.change_note || 'No change note'}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {v.created_at.toLocaleDateString()}
            </Text>
          </div>
        </List.Item>
      )}
    />
  );
};
