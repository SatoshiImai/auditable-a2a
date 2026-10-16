import { AMCP_SPEC_VERSION, type AuditEvent } from './amcp.js';

// §8.6: the record by which a Server Agent states that it did not perform an accepted access, or does
// not know whether it did. It is an a-MCP attempt and its `success` outcome, with a fixed shape.

export const EXECUTION_REPORT_ACTION_TYPE = 'a2a.execution-report';
export const EXECUTION = ['not-performed', 'indeterminate'] as const;
export type Execution = (typeof EXECUTION)[number];

export interface ExecutionReportInput {
  id: string;
  ts: string;
  sessionId: string;
  attemptId: string;
  execution: Execution;
}

export function executionReport(input: ExecutionReportInput, outcome: 'attempted' | 'success'): AuditEvent {
  return {
    id: input.id,
    spec_version: AMCP_SPEC_VERSION,
    ts: input.ts,
    session_id: input.sessionId,
    action_type: EXECUTION_REPORT_ACTION_TYPE,
    mutates: false,
    egress: false,
    target_resource: { kind: 'a2a.audit-session', ref: input.sessionId },
    outcome,
    // In the clear: the Client reads it (§8.6).
    action_context: { attemptId: input.attemptId, execution: input.execution },
  };
}
