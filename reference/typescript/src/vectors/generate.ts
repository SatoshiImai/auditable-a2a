import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalize, Ledger, sha256Hex } from '../amcp.js';
import { executionReport } from '../executionReport.js';
import { keyIdOf } from '../keys.js';
import { negotiate } from '../negotiate.js';
import { SPEC_VECTORS_DIR } from '../paths.js';
import { checkPosition } from '../position.js';
import type { SessionPosition } from '../schema/wire.js';
import { EXECUTION_REPORT_CASES, KEY_ID_CASES, NEGOTIATION_CASES, sessionEvents } from './fixtures.js';

// Generate the committed conformance vectors. An independent implementation reproduces each of them:
// the negotiation verdicts (§4.3), the key ids (§10.2), the execution reports' canonical bytes (§8.6),
// and the restart position checks (§5.5).

function negotiationVectors() {
  return NEGOTIATION_CASES.map((c) => ({ ...c, expected: negotiate(c.params, { ...c.request } as never) }));
}

function keyIdVectors() {
  return KEY_ID_CASES.map((c) => ({ ...c, key_id: keyIdOf(c.jwks, c.kid) }));
}

function executionReportVectors() {
  return EXECUTION_REPORT_CASES.flatMap((c) =>
    (['attempted', 'success'] as const).map((outcome) => {
      const event = executionReport(c.input, outcome);
      const canonical = canonicalize(event);
      return { name: `${c.name}-${outcome}`, input: c.input, outcome, event, canonical, sha256: sha256Hex(canonical) };
    }),
  );
}

// The audit host seals the session's events into a partition shared with another session's record,
// so previous_hash links across sessions as a real partition does.
function positionVectors() {
  const events = sessionEvents();
  const ledger = new Ledger('client-a');
  const other = { ...events[0]!, id: '0199a3e1-ffff-7000-8000-000000000000', session_id: '0199a3e0-0000-7000-8000-00000000beef' };
  ledger.append(other, '2026-10-15T00:00:00.500Z');
  const sealed = events.map((event, i) => ledger.append(event, `2026-10-15T00:00:0${i + 1}.500Z`));
  const positionOf = (index: number): SessionPosition => {
    const r = sealed[index]!;
    return { last: { seq: r.seq, host_ts: r.host_ts, previous_hash: r.previous_hash, record_hash: r.record_hash } };
  };
  const acceptSeqs = [sealed[0]!.seq, sealed[2]!.seq, sealed[3]!.seq];
  const cases: Array<{ name: string; position: SessionPosition; held: { events: typeof events; acceptedSeqs: number[] } }> = [
    { name: 'last-record-is-held', position: positionOf(3), held: { events, acceptedSeqs: acceptSeqs } },
    { name: 'last-record-is-an-outcome', position: positionOf(1), held: { events: events.slice(0, 2), acceptedSeqs: [sealed[0]!.seq] } },
    { name: 'own-ledger-lost-its-tail', position: positionOf(3), held: { events: events.slice(0, 3), acceptedSeqs: acceptSeqs.slice(0, 2) } },
    { name: 'host-ledger-lost-its-tail', position: positionOf(2), held: { events, acceptedSeqs: acceptSeqs } },
    { name: 'empty-session-nothing-held', position: { last: null }, held: { events: [], acceptedSeqs: [] } },
    { name: 'empty-session-with-accepts', position: { last: null }, held: { events, acceptedSeqs: acceptSeqs } },
  ];
  return cases.map((c) => ({ ...c, expected: checkPosition(c.position, c.held) }));
}

function main(): void {
  mkdirSync(SPEC_VECTORS_DIR, { recursive: true });
  const files: Array<[string, unknown]> = [
    ['negotiation.json', negotiationVectors()],
    ['key-id.json', keyIdVectors()],
    ['execution-report.json', executionReportVectors()],
    ['position-check.json', positionVectors()],
  ];
  for (const [file, data] of files) {
    const path = resolve(SPEC_VECTORS_DIR, file);
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(`wrote ${path}`);
  }
}

main();
