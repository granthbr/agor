/**
 * Compact card for a prompt template in the library.
 */

import type { AgorClient } from '@agor/core/api';
import type { PromptTemplate, PromptTemplateVersion } from '@agor/core/types';
import { CopyOutlined, ForkOutlined, HistoryOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Badge, Button, Card, notification, Rate, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { VersionHistory } from './VersionHistory';

const { Text, Paragraph } = Typography;

interface TemplateCardProps {
  template: PromptTemplate;
  onUse: (template: PromptTemplate) => void;
  onFork?: (template: PromptTemplate) => void;
  client: AgorClient | null;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onUse, onFork, client }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<PromptTemplateVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleViewHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    if (!client) return;

    setLoadingHistory(true);
    try {
      // Fetch version history via custom service method
      await client.service('prompt-templates').get(template.template_id);
      // For now, just show the current template. Real version history would need a custom endpoint.
      setVersions([]);
      setShowHistory(true);
    } catch (error) {
      notification.error({
        message: 'Failed to load version history',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(template.template);
    notification.success({ message: 'Template copied to clipboard' });
  };

  const categoryColors: Record<string, string> = {
    zone: 'blue',
    session: 'green',
    scheduler: 'orange',
    generic: 'default',
    preprocessor: 'purple',
  };

  return (
    <Card size="small" style={{ marginBottom: 8 }} styles={{ body: { padding: '12px 16px' } }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong ellipsis style={{ maxWidth: 200 }}>
              {template.title}
            </Text>
            <Badge
              count={template.category}
              style={{
                backgroundColor:
                  categoryColors[template.category] === 'default' ? '#d9d9d9' : undefined,
                fontSize: 10,
              }}
              color={categoryColors[template.category]}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              v{template.version}
            </Text>
          </div>
          {template.description && (
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 2 }}
              style={{ marginBottom: 8, fontSize: 12 }}
            >
              {template.description}
            </Paragraph>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Rate disabled value={template.avg_rating} allowHalf style={{ fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {template.usage_count} uses
            </Text>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        <Tooltip title="Use this template">
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => onUse(template)}
          >
            Use
          </Button>
        </Tooltip>
        <Tooltip title="Copy to clipboard">
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopy} />
        </Tooltip>
        {onFork && (
          <Tooltip title="Fork this template">
            <Button size="small" icon={<ForkOutlined />} onClick={() => onFork(template)} />
          </Tooltip>
        )}
        <Tooltip title="Version history">
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={handleViewHistory}
            loading={loadingHistory}
          />
        </Tooltip>
      </div>

      {showHistory && (
        <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <VersionHistory versions={versions} />
        </div>
      )}
    </Card>
  );
};
