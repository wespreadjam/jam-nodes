# jam-nodes

## Architectural Decisions

Before implementing or reviewing any PR, always check against established architectural decisions documented in GitHub issues and PRs. Key decisions:

- **Cross-cutting concerns (retry, cache, timeout, rate-limiting) belong in the execution engine**, not as standalone wrapper nodes. See Issue #37 and PR #39. The type system cannot guarantee input/output soundness through generic wrapper nodes (see PR #36 discussion). Do not use `z.any()` or `as any` to work around this — that defeats the purpose of typed nodes.
- **Nodes must stay pure** — a node defines its business logic, Zod schemas for input/output, and nothing else. Retry/cache/timeout behavior is configured via `ExecutionConfig` passed to `executeNode()` / `executeWorkflow()`.

When evaluating contributions, verify they do not contradict prior architectural alignment. If a new direction is warranted, it must be discussed in an issue before implementation.
