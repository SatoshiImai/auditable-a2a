import { executionReport } from '../executionReport.js';
import type { AuditEvent } from '../amcp.js';
import { AMCP_SPEC_VERSION } from '../amcp.js';
import type { AgentCardParams } from '../schema/wire.js';

// Fixed inputs for the generated conformance vectors. Every id is a fixed UUID so the vectors are
// byte-stable across regenerations.

export const SESSION = '0199a3e0-7c1f-7a4e-9b1d-5f2f7e0c4a11';
export const ATTEMPT = '0199a3e1-0b2c-7d3e-8f40-1a2b3c4d5e6f';

function id(n: number): string {
  return `0199a3e1-0000-7000-8000-${n.toString(16).padStart(12, '0')}`;
}

export const NEGOTIATION_CASES: Array<{
  name: string;
  params: AgentCardParams;
  request: { level: 'L1' | 'L2'; countersign: 'none' | 'host' };
}> = [
  { name: 'l2-agent-serves-l1', params: { level: 'L2', countersign: 'none', attestationKeys: 'https://agent.example.com/jwks.json' }, request: { level: 'L1', countersign: 'none' } },
  { name: 'l2-agent-serves-l2', params: { level: 'L2', countersign: 'none', attestationKeys: 'https://agent.example.com/jwks.json' }, request: { level: 'L2', countersign: 'none' } },
  { name: 'l1-agent-refuses-l2', params: { level: 'L1', countersign: 'none' }, request: { level: 'L2', countersign: 'none' } },
  { name: 'agent-requiring-countersign-refuses-none', params: { level: 'L1', countersign: 'host' }, request: { level: 'L1', countersign: 'none' } },
  { name: 'agent-requiring-countersign-takes-host', params: { level: 'L1', countersign: 'host' }, request: { level: 'L1', countersign: 'host' } },
  { name: 'agent-requiring-none-takes-host', params: { level: 'L1', countersign: 'none' }, request: { level: 'L1', countersign: 'host' } },
];

export const KEY_ID_CASES = [
  { jwks: 'https://agent.example.com/.well-known/jwks.json', kid: 'k1' },
  { jwks: 'https://audit.client.example.com/keys', kid: '2026-10#a' },
];

export const EXECUTION_REPORT_CASES = (['not-performed', 'indeterminate'] as const).map((execution, i) => ({
  name: execution,
  input: { id: id(100 + i), ts: '2026-10-15T00:00:00.000Z', sessionId: SESSION, attemptId: ATTEMPT, execution },
}));

// One session's events, in the order a Server Agent emitted them, for the position checks (§5.5).
export function sessionEvents(): AuditEvent[] {
  const base = {
    spec_version: AMCP_SPEC_VERSION,
    session_id: SESSION,
    mutates: false,
    egress: false,
    target_resource: { kind: 'table', ref: 'customers' },
  };
  return [
    { ...base, id: id(1), ts: '2026-10-15T00:00:01.000Z', action_type: 'db.read', outcome: 'attempted' },
    { ...base, id: id(1), ts: '2026-10-15T00:00:02.000Z', action_type: 'db.read', outcome: 'success' },
    { ...base, id: id(2), ts: '2026-10-15T00:00:03.000Z', action_type: 'db.read', outcome: 'attempted' },
    executionReport({ id: id(3), ts: '2026-10-15T00:00:04.000Z', sessionId: SESSION, attemptId: id(2), execution: 'indeterminate' }, 'attempted'),
  ] as AuditEvent[];
}
