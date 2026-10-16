// The parts of Auditable MCP this extension builds on (§15): the event schema, canonicalization, the
// record hash, and the ledger. They are a-MCP's own reference, imported rather than restated, so a
// change to a-MCP reaches this reference without a copy to keep in step.
export { auditEventSchema, SPEC_VERSION as AMCP_SPEC_VERSION, type AuditEvent } from 'auditable-mcp-reference/src/schema/event.js';
export { canonicalize, sha256Hex } from 'auditable-mcp-reference/src/ledger/canonical.js';
export { computeRecordHash, GENESIS_HASH, Ledger, type SealedRecord } from 'auditable-mcp-reference/src/ledger/ledger.js';
