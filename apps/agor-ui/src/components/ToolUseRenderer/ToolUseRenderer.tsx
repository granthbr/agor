/**
 * ToolUseRenderer - Displays tool invocations and results
 *
 * Renders tool_use and tool_result content blocks with:
 * - Tool name and icon
 * - Collapsible input parameters
 * - Tool output/result
 * - Error states
 * - Syntax highlighting for code
 */

import type { Message } from '@agor/core/types';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Collapse, Tag, Typography } from 'antd';
import type React from 'react';
import { ToolIcon } from '../ToolIcon';
import './ToolUseRenderer.css';

const { Text, Paragraph } = Typography;

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

type ContentBlock = { type: 'text'; text: string } | ToolUseBlock | ToolResultBlock;

interface ToolUseRendererProps {
  /**
   * Tool use block with invocation details
   */
  toolUse: ToolUseBlock;

  /**
   * Optional tool result block
   */
  toolResult?: ToolResultBlock;
}

export const ToolUseRenderer: React.FC<ToolUseRendererProps> = ({ toolUse, toolResult }) => {
  const { name, input } = toolUse;
  const isError = toolResult?.is_error;

  // Extract text content from tool result
  const getResultText = (): string => {
    if (!toolResult) return '';

    if (typeof toolResult.content === 'string') {
      return toolResult.content;
    }

    if (Array.isArray(toolResult.content)) {
      return toolResult.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map(block => block.text)
        .join('\n\n');
    }

    return '';
  };

  const resultText = getResultText();

  return (
    <div className="tool-use-renderer">
      <div className="tool-header">
        <ToolIcon tool={name} size={16} />
        <Text strong style={{ marginLeft: 8 }}>
          {name}
        </Text>
        {toolResult &&
          (isError ? (
            <Tag icon={<CloseCircleOutlined />} color="error" style={{ marginLeft: 8 }}>
              Error
            </Tag>
          ) : (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ marginLeft: 8 }}>
              Success
            </Tag>
          ))}
      </div>

      {/* Tool Input Parameters */}
      <Collapse
        size="small"
        ghost
        items={[
          {
            key: 'input',
            label: (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CodeOutlined /> Input Parameters
              </Text>
            ),
            children: <pre className="tool-input">{JSON.stringify(input, null, 2)}</pre>,
          },
        ]}
        expandIcon={({ isActive }) => (isActive ? <DownOutlined /> : <RightOutlined />)}
      />

      {/* Tool Result */}
      {toolResult && (
        <div className={`tool-result ${isError ? 'tool-result-error' : 'tool-result-success'}`}>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
            Output:
          </Text>
          <Paragraph
            ellipsis={{ rows: 10, expandable: true, symbol: 'show more' }}
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              margin: 0,
            }}
          >
            {resultText}
          </Paragraph>
        </div>
      )}
    </div>
  );
};
