/**
 * PreprocessorPicker — multi-select checkbox list for picking preprocessor template fragments.
 *
 * Fetches templates with category='preprocessor' from the API, optionally filtering by
 * compatible_categories metadata. Shows a collapsible section with count badge.
 */

import type { AgorClient } from '@agor/core/api';
import type {
  PreprocessorMetadata,
  PromptTemplate,
  PromptTemplateCategory,
} from '@agor/core/types';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Badge, Button, Checkbox, Collapse, Empty, Spin, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Text, Paragraph } = Typography;

const PREPROCESSOR_TYPE_COLORS: Record<string, string> = {
  github_issue: 'magenta',
  plan: 'blue',
  environment: 'green',
  scheduling: 'orange',
  reference: 'cyan',
  custom: 'default',
};

interface PreprocessorPickerProps {
  client: AgorClient | null;
  targetCategory?: PromptTemplateCategory;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const PreprocessorPicker: React.FC<PreprocessorPickerProps> = ({
  client,
  targetCategory,
  selectedIds,
  onChange,
}) => {
  const [preprocessors, setPreprocessors] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPreprocessors = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const result = await client.service('prompt-templates').find({
        query: { category: 'preprocessor', $limit: 100 },
      });
      // biome-ignore lint/suspicious/noExplicitAny: Feathers pagination wrapper
      const raw = Array.isArray(result) ? result : (result as any).data || [];
      const templates = raw as PromptTemplate[];

      // Filter by compatible_categories if targetCategory is specified
      const filtered = targetCategory
        ? templates.filter((t) => {
            const meta = t.metadata as PreprocessorMetadata | null;
            if (!meta?.compatible_categories || meta.compatible_categories.length === 0) {
              return true; // No restriction = compatible with all
            }
            return meta.compatible_categories.includes(targetCategory);
          })
        : templates;

      setPreprocessors(filtered);
    } catch {
      // Silently fail — preprocessors are optional
    } finally {
      setLoading(false);
    }
  }, [client, targetCategory]);

  useEffect(() => {
    fetchPreprocessors();
  }, [fetchPreprocessors]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const idx = selectedIds.indexOf(id);
    if (idx < 0) return;
    const newIds = [...selectedIds];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newIds.length) return;
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
    onChange(newIds);
  };

  const items = [
    {
      key: 'preprocessors',
      label: (
        <span>
          Pre-Process Fragments{' '}
          {selectedIds.length > 0 && (
            <Badge count={selectedIds.length} size="small" style={{ marginLeft: 4 }} />
          )}
        </span>
      ),
      children: (
        <div>
          {loading && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin size="small" />
            </div>
          )}
          {!loading && preprocessors.length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No preprocessor fragments available"
              style={{ margin: '8px 0' }}
            />
          )}
          {!loading &&
            preprocessors.map((pp) => {
              const meta = pp.metadata as PreprocessorMetadata | null;
              const isSelected = selectedIds.includes(pp.template_id);
              const selectedIndex = selectedIds.indexOf(pp.template_id);

              return (
                <div
                  key={pp.template_id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '6px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleToggle(pp.template_id)}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {pp.title}
                      </Text>
                      {meta?.preprocessor_type && (
                        <Tag
                          color={PREPROCESSOR_TYPE_COLORS[meta.preprocessor_type] || 'default'}
                          style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
                        >
                          {meta.preprocessor_type.replace('_', ' ')}
                        </Tag>
                      )}
                      {meta?.insertion_mode === 'after' && (
                        <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                          after
                        </Tag>
                      )}
                    </div>
                    {pp.description && (
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 1 }}
                        style={{ marginBottom: 0, fontSize: 11 }}
                      >
                        {pp.description}
                      </Paragraph>
                    )}
                  </div>
                  {isSelected && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={selectedIndex === 0}
                        onClick={() => moveItem(pp.template_id, 'up')}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={selectedIndex === selectedIds.length - 1}
                        onClick={() => moveItem(pp.template_id, 'down')}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ),
    },
  ];

  return <Collapse ghost size="small" items={items} />;
};
