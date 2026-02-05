/**
 * Prompt Architect Service
 *
 * AI-powered prompt generation service using Claude.
 * Supports two-step flow: clarify (ask questions) then generate (produce template).
 *
 * This is a custom service (not database-backed) like SchedulerService.
 */

import {
  ARCHITECT_CLARIFY_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  buildArchitectMessages,
  buildClarifyMessages,
} from '@agor/core/prompts/architect';
import type {
  PromptArchitectClarifyResult,
  PromptArchitectGenerateResult,
  PromptArchitectInput,
} from '@agor/core/types';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250929';

export class PromptArchitectService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'ANTHROPIC_API_KEY is not configured. Set it via: agor config set credentials.ANTHROPIC_API_KEY <key>'
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Main entry point — handles both clarify and generate actions.
   * Default action is 'generate' for backward compatibility.
   */
  async create(
    data: PromptArchitectInput
  ): Promise<PromptArchitectClarifyResult | PromptArchitectGenerateResult> {
    const action = data.action ?? 'generate';

    if (action === 'clarify') {
      return this.clarify(data);
    }

    return this.generate(data);
  }

  /**
   * Step 1: Generate clarifying questions based on the user's description.
   */
  private async clarify(data: PromptArchitectInput): Promise<PromptArchitectClarifyResult> {
    const client = this.getClient();
    const messages = buildClarifyMessages(data.description, data.target);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: ARCHITECT_CLARIFY_PROMPT,
      messages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    try {
      const parsed = JSON.parse(text) as PromptArchitectClarifyResult;
      return parsed;
    } catch {
      // If parsing fails, return a generic question set
      return {
        questions: [
          {
            question: 'Could you provide more detail about the specific task?',
            priority: 'high' as const,
          },
          {
            question: 'Are there any constraints or technologies to use/avoid?',
            priority: 'medium' as const,
          },
        ],
      };
    }
  }

  /**
   * Step 2: Generate the actual prompt template.
   */
  private async generate(data: PromptArchitectInput): Promise<PromptArchitectGenerateResult> {
    const client = this.getClient();
    const messages = buildArchitectMessages(data.description, data.target, data.clarifications);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: ARCHITECT_SYSTEM_PROMPT,
      messages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    try {
      const parsed = JSON.parse(text) as PromptArchitectGenerateResult;
      return {
        title: parsed.title ?? 'Untitled Template',
        template: parsed.template ?? text,
        variables_used: parsed.variables_used ?? [],
      };
    } catch {
      // If JSON parsing fails, treat the whole response as the template
      return {
        title: 'Generated Template',
        template: text,
        variables_used: [],
      };
    }
  }
}

/**
 * Service factory function
 */
export function createPromptArchitectService(): PromptArchitectService {
  return new PromptArchitectService();
}
