/**
 * PromptArchitectModal — Multi-step prompt generation modal.
 *
 * Flow: Describe -> Clarify -> Review
 *
 * Uses the /prompt-architect service for AI-powered generation.
 */

import type { AgorClient } from '@agor/core/api';
import type {
  PromptArchitectClarifyResult,
  PromptArchitectGenerateResult,
  PromptArchitectTarget,
} from '@agor/core/types';
import {
  Button,
  Input,
  Modal,
  notification,
  Segmented,
  Select,
  Space,
  Steps,
  Typography,
} from 'antd';
import { useState } from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface PromptArchitectModalProps {
  target: PromptArchitectTarget;
  open: boolean;
  onClose: () => void;
  onComplete: (result: { title: string; template: string }) => void;
  client: AgorClient | null;
  boardId?: string;
}

type Step = 'describe' | 'clarify' | 'review';

export const PromptArchitectModal: React.FC<PromptArchitectModalProps> = ({
  target: initialTarget,
  open,
  onClose,
  onComplete,
  client,
  boardId,
}) => {
  const [step, setStep] = useState<Step>('describe');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<PromptArchitectTarget>(initialTarget);
  const [loading, setLoading] = useState(false);

  // Clarification state
  const [questions, setQuestions] = useState<PromptArchitectClarifyResult['questions']>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Result state
  const [result, setResult] = useState<PromptArchitectGenerateResult | null>(null);
  const [reviewMode, setReviewMode] = useState<'preview' | 'edit'>('preview');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepIndex = step === 'describe' ? 0 : step === 'clarify' ? 1 : 2;

  const reset = () => {
    setStep('describe');
    setDescription('');
    setTarget(initialTarget);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setReviewMode('preview');
    setLoading(false);
    setSaved(false);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleClarify = async () => {
    if (!client || !description.trim()) return;

    setLoading(true);
    try {
      const response = await client.service('prompt-architect').create({
        action: 'clarify',
        description: description.trim(),
        target,
      });
      const data = response as unknown as PromptArchitectClarifyResult;
      setQuestions(data.questions || []);
      setAnswers({});
      setStep('clarify');
    } catch (error) {
      notification.error({
        message: 'Failed to generate questions',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!client) return;

    setLoading(true);
    try {
      const response = await client.service('prompt-architect').create({
        action: 'generate',
        description: description.trim(),
        target,
        clarifications: answers,
      });
      const data = response as unknown as PromptArchitectGenerateResult;
      setResult(data);
      setStep('review');
    } catch (error) {
      notification.error({
        message: 'Failed to generate prompt',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGenerate = async () => {
    if (!client || !description.trim()) return;

    setLoading(true);
    try {
      const response = await client.service('prompt-architect').create({
        action: 'generate',
        description: description.trim(),
        target,
      });
      const data = response as unknown as PromptArchitectGenerateResult;
      setResult(data);
      setStep('review');
    } catch (error) {
      notification.error({
        message: 'Failed to generate prompt',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const buildSavePayload = () => {
    if (!result) return null;
    return {
      title: result.title,
      template: result.template,
      description: description.trim() || null,
      category: target,
      variables: result.variables_used ? JSON.stringify(result.variables_used) : null,
      metadata: JSON.stringify({
        original_description: description,
        clarifications: answers,
        target,
      }),
      board_id: boardId ?? null,
      created_by: 'anonymous',
    };
  };

  const saveToLibrary = async () => {
    if (!client || saved) return;
    const payload = buildSavePayload();
    if (!payload) return;

    setSaving(true);
    try {
      await client.service('prompt-templates').create(payload);
      setSaved(true);
      return true;
    } catch (error) {
      console.warn('Failed to auto-save template:', error);
      notification.warning({
        message: 'Template not saved to library',
        description: error instanceof Error ? error.message : 'Save failed',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUse = async () => {
    if (!result) return;
    await saveToLibrary();
    notification.success({ message: `Saved & inserted "${result.title}"` });
    onComplete({ title: result.title, template: result.template });
  };

  const handleSave = async () => {
    const ok = await saveToLibrary();
    if (ok && result) {
      notification.success({ message: `Saved "${result.title}" to library` });
    }
  };

  const renderDescribeStep = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Target Type
        </Text>
        <Select
          value={target}
          onChange={setTarget}
          style={{ width: '100%' }}
          options={[
            { value: 'zone', label: 'Zone Template (Handlebars)' },
            { value: 'session', label: 'Session Prompt (static)' },
            { value: 'scheduler', label: 'Scheduler Template (Handlebars)' },
          ]}
        />
      </div>
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Describe what this prompt should do
        </Text>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Review the current PR for code quality issues, check for security vulnerabilities, and suggest improvements..."
          autoSize={{ minRows: 4, maxRows: 10 }}
        />
      </div>
    </div>
  );

  const renderClarifyStep = () => (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Answer these questions to help generate a better prompt:
      </Paragraph>
      {questions.map((q) => (
        <div key={q.question} style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {q.question}
          </Text>
          {q.options && q.options.length > 0 ? (
            <Select
              value={answers[q.question] || undefined}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [q.question]: value }))}
              style={{ width: '100%' }}
              placeholder="Select an option..."
              options={q.options.map((opt) => ({ value: opt, label: opt }))}
              allowClear
            />
          ) : (
            <Input
              value={answers[q.question] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.question]: e.target.value }))}
              placeholder="Your answer..."
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderReviewStep = () => (
    <div>
      {result && (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Title:
            </Text>
            <Input
              value={result.title}
              onChange={(e) =>
                setResult((prev) => (prev ? { ...prev, title: e.target.value } : prev))
              }
            />
          </div>
          {result.variables_used && result.variables_used.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Text strong>Variables: </Text>
              <Text code>{result.variables_used.join(', ')}</Text>
            </div>
          )}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text strong>Generated Prompt:</Text>
              <Segmented
                size="small"
                value={reviewMode}
                onChange={(value) => setReviewMode(value as 'preview' | 'edit')}
                options={[
                  { value: 'preview', label: 'Preview' },
                  { value: 'edit', label: 'Edit' },
                ]}
              />
            </div>
            {reviewMode === 'preview' ? (
              <div
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6,
                  padding: 16,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                <MarkdownRenderer content={result.template} />
              </div>
            ) : (
              <TextArea
                value={result.template}
                onChange={(e) =>
                  setResult((prev) => (prev ? { ...prev, template: e.target.value } : prev))
                }
                autoSize={{ minRows: 8, maxRows: 24 }}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );

  const getFooter = () => {
    if (step === 'describe') {
      return (
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleDirectGenerate} loading={loading} disabled={!description.trim()}>
            Generate Directly
          </Button>
          <Button
            type="primary"
            onClick={handleClarify}
            loading={loading}
            disabled={!description.trim()}
          >
            Next: Clarify
          </Button>
        </Space>
      );
    }

    if (step === 'clarify') {
      return (
        <Space>
          <Button onClick={() => setStep('describe')}>Back</Button>
          <Button type="primary" onClick={handleGenerate} loading={loading}>
            Generate
          </Button>
        </Space>
      );
    }

    // Review step
    return (
      <Space>
        <Button onClick={() => setStep('describe')}>Start Over</Button>
        <Button onClick={handleSave} disabled={saved || saving}>
          {saved ? 'Saved' : 'Save to Library'}
        </Button>
        <Button type="primary" onClick={handleUse} loading={saving}>
          Use This Prompt
        </Button>
      </Space>
    );
  };

  return (
    <Modal
      title="Prompt Architect"
      open={open}
      onCancel={handleClose}
      footer={getFooter()}
      width={step === 'review' ? 800 : 700}
      destroyOnHidden
    >
      <Steps
        current={stepIndex}
        size="small"
        style={{ marginBottom: 24 }}
        items={[{ title: 'Describe' }, { title: 'Clarify' }, { title: 'Review' }]}
      />
      {step === 'describe' && renderDescribeStep()}
      {step === 'clarify' && renderClarifyStep()}
      {step === 'review' && renderReviewStep()}
    </Modal>
  );
};
