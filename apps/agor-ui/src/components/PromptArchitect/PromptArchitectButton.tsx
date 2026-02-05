/**
 * Trigger button for the Prompt Architect modal.
 * Renders a small button that opens the PromptArchitectModal.
 */

import type { AgorClient } from '@agor/core/api';
import type { PromptArchitectTarget } from '@agor/core/types';
import { RobotOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { PromptArchitectModal } from './PromptArchitectModal';

interface PromptArchitectButtonProps {
  target: PromptArchitectTarget;
  onComplete: (result: { title: string; template: string }) => void;
  client: AgorClient | null;
  boardId?: string;
}

export const PromptArchitectButton: React.FC<PromptArchitectButtonProps> = ({
  target,
  onComplete,
  client,
  boardId,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="dashed" icon={<RobotOutlined />} onClick={() => setOpen(true)} size="small">
        Architect
      </Button>
      <PromptArchitectModal
        target={target}
        open={open}
        onClose={() => setOpen(false)}
        onComplete={(result) => {
          onComplete(result);
          setOpen(false);
        }}
        client={client}
        boardId={boardId}
      />
    </>
  );
};
