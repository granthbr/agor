/**
 * Compose a main template with preprocessor fragments.
 *
 * Preprocessors are inserted before or after the main template based on their
 * metadata.insertion_mode (defaults to 'before'). Fragments are joined with
 * a horizontal rule separator.
 */
export function composeTemplate(
  mainTemplate: string,
  preprocessors: Array<{
    template: string;
    metadata?: { insertion_mode?: 'before' | 'after' } | null;
  }>
): string {
  const before: string[] = [];
  const after: string[] = [];

  for (const pp of preprocessors) {
    const mode = pp.metadata?.insertion_mode ?? 'before';
    if (mode === 'after') {
      after.push(pp.template);
    } else {
      before.push(pp.template);
    }
  }

  return [...before, mainTemplate, ...after].filter(Boolean).join('\n\n---\n\n');
}
