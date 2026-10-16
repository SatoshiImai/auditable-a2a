import { z } from 'zod/v4';
import {
  agentCardParamsSchema,
  auditCredentialsSchema,
  auditRequestSchema,
  auditSessionSchema,
  auditStatusSchema,
  auditSubmissionSchema,
  executionReportContextSchema,
  sessionPositionSchema,
} from './wire.js';

// Zod does not emit refinements to JSON Schema, so each presence rule the Zod schemas carry as a
// refinement (wire.ts) is added to the emission here, in the form JSON Schema writes it.

type Schema = Record<string, unknown>;

// A JavaScript RegExp's `source` escapes `/`, which JSON Schema's ECMA-262 patterns do not need; the
// emitted patterns are written without it, as a reader expects them.
function unescapeSlashes(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(unescapeSlashes);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.pattern === 'string') obj.pattern = obj.pattern.replaceAll('\\/', '/');
  Object.values(obj).forEach(unescapeSlashes);
}

function emit(schema: z.ZodType): Schema {
  const emitted = z.toJSONSchema(schema) as Schema;
  unescapeSlashes(emitted);
  return emitted;
}

// §3.1: a Level-2 Server Agent names its keys.
function withAttestationKeysRule(schema: Schema): Schema {
  return {
    ...schema,
    if: { properties: { level: { const: 'L2' } } },
    then: { required: ['attestationKeys'] },
  };
}

// §7.1: a countersigning audit host names its keys.
function withHostKeysRule(schema: Schema): Schema {
  return {
    ...schema,
    if: { properties: { countersign: { const: 'host' } } },
    then: { required: ['hostKeys'] },
  };
}

// §6.1: exactly one of event, position, close.
function withOneSubmissionKind(schema: Schema): Schema {
  return { ...schema, oneOf: [{ required: ['event'] }, { required: ['position'] }, { required: ['close'] }] };
}

// a-MCP §7.1: the countersignature fields appear together or not at all.
const COUNTERSIGNATURE_TRIPLE = {
  log_id: ['host_signature', 'host_key_id'],
  host_signature: ['log_id', 'host_key_id'],
  host_key_id: ['log_id', 'host_signature'],
};

function withCountersignatureRule(schema: Schema): Schema {
  const last = (schema.properties as { last: { anyOf: Schema[] } }).last;
  for (const branch of last.anyOf) {
    if (branch.type === 'object') branch.dependentRequired = COUNTERSIGNATURE_TRIPLE;
  }
  return schema;
}

// JSON Schema materialized from the Zod source of truth. The emitter (emitJsonSchema.ts) and the drift
// fence (schemaTargets.test.ts) both read this list, so the committed spec/schema/*.json cannot diverge
// from it undetected.
export const SCHEMA_TARGETS: ReadonlyArray<readonly [string, Schema]> = [
  ['agent-card-params.schema.json', withAttestationKeysRule(emit(agentCardParamsSchema))],
  ['audit-request.schema.json', withHostKeysRule(emit(auditRequestSchema))],
  ['audit-session.schema.json', emit(auditSessionSchema)],
  ['audit-status.schema.json', emit(auditStatusSchema)],
  ['audit-credentials.schema.json', emit(auditCredentialsSchema)],
  ['audit-submission.schema.json', withOneSubmissionKind(emit(auditSubmissionSchema))],
  ['session-position.schema.json', withCountersignatureRule(emit(sessionPositionSchema))],
  ['execution-report-context.schema.json', emit(executionReportContextSchema)],
];
