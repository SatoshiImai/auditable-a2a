import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  agentCardParamsSchema,
  auditRequestSchema,
  auditSessionSchema,
  auditStatusSchema,
  EXTENSION_URI,
} from './wire.js';

// The examples in the specification are valid against the schemas they illustrate.

// The normative sections only: §16 quotes excerpts of a capture, which are fragments of JSON rather than documents.
const SPEC = readFileSync(resolve(import.meta.dirname, '..', '..', '..', '..', 'spec', 'auditable-a2a.md'), 'utf8').split(
  '\n## 16. ',
)[0]!;
const examples: unknown[] = [...SPEC.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]!));

// A member of a parsed example, by path; undefined where the path does not lead.
function at(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((node, key) => (node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), value);
}

describe('the specification examples', () => {
  it('the Agent Card declaration', () => {
    expect(agentCardParamsSchema.safeParse(at(examples[0], 'params')).success).toBe(true);
  });

  it('the audit request', () => {
    expect(auditRequestSchema.safeParse(at(examples[1], 'metadata', EXTENSION_URI, 'auditRequest')).success).toBe(true);
  });

  it('the held Task', () => {
    const task = at(examples[2], 'task');
    expect(auditStatusSchema.safeParse(at(task, 'status', 'message', 'metadata', EXTENSION_URI, 'auditStatus')).success).toBe(true);
    expect(auditSessionSchema.safeParse(at(task, 'metadata', EXTENSION_URI, 'auditSession')).success).toBe(true);
  });
});
