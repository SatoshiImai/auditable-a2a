# Auditable A2A - TypeScript reference

The source of truth for the extension's wire contract. It is not a library to build on: the SDKs are
`auditable-a2a-sdk-ts` and `auditable-a2a-sdk-python`, which vendor what this reference generates.

- `src/schema/wire.ts` defines every structure the extension puts on the wire (§3.1, §6, §7) in Zod.
  `npm run schema:json` emits `../../spec/schema/*.json` from it; `schemaTargets.test.ts` fails when the
  committed schemas drift from it.
- `src/negotiate.ts`, `src/keys.ts`, `src/executionReport.ts`, and `src/position.ts` state the
  extension's own computations: the negotiation (§4.3), key ids (§10.2), execution reports (§8.6), and
  the position check on resumption (§5.5). `npm run vectors` writes `../../spec/vectors/*.json` from them;
  `vectors.test.ts` fails when the committed vectors drift.
- Auditable MCP's event, canonicalization, record hash, and ledger are not restated here. `src/amcp.ts`
  imports them from Auditable MCP's own reference, resolved from the sibling checkout
  `../../../mcp-audit-extension/reference/typescript`.

```sh
npm install
npm test
npm run schema:json
npm run vectors
```
