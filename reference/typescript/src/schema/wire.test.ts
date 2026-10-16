import { describe, expect, it } from 'vitest';
import { agentCardParamsSchema, auditRequestSchema, auditSubmissionSchema, sessionPositionSchema } from './wire.js';

const request = {
  auditEndpoint: { url: 'https://audit.example.com/a2a', authentication: { scheme: 'Bearer', credentials: 't' } },
  sessionId: '0199a3e0-7c1f-7a4e-9b1d-5f2f7e0c4a11',
  level: 'L1',
  countersign: 'none',
  expiresAt: '2026-11-15T00:00:00Z',
};

describe('presence rules the schemas carry as refinements', () => {
  it('a Level-2 Server Agent names its keys (§3.1)', () => {
    expect(agentCardParamsSchema.safeParse({ level: 'L2', countersign: 'none' }).success).toBe(false);
  });

  it('a countersigning audit host names its keys (§7.1)', () => {
    expect(auditRequestSchema.safeParse({ ...request, countersign: 'host' }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...request, countersign: 'host', hostKeys: 'https://a.example/k' }).success).toBe(true);
  });

  it('a submission carries exactly one of event, position, close (§6.1)', () => {
    expect(auditSubmissionSchema.safeParse({ taskId: 't', position: true }).success).toBe(true);
    expect(auditSubmissionSchema.safeParse({ taskId: 't', position: true, close: true }).success).toBe(false);
    expect(auditSubmissionSchema.safeParse({ taskId: 't' }).success).toBe(false);
  });

  it('the countersignature fields of a position travel together (a-MCP §7.1)', () => {
    const last = { seq: 1, host_ts: '2026-10-15T00:00:00Z', previous_hash: '0'.repeat(64), record_hash: '1'.repeat(64) };
    expect(sessionPositionSchema.safeParse({ last }).success).toBe(true);
    expect(sessionPositionSchema.safeParse({ last: { ...last, log_id: 'l' } }).success).toBe(false);
  });
});

describe('header values', () => {
  it('refuse a control character (§7.1)', () => {
    const injected = { ...request, auditEndpoint: { ...request.auditEndpoint, authentication: { scheme: 'Bearer', credentials: 'a\r\nX: y' } } };
    expect(auditRequestSchema.safeParse(injected).success).toBe(false);
  });
});
