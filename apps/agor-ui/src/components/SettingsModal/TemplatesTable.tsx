/**
 * Templates Table — CRUD management for prompt templates in Settings.
 *
 * Self-contained: fetches data via client, handles edit/duplicate/delete,
 * and opens PromptArchitectModal for creating new templates.
 */

import type { AgorClient } from '@agor/core/api';
import type {
  PreprocessorMetadata,
  PromptTemplate,
  PromptTemplateCategory,
} from '@agor/core/types';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  StarFilled,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  notification,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PromptArchitectModal } from '../PromptArchitect/PromptArchitectModal';

const { TextArea } = Input;
const { Text } = Typography;

export interface TemplatesTableProps {
  client: AgorClient | null;
  boardId?: string;
}

type SortMode = 'best' | 'most_used' | 'newest' | 'top_rated';

const CATEGORY_COLORS: Record<PromptTemplateCategory, string> = {
  session: 'blue',
  zone: 'green',
  scheduler: 'purple',
  generic: 'default',
  preprocessor: 'magenta',
};

export const TemplatesTable: React.FC<TemplatesTableProps> = ({ client, boardId }) => {
  const { token } = theme.useToken();

  // Data state
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PromptTemplateCategory | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('best');

  // Architect modal
  const [architectOpen, setArchitectOpen] = useState(false);

  // Edit modal
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [editForm] = Form.useForm();
  const [editSaving, setEditSaving] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!client) return;
    try {
      setLoading(true);
      const result = await client.service('prompt-templates').find({ query: { $limit: 500 } });
      // biome-ignore lint/suspicious/noExplicitAny: Feathers pagination wrapper
      const data = (result as any).data ?? result;
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      notification.error({
        message: 'Failed to load templates',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filtered + sorted list
  const filteredTemplates = useMemo(() => {
    let list = [...templates];

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((t) => t.category === categoryFilter);
    }

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.template.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortMode) {
      case 'most_used':
        list.sort((a, b) => b.usage_count - a.usage_count);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'top_rated':
        list.sort((a, b) => b.avg_rating - a.avg_rating);
        break;
      case 'best':
      default: {
        const now = Date.now();
        const score = (t: PromptTemplate) => {
          const recency = Math.max(
            0,
            1 - (now - new Date(t.created_at).getTime()) / (90 * 86400000)
          );
          return t.avg_rating * 0.6 + Math.log2(t.usage_count + 1) * 0.3 + recency * 0.1;
        };
        list.sort((a, b) => score(b) - score(a));
        break;
      }
    }

    return list;
  }, [templates, categoryFilter, search, sortMode]);

  // Duplicate
  const handleDuplicate = async (template: PromptTemplate) => {
    if (!client) return;
    try {
      await client.service('prompt-templates').create({
        title: `${template.title} (copy)`,
        template: template.template,
        description: template.description,
        category: template.category,
        variables: template.variables ?? null,
        metadata: template.metadata ?? null,
        parent_id: template.template_id,
        board_id: template.board_id ?? boardId ?? null,
        created_by: 'anonymous',
      });
      notification.success({ message: `Duplicated "${template.title}"` });
      fetchTemplates();
    } catch (err) {
      notification.error({
        message: 'Failed to duplicate template',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  // Delete
  const handleDelete = async (template: PromptTemplate) => {
    if (!client) return;
    try {
      await client.service('prompt-templates').remove(template.template_id);
      notification.success({ message: `Deleted "${template.title}"` });
      fetchTemplates();
    } catch (err) {
      notification.error({
        message: 'Failed to delete template',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  // Edit
  const openEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    const meta = template.metadata as PreprocessorMetadata | null;
    editForm.setFieldsValue({
      title: template.title,
      description: template.description ?? '',
      category: template.category,
      template: template.template,
      change_note: '',
      preprocessor_type: meta?.preprocessor_type ?? 'custom',
      compatible_categories: meta?.compatible_categories ?? [],
      insertion_mode: meta?.insertion_mode ?? 'before',
    });
  };

  const handleEditSave = async () => {
    if (!client || !editingTemplate) return;
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);

      // Build metadata — merge preprocessor fields if category is 'preprocessor'
      let metadata = editingTemplate.metadata || {};
      if (values.category === 'preprocessor') {
        metadata = {
          ...metadata,
          preprocessor_type: values.preprocessor_type,
          compatible_categories:
            values.compatible_categories?.length > 0 ? values.compatible_categories : undefined,
          insertion_mode: values.insertion_mode,
        } as PreprocessorMetadata;
      }

      await client.service('prompt-templates').patch(editingTemplate.template_id, {
        title: values.title,
        description: values.description || null,
        category: values.category,
        template: values.template,
        change_note: values.change_note || null,
        metadata,
      });
      notification.success({ message: `Updated "${values.title}"` });
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      if (err instanceof Error) {
        notification.error({
          message: 'Failed to update template',
          description: err.message,
        });
      }
    } finally {
      setEditSaving(false);
    }
  };

  // Architect complete callback
  const handleArchitectComplete = () => {
    setArchitectOpen(false);
    fetchTemplates();
  };

  // Table columns
  const columns: ColumnsType<PromptTemplate> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record) => (
        <Typography.Link onClick={() => openEdit(record)}>{title}</Typography.Link>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (cat: PromptTemplateCategory) => <Tag color={CATEGORY_COLORS[cat]}>{cat}</Tag>,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center',
      render: (v: number) => `v${v}`,
    },
    {
      title: 'Uses',
      dataIndex: 'usage_count',
      key: 'usage_count',
      width: 70,
      align: 'center',
    },
    {
      title: 'Rating',
      dataIndex: 'avg_rating',
      key: 'avg_rating',
      width: 90,
      align: 'center',
      render: (rating: number) =>
        rating > 0 ? (
          <Space size={4}>
            <StarFilled style={{ color: '#faad14', fontSize: 12 }} />
            <span>{rating.toFixed(1)}</span>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicate(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this template?"
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: token.paddingLG * 2 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Templates
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setArchitectOpen(true)}>
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search templates..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 240 }}
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 140 }}
          options={[
            { value: 'all', label: 'All categories' },
            { value: 'session', label: 'Session' },
            { value: 'zone', label: 'Zone' },
            { value: 'scheduler', label: 'Scheduler' },
            { value: 'generic', label: 'Generic' },
            { value: 'preprocessor', label: 'Pre-Process' },
          ]}
        />
        <Select
          value={sortMode}
          onChange={setSortMode}
          style={{ width: 130 }}
          options={[
            { value: 'best', label: 'Best' },
            { value: 'most_used', label: 'Most Used' },
            { value: 'newest', label: 'Newest' },
            { value: 'top_rated', label: 'Top Rated' },
          ]}
        />
      </Space>

      {/* Table */}
      <Table
        dataSource={filteredTemplates}
        columns={columns}
        rowKey="template_id"
        size="small"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{
          emptyText: (
            <Empty description="No templates yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" onClick={() => setArchitectOpen(true)}>
                Create your first template
              </Button>
            </Empty>
          ),
        }}
      />

      {/* Architect Modal */}
      <PromptArchitectModal
        target="session"
        open={architectOpen}
        onClose={() => setArchitectOpen(false)}
        onComplete={handleArchitectComplete}
        client={client}
        boardId={boardId}
      />

      {/* Edit Modal */}
      <Modal
        title="Edit Template"
        open={!!editingTemplate}
        onCancel={() => setEditingTemplate(null)}
        onOk={handleEditSave}
        okText="Save"
        confirmLoading={editSaving}
        width={700}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'session', label: 'Session' },
                { value: 'zone', label: 'Zone' },
                { value: 'scheduler', label: 'Scheduler' },
                { value: 'generic', label: 'Generic' },
                { value: 'preprocessor', label: 'Pre-Process Fragment' },
              ]}
            />
          </Form.Item>

          {/* Preprocessor-specific fields — only shown when category is 'preprocessor' */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.category !== cur.category}>
            {({ getFieldValue }) =>
              getFieldValue('category') === 'preprocessor' ? (
                <>
                  <Form.Item name="preprocessor_type" label="Preprocessor Type">
                    <Select
                      options={[
                        { value: 'github_issue', label: 'GitHub Issue' },
                        { value: 'plan', label: 'Plan Pattern' },
                        { value: 'environment', label: 'Environment' },
                        { value: 'scheduling', label: 'Scheduling' },
                        { value: 'reference', label: 'Reference' },
                        { value: 'custom', label: 'Custom' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="compatible_categories" label="Compatible With">
                    <Select
                      mode="multiple"
                      placeholder="All categories (leave empty for universal)"
                      options={[
                        { value: 'session', label: 'Session' },
                        { value: 'zone', label: 'Zone' },
                        { value: 'scheduler', label: 'Scheduler' },
                        { value: 'generic', label: 'Generic' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="insertion_mode" label="Insertion Mode">
                    <Radio.Group>
                      <Radio value="before">Before main template</Radio>
                      <Radio value="after">After main template</Radio>
                    </Radio.Group>
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="template"
            label="Template"
            rules={[{ required: true, message: 'Template content is required' }]}
          >
            <TextArea
              autoSize={{ minRows: 8, maxRows: 20 }}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </Form.Item>
          <Form.Item name="change_note" label="Change Note">
            <Input placeholder="Describe what you changed (for version history)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
