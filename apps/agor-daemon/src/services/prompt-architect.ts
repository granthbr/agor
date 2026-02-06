/**
 * Prompt Architect Service
 *
 * AI-powered prompt generation service using Claude.
 * Supports two-step flow: clarify (ask questions) then generate (produce template).
 *
 * Dual-backend strategy:
 * - If ANTHROPIC_API_KEY is available → uses @anthropic-ai/sdk Messages API (fast)
 * - If no API key → uses Claude Agent SDK query() which supports OAuth login
 *
 * This is a custom service (not database-backed) like SchedulerService.
 */

import { resolveApiKeySync } from '@agor/core/config';
import {
  ARCHITECT_CLARIFY_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  buildArchitectMessages,
  buildClarifyMessages,
  buildClarifyUserPrompt,
  buildGenerateUserPrompt,
} from '@agor/core/prompts/architect';
import { Claude } from '@agor/core/sdk';
import type {
  PromptArchitectClarifyResult,
  PromptArchitectGenerateResult,
  PromptArchitectInput,
} from '@agor/core/types';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250929';

export class PromptArchitectService {
  private client: Anthropic | null = null;

  /**
   * Resolve API key from config.yaml + environment.
   * Returns the key if found, or null if SDK should use native auth (OAuth).
   */
  private getApiKey(): string | null {
    const result = resolveApiKeySync('ANTHROPIC_API_KEY');
    if (result.apiKey) {
      return result.apiKey;
    }
    return null;
  }

  /**
   * Get or create the Anthropic SDK client (only used when API key is available).
   */
  private getClient(apiKey: string): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Call Claude via the Messages API (requires API key).
   * This is the fast path — direct HTTP call, no subprocess overhead.
   */
  private async callViaMessagesAPI(
    apiKey: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: number
  ): Promise<string> {
    const client = this.getClient(apiKey);
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  /**
   * Call Claude via the Agent SDK (uses OAuth/native auth, no API key needed).
   * One-shot pattern: single prompt, maxTurns=1, no tools.
   */
  private async callViaAgentSDK(systemPrompt: string, userPrompt: string): Promise<string> {
    const { query } = Claude;
    const conversation = query({
      prompt: userPrompt,
      options: {
        model: MODEL,
        systemPrompt,
        permissionMode: 'default' as Claude.PermissionMode,
        maxTurns: 1,
      },
    });

    let text = '';
    for await (const msg of conversation) {
      if (msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content as Array<{ type: string; text?: string }>) {
          if (block.type === 'text' && block.text) {
            text += block.text;
          }
        }
      }
    }
    return text;
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
    const apiKey = this.getApiKey();
    let text: string;

    if (apiKey) {
      const messages = buildClarifyMessages(data.description, data.target);
      text = await this.callViaMessagesAPI(apiKey, ARCHITECT_CLARIFY_PROMPT, messages, 1024);
    } else {
      const userPrompt = buildClarifyUserPrompt(data.description, data.target);
      text = await this.callViaAgentSDK(ARCHITECT_CLARIFY_PROMPT, userPrompt);
    }

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
    const apiKey = this.getApiKey();
    let text: string;

    if (apiKey) {
      const messages = buildArchitectMessages(data.description, data.target, data.clarifications);
      text = await this.callViaMessagesAPI(apiKey, ARCHITECT_SYSTEM_PROMPT, messages, 4096);
    } else {
      const userPrompt = buildGenerateUserPrompt(
        data.description,
        data.target,
        data.clarifications
      );
      text = await this.callViaAgentSDK(ARCHITECT_SYSTEM_PROMPT, userPrompt);
    }

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
