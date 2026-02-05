/**
 * RatingWidget — Lightweight rating component for prompt templates.
 *
 * Shown when a session was created using a template from the library.
 * Displays template info and 5-star rating with optional feedback.
 */

import type { AgorClient } from '@agor/core/api';
import { RobotOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Input, notification, Popover, Rate, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;
const { TextArea } = Input;

interface RatingWidgetProps {
  templateId: string;
  templateTitle: string;
  templateVersion?: number;
  sessionId: string;
  client: AgorClient | null;
}

export const RatingWidget: React.FC<RatingWidgetProps> = ({
  templateId,
  templateTitle,
  templateVersion,
  sessionId,
  client,
}) => {
  const [rated, setRated] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (rated) return null;

  const handleSubmit = async () => {
    if (!client || rating === 0) return;

    setSubmitting(true);
    try {
      await client.service('prompt-ratings').create({
        template_id: templateId,
        session_id: sessionId,
        rating,
        feedback: feedback.trim() || null,
        rated_by: 'anonymous',
      });
      setRated(true);
      setPopoverOpen(false);
      notification.success({ message: 'Rating submitted' });
    } catch (error) {
      notification.error({
        message: 'Failed to submit rating',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ratingContent = (
    <div style={{ width: 260 }}>
      <div style={{ marginBottom: 12 }}>
        <Rate value={rating} onChange={setRating} />
      </div>
      <TextArea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="What would you improve? (optional)"
        autoSize={{ minRows: 2, maxRows: 4 }}
        style={{ marginBottom: 12 }}
      />
      <Button
        type="primary"
        size="small"
        onClick={handleSubmit}
        loading={submitting}
        disabled={rating === 0}
        block
      >
        Submit
      </Button>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 6,
        background: 'rgba(0, 0, 0, 0.02)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        fontSize: 12,
      }}
    >
      <RobotOutlined style={{ opacity: 0.5 }} />
      <Text type="secondary" style={{ fontSize: 12 }}>
        Built with Prompt Architect:{' '}
        <Text strong style={{ fontSize: 12 }}>
          {templateTitle}
        </Text>
        {templateVersion && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {' '}
            v{templateVersion}
          </Text>
        )}
      </Text>
      <Popover
        content={ratingContent}
        title="Rate this prompt"
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        <Button type="text" size="small" icon={<StarOutlined />}>
          Rate
        </Button>
      </Popover>
    </div>
  );
};
