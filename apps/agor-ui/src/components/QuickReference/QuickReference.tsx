import {
  ApiOutlined,
  BgColorsOutlined,
  BookOutlined,
  BorderOutlined,
  CodeOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  FileMarkdownOutlined,
  ForkOutlined,
  FullscreenOutlined,
  PaperClipOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  SelectOutlined,
  SendOutlined,
  SettingOutlined,
  StarOutlined,
  StopOutlined,
  SubnodeOutlined,
} from '@ant-design/icons';
import { Button, Card, Typography, theme } from 'antd';
import type React from 'react';
import { useState } from 'react';

const { Text } = Typography;

const STORAGE_KEY = 'agor-quick-reference-collapsed';

interface LegendEntry {
  icon: React.ReactNode;
  label: string;
  hint?: string;
}

interface LegendSection {
  title: string;
  entries: LegendEntry[];
}

const sections: LegendSection[] = [
  {
    title: 'Canvas',
    entries: [
      { icon: <SelectOutlined />, label: 'Select' },
      { icon: <BorderOutlined />, label: 'Add Zone' },
      { icon: <CommentOutlined />, label: 'Add Comment' },
      { icon: <FileMarkdownOutlined />, label: 'Add Note' },
      { icon: <DeleteOutlined />, label: 'Eraser' },
      { icon: <FullscreenOutlined />, label: 'Fit View' },
    ],
  },
  {
    title: 'Worktree',
    entries: [
      { icon: <CodeOutlined />, label: 'Open Terminal' },
      { icon: <EditOutlined />, label: 'Edit Settings' },
      { icon: <DeleteOutlined />, label: 'Delete' },
    ],
  },
  {
    title: 'Session',
    entries: [
      { icon: <SendOutlined />, label: 'Send Prompt' },
      { icon: <ForkOutlined />, label: 'Fork Session' },
      { icon: <SubnodeOutlined />, label: 'Spawn Subsession' },
      { icon: <PaperClipOutlined />, label: 'Upload Files' },
      { icon: <ReloadOutlined />, label: 'Reset Conversation' },
      { icon: <StopOutlined />, label: 'Stop Execution' },
    ],
  },
  {
    title: 'Prompt Architect',
    entries: [
      {
        icon: <RobotOutlined />,
        label: 'Architect',
        hint: 'AI generates prompts from a description',
      },
      {
        icon: <BookOutlined />,
        label: 'Library',
        hint: 'Browse and reuse saved templates',
      },
      {
        icon: <StarOutlined />,
        label: 'Rate',
        hint: 'Rate prompts after a session ends',
      },
    ],
  },
  {
    title: 'Header',
    entries: [
      { icon: <BookOutlined />, label: 'Prompt Library' },
      { icon: <ApiOutlined />, label: 'Event Stream' },
      { icon: <BgColorsOutlined />, label: 'Theme' },
      { icon: <SettingOutlined />, label: 'Settings' },
      { icon: <QuestionCircleOutlined />, label: 'Documentation' },
    ],
  },
];

export const QuickReference: React.FC = () => {
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  };

  if (collapsed) {
    return (
      <Button
        type="text"
        size="small"
        icon={<QuestionCircleOutlined />}
        onClick={toggle}
        style={{
          position: 'absolute',
          bottom: 140,
          right: 10,
          zIndex: 5,
          background: token.colorBgElevated,
          border: `1px solid ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          opacity: 0.8,
        }}
      />
    );
  }

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 12 }}>
            Quick Reference
          </Text>
          <Button
            type="text"
            size="small"
            onClick={toggle}
            style={{ fontSize: 11, padding: '0 4px', height: 20 }}
          >
            Hide
          </Button>
        </div>
      }
      style={{
        position: 'absolute',
        bottom: 140,
        right: 10,
        zIndex: 5,
        width: 200,
        background: `${token.colorBgElevated}ee`,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${token.colorBorder}`,
        maxHeight: 420,
        overflow: 'auto',
      }}
      styles={{
        header: {
          padding: '4px 12px',
          minHeight: 32,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        },
        body: { padding: '4px 12px 8px' },
      }}
    >
      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 6 }}>
          <Text
            type="secondary"
            style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            {section.title}
          </Text>
          {section.entries.map((entry) => (
            <div
              key={entry.label}
              style={{
                display: 'flex',
                alignItems: entry.hint ? 'flex-start' : 'center',
                gap: 8,
                padding: '2px 0',
                fontSize: 12,
                color: token.colorText,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  width: 16,
                  textAlign: 'center',
                  color: token.colorTextSecondary,
                  marginTop: entry.hint ? 1 : 0,
                  flexShrink: 0,
                }}
              >
                {entry.icon}
              </span>
              <div>
                <Text style={{ fontSize: 12 }}>{entry.label}</Text>
                {entry.hint && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {entry.hint}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
};
