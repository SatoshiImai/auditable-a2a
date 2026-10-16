import { z } from 'zod/v4';

// The structures this extension puts on the A2A wire and at the audit endpoint (§3.1, §6, §7). This
// file is the source of truth: spec/schema/*.json is emitted from it (schemaTargets.ts). Patterns the
// extension shares with Auditable MCP are written as a-MCP writes them, so one timestamp or UUID is one
// contract across both specifications.

export const EXTENSION_URI = 'https://timberlandchapel.com/a2a/extensions/auditable-a2a/0.1';

// a-MCP's audit session id: a lowercase RFC 9562 UUID of versions 1-8, never nil (a-MCP §6.3).
export const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// a-MCP's event id: the same, or the nil UUID (a-MCP §4).
export const EVENT_ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/;
// An https URL without a fragment: a JWKS URL is joined to a `kid` with `#` to form a key id (§10.2).
const HTTPS_NO_FRAGMENT = new RegExp('^https://[^#]+$');
const HTTPS = new RegExp('^https://');
// No control characters (§7.1).
const NO_CONTROL = /^[^\u0000-\u001f\u007f]+$/;
// What `Authorization: {scheme} {credentials}` can carry (§6.1): an auth-scheme is a token, and credentials are
// visible ASCII with inner spaces (RFC 9110 §5.6.2, §11.4).
const AUTH_SCHEME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const AUTH_CREDENTIALS = /^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/;
// a-MCP's timestamp: an RFC 3339 date-time in UTC with a `Z` suffix, seconds required (a-MCP §4).
const DATETIME =
  /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$/;
const dateTime = z.string().regex(DATETIME).meta({ format: 'date-time' });

export const LEVEL = ['L1', 'L2'] as const;
export const COUNTERSIGN = ['none', 'host'] as const;

// a-MCP Tier-1 abort codes (a-MCP §7.2, §7.6): why a Task is held (§7.3).
export const ABORT_REASON = ['host-unavailable', 'host-rejected', 'host-uncountersigned', 'host-signature-invalid', 'hash-mismatch'] as const;
// a-MCP Tier-1 host reject and unavailable codes (a-MCP §7.6): what the audit host answered (§7.3).
export const HOST_REASON = ['schema-invalid', 'replay-detected', 'signature-invalid', 'l2-unsigned', 'unknown-key', 'internal-error'] as const;

// `format: "uri"` is stated alongside the pattern, as a-MCP states `format: "date-time"` alongside its
// timestamp pattern. Zod drops the format once a pattern is added, so it is restated in `meta`.
const httpsUrlNoFragment = z.url().regex(HTTPS_NO_FRAGMENT).meta({ format: 'uri' });

// §3.1: the Agent Card's `params`.
export const agentCardParamsSchema = z
  .strictObject({
    level: z.enum(LEVEL),
    countersign: z.enum(COUNTERSIGN),
    selfChain: z.boolean().optional(),
    attestationKeys: httpsUrlNoFragment.optional(),
  })
  .superRefine((params, ctx) => {
    if (params.level === 'L2' && params.attestationKeys === undefined) {
      ctx.addIssue({ code: 'custom', path: ['attestationKeys'], message: 'a Level-2 Server Agent names its keys (§3.1)' });
    }
  });

// A2A's AuthenticationInfo (A2A §4.3.2), with both members required and fit for an `Authorization` header.
export const authenticationInfoSchema = z.strictObject({
  scheme: z.string().regex(AUTH_SCHEME),
  credentials: z.string().regex(AUTH_CREDENTIALS),
});

// §7.1: what the Client puts in SendMessageRequest.metadata[URI].auditRequest.
export const auditRequestSchema = z.strictObject({
  auditEndpoint: z.strictObject({
    url: z.url().regex(HTTPS).meta({ format: 'uri' }),
    authentication: authenticationInfoSchema,
    token: z.string().regex(NO_CONTROL).optional(),
  }),
  sessionId: z.string().regex(SESSION_ID_PATTERN),
  level: z.enum(LEVEL),
  countersign: z.enum(COUNTERSIGN),
  hostKeys: httpsUrlNoFragment.optional(),
  // Written as a-MCP writes host_ts: a UTC timestamp with a `Z` suffix.
  expiresAt: dateTime,
}).superRefine((request, ctx) => {
  if (request.countersign === 'host' && request.hostKeys === undefined) {
    ctx.addIssue({ code: 'custom', path: ['hostKeys'], message: 'a countersigning audit host names its keys (§7.1)' });
  }
});

