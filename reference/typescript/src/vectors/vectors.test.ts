import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditEventSchema, canonicalize, sha256Hex } from '../amcp.js';
import { executionReport } from '../executionReport.js';
import { keyIdOf } from '../keys.js';
import { negotiate } from '../negotiate.js';
import { SPEC_VECTORS_DIR } from '../paths.js';
import { checkPosition } from '../position.js';

// Vector fence: the committed vectors under spec/vectors/ are what this reference computes. A change
// to the reference without `npm run vectors` fails here.

function load<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(SPEC_VECTORS_DIR, file), 'utf8')) as T;
}

describe('negotiation (§4.3)', () => {
  for (const c of load<Array<{ name: string; params: never; request: never; expected: unknown }>>('negotiation.json')) {
    it(c.name, () => expect(negotiate(c.params, c.request)).toEqual(c.expected));
  }
});

describe('key ids (§10.2)', () => {
  for (const c of load<Array<{ jwks: string; kid: string; key_id: string }>>('key-id.json')) {
    it(c.key_id, () => expect(keyIdOf(c.jwks, c.kid)).toBe(c.key_id));
  }

  it('refuses a JWKS URL with a fragment', () => {
    expect(() => keyIdOf('https://agent.example.com/jwks.json#x', 'k1')).toThrow();
  });
});

describe('execution reports (§8.6)', () => {
  type Vector = { name: string; input: never; outcome: 'attempted' | 'success'; event: unknown; canonical: string; sha256: string };
  for (const c of load<Vector[]>('execution-report.json')) {
    it(c.name, () => {
      const event = executionReport(c.input, c.outcome);
      expect(event).toEqual(c.event);
      expect(auditEventSchema.safeParse(event).success).toBe(true);
      expect(canonicalize(event)).toBe(c.canonical);
      expect(sha256Hex(c.canonical)).toBe(c.sha256);
    });
  }
});

describe('the position check on resumption (§5.5)', () => {
  for (const c of load<Array<{ name: string; position: never; held: never; expected: unknown }>>('position-check.json')) {
    it(c.name, () => expect(checkPosition(c.position, c.held)).toEqual(c.expected));
  }
});
