# Auditable A2A

> **NOTICE:** This repository contains a draft specification of an extension to the Agent2Agent (A2A) Protocol. It
> is **not** an SDK. The SDKs are [`auditable-a2a-sdk-ts`](https://github.com/SatoshiImai/auditable-a2a-sdk-ts) and
> [`auditable-a2a-sdk-python`](https://github.com/SatoshiImai/auditable-a2a-sdk-python); the schemas and
> vectors here are the source of truth for the wire contract, and the code that generates them is not a library to build on.

Auditable A2A is an [A2A extension](https://a2a-protocol.org/latest/topics/extensions/) under which **no act a
Server Agent records on a Client's behalf proceeds unless it was first recorded in the Client's audit ledger**.
Before each such access, the Server Agent sends an *attempt* to an audit endpoint the Client declared, and acts only
after the Client's audit host has sealed it and answered with an *accept* the Server Agent has verified.

It is an A2A extension in the sense of A2A §4.6, identified by the URI
`https://timberlandchapel.com/a2a/extensions/auditable-a2a/0.1`, declared under `capabilities.extensions` in the
Agent Card and activated per request through the `A2A-Extensions` service parameter. The record format,
canonicalization, signatures, and ledger chaining are those of [Auditable MCP](https://github.com/SatoshiImai/mcp-audit-extension)
(`auditable-mcp/0.4`): this extension carries a-MCP's guarantee, "no unrecorded act", from the tool boundary to the
delegation boundary.

**Opacity is kept.** A2A lets an agent complete a task without exposing its internal state, memory, or tools. The
record names the kind of act, its effects, and its counterparty; its content can stay behind a salted hash. The
Client sees that and how the Task proceeded. It does not see the Server Agent's reasoning, and it cannot steer it.

**A record, not a permission.** The audit host rules only on whether a record is valid, never on whether an act
may happen. An accept is a precondition of exactly one access, not an authorization of it.

**As long as the Task.** The audit session lasts exactly as long as the Task, however many days that is, and
survives a restart of either side. A Task whose acts can no longer be recorded does not continue: it is held, and
the Client is told why.

- **Read the specification:** [`spec/auditable-a2a.md`](spec/auditable-a2a.md)
- **Normative artifacts:** [`spec/schema/`](spec/schema) (JSON Schema), [`spec/vectors/`](spec/vectors) (conformance vectors)
- **See it end to end:** [§16](spec/auditable-a2a.md#16-non-normative-end-to-end-example) and the capture it quotes,
  [`examples/end-to-end.json`](examples/end-to-end.json)

## Architecture & Scope

A Client that delegates a Task to another organization's agent can say, of its own records, what it asked for and
what it got back. It cannot say what was done under its authority in between. Regulated deployments need to: a
financial institution, or the provider or deployer of a high-risk AI system under the record-keeping provisions of
the EU AI Act.

This extension puts that record in the Client's own ledger, written before each act:

| Party | Role |
| :---- | :--- |
| **Client** | Opens an audit session with its audit host, and delegates with an `auditRequest` naming the audit endpoint. |
| **Audit host** | Seals each attempt into the Client's ledger and answers it; the a-MCP host role. |
| **Server Agent** | Records each access before it, verifies the accept, and acts at most once; the a-MCP tool role. |
| **Verifier** | Checks the Client's ledger and the sessions sealed in it (§11). |

The exchange with the audit endpoint is an HTTPS binding of a-MCP's (§6). The A2A Task, its states, and its
messages are unchanged: a Task held for audit uses `TASK_STATE_AUTH_REQUIRED`, annotated through `metadata`, as A2A
guides extensions to do.

## Repository Layout

| Path | Role | Normative |
| :--- | :--- | :-------: |
| [`spec/auditable-a2a.md`](spec/auditable-a2a.md) | The specification (prose). | Yes |
| [`spec/schema/`](spec/schema) | JSON Schema for every structure the extension defines: the Agent Card `params`, `auditRequest`, `auditSession`, `auditStatus`, `auditCredentials`, the audit endpoint's submissions, the session position, and an execution report's `action_context`. | Yes |
| [`spec/vectors/`](spec/vectors) | Conformance vectors for the negotiation, key ids, execution reports, and the position check on resumption. | Yes |
| [`examples/`](examples) | The end-to-end example of §16, captured from the SDKs. | - |
| [`reference/typescript/`](reference/typescript) | The Zod source of truth from which the schemas and vectors are generated. | - |

### Cross-Language Interoperability

The schemas and vectors are generated from one reference and vendored, byte for byte, into both SDKs, which
reproduce every vector. Beyond the vectors, the SDKs' walk runs the Client, the audit host, and the Server Agent as
separate processes over HTTPS, each in either language - the Client and the Server Agent each on its language's
official A2A SDK - and has both SDKs' verifiers check the Client's ledger. The end-to-end example is one of its runs.

## Status

Draft - `auditable-a2a/0.1`, over A2A 1.0.0 and `auditable-mcp/0.4`. Breaking changes are possible in later versions, each under its own URI. Feedback is welcome as [GitHub issues](https://github.com/SatoshiImai/auditable-a2a/issues).

## Author & License

Satoshi Imai  
Licensed under the [Apache License 2.0](LICENSE).
