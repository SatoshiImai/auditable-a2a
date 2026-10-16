import type { AgentCardParams, AuditRequest } from './schema/wire.js';

// §4.3 conditions 3 and 4: whether a Server Agent's declaration meets a Client's audit request.
// Conditions 1, 2 and 5 (the URI, a schema-valid request, an unused sessionId) are checked before.

export type Negotiation = { negotiated: true } | { negotiated: false; field: 'level' | 'countersign' };

export function negotiate(params: AgentCardParams, request: AuditRequest): Negotiation {
  // Level 2 meets both levels; Level 1 meets only Level 1 (a-MCP §6.1).
  if (request.level === 'L2' && params.level !== 'L2') return { negotiated: false, field: 'level' };
  // The countersignature axis runs the other way: the Server Agent requires, the audit host offers.
  if (params.countersign === 'host' && request.countersign !== 'host') return { negotiated: false, field: 'countersign' };
  return { negotiated: true };
}
