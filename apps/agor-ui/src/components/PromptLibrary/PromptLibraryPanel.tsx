/**
 * Prompt Library drawer panel.
 *
 * Right-side drawer showing saved prompt templates with search, categories, and sort.
 */

import type { AgorClient } from '@agor/core/api';
import type { PromptTemplate, PromptTemplateCategory } from '@agor/core/types';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Empty, Skeleton, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { PromptArchitectModal } from '../PromptArchitect/PromptArchitectModal';
import { TemplateCard } from './TemplateCard';
import { TemplateSearch } from './TemplateSearch';

const { Text } = Typography;

interface PromptLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  client: AgorClient | null;
  boardId?: string;
  onUseTemplate?: (template: PromptTemplate) => void;
  defaultCategory?: PromptTemplateCategory | 'all';
}

export const PromptLibraryPanel: React.FC<PromptLibraryPanelProps> = ({
  open,
  onClose,
  client,
  boardId,
  onUseTemplate,
  defaultCategory = 'all',
}) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PromptTemplateCategory | 'all'>(defaultCategory);
  const [sort, setSort] = useState('quality_score');
  const [architectOpen, setArchitectOpen] = useState(false);

  // Sync category when defaultCategory prop changes
  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  const fetchTemplates = useCallback(async () => {
    if (!client || !open) return;

    setLoading(true);
    try {
      const query: Record<string, unknown> = {
        $sort: { [sort]: -1 },
        $limit: 50,
        is_latest: true,
      };
      if (category !== 'all') {
        query.category = category;
      }
      if (search) {
        query.search = search;
      }
      if (boardId) {
        query.board_id = boardId;
      }

      const result = await client.service('prompt-templates').find({ query });
      const data = (result as { data: PromptTemplate[] }).data ?? (result as PromptTemplate[]);
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [client, open, search, category, sort, boardId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleUse = (template: PromptTemplate) => {
    onUseTemplate?.(template);
    onClose();
  };

  const handleFork = async (template: PromptTemplate) => {
    if (!client) return;

    try {
      await client.service('prompt-templates').create({
        title: `${template.title} (fork)`,
        description: template.description,
        template: template.template,
        category: template.category,
        variables: template.variables ? JSON.stringify(template.variables) : null,
        parent_id: template.template_id,
        board_id: boardId ?? null,
        created_by: 'anonymous',
      });
      await fetchTemplates();
    } catch {
      // Error handled silently - templates list will refresh
    }
  };

  const handleArchitectComplete = async (result: { title: string; template: string }) => {
    // Template was created via the architect, refresh the list
    setArchitectOpen(false);
    await fetchTemplates();
  };

  return (
    <>
      <Drawer
        title="Prompt Library"
        placement="right"
        width={440}
        open={open}
        onClose={onClose}
        styles={{ body: { padding: 0 } }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setArchitectOpen(true)}
          >
            Create
          </Button>
        }
      >
        {/* Search & Filters */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <TemplateSearch
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
            onSortChange={setSort}
            category={category}
            sort={sort}
          />
        </div>

        {/* Template List */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', height: 'calc(100% - 180px)' }}>
          {loading ? (
            <>
              <Skeleton active paragraph={{ rows: 3 }} />
              <Skeleton active paragraph={{ rows: 3 }} />
            </>
          ) : templates.length === 0 ? (
            <Empty
              description={
                <div>
                  <Text type="secondary">No templates yet</Text>
                  <br />
                  <Button type="link" size="small" onClick={() => setArchitectOpen(true)}>
                    Create your first template
                  </Button>
                </div>
              }
              style={{ marginTop: 40 }}
            />
          ) : (
            templates.map((t) => (
              <TemplateCard
                key={t.template_id}
                template={t}
                onUse={handleUse}
                onFork={handleFork}
                client={client}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {templates.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '8px 24px',
              borderTop: '1px solid #f0f0f0',
              background: 'inherit',
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </Text>
          </div>
        )}
      </Drawer>

      <PromptArchitectModal
        target="zone"
        open={architectOpen}
        onClose={() => setArchitectOpen(false)}
        onComplete={handleArchitectComplete}
        client={client}
        boardId={boardId}
      />
    </>
  );
};