// §7.2: what the Server Agent puts in Task.metadata[URI].auditSession.
export const auditSessionSchema = z.strictObject({
  sessionId: z.string().regex(SESSION_ID_PATTERN),
  level: z.enum(LEVEL),
  countersign: z.enum(COUNTERSIGN),
});

// §7.3: the annotation on a held Task's status message.
export const auditStatusSchema = z.strictObject({
  reason: z.enum(ABORT_REASON).describe('An a-MCP Tier-1 abort code (a-MCP §7.2, §7.6).'),
  hostReason: z.enum(HOST_REASON).describe('An a-MCP Tier-1 host reject or unavailable code (a-MCP §7.6).').optional(),
  httpStatus: z.int().min(100).max(599).optional(),
  attemptId: z.string().regex(EVENT_ID_PATTERN).optional(),
});

// §7.4: a replacement of the endpoint's credentials.
export const auditCredentialsSchema = z.strictObject({
  authentication: authenticationInfoSchema,
  token: z.string().regex(NO_CONTROL).optional(),
});

// §6.1: the body of one POST to the audit endpoint, carrying exactly one of event, position, close.
// The event is an a-MCP audit event, validated against a-MCP's own schema, not repeated here.
export const auditSubmissionSchema = z.strictObject({
  taskId: z.string().min(1),
  token: z.string().regex(NO_CONTROL).optional(),
  event: z
    .record(z.string(), z.unknown())
    .describe("One Auditable MCP audit event, valid against a-MCP's audit-event.schema.json (auditable-mcp/0.4).")
    .optional(),
  position: z.literal(true).optional(),
  close: z.literal(true).optional(),
}).superRefine((submission, ctx) => {
  const kinds = [submission.event, submission.position, submission.close].filter((v) => v !== undefined).length;
  if (kinds !== 1) {
    ctx.addIssue({ code: 'custom', message: 'a submission carries exactly one of event, position, or close (§6.1)' });
  }
});

// §6.5: the session's last sealed record, in the host-assigned fields of an a-MCP accept.
export const sealedPositionSchema = z.strictObject({
  seq: z.int().min(0).max(Number.MAX_SAFE_INTEGER),
  host_ts: dateTime,
  previous_hash: z.string().regex(/^[0-9a-f]{64}$/),
  record_hash: z.string().regex(/^[0-9a-f]{64}$/),
  log_id: z.string().min(1).optional(),
  host_signature: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
  host_key_id: z.string().min(1).optional(),
}).superRefine((position, ctx) => {
  const present = [position.log_id, position.host_signature, position.host_key_id].filter((v) => v !== undefined).length;
  if (present !== 0 && present !== 3) {
    ctx.addIssue({ code: 'custom', message: 'log_id, host_signature, and host_key_id appear together or not at all (a-MCP §7.1)' });
  }
});

export const sessionPositionSchema = z.strictObject({
  last: sealedPositionSchema.nullable().describe('The host-assigned fields of an a-MCP accept (a-MCP §7.1), or null.'),
});

export type AgentCardParams = z.infer<typeof agentCardParamsSchema>;
export type AuditRequest = z.infer<typeof auditRequestSchema>;
export type AuditSession = z.infer<typeof auditSessionSchema>;
export type AuditStatus = z.infer<typeof auditStatusSchema>;
export type AuditCredentials = z.infer<typeof auditCredentialsSchema>;
export type AuditSubmission = z.infer<typeof auditSubmissionSchema>;
export type SessionPosition = z.infer<typeof sessionPositionSchema>;

// §8.6: the `action_context` of an execution report, in the clear.
export const executionReportContextSchema = z.strictObject({
  attemptId: z.string().regex(EVENT_ID_PATTERN),
  execution: z.enum(['not-performed', 'indeterminate']),
});
