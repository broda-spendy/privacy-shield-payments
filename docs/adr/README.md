# Architecture Decision Records

This directory records the project's Architecture Decision Records (ADRs).
Each ADR captures a significant technical decision, the context that led to
it, and its consequences, so future contributors can understand *why* the
codebase looks the way it does.

## How to add a new ADR

1. Read the existing ADRs to confirm your topic is not already covered.
2. Create a new file `NNN-title-in-kebab-case.md` where `NNN` is the next
   number in the sequence (e.g. the first ADR after `003` is `004`).
3. Follow the template below.
4. Link the new ADR from the list at the bottom of this file and from
   `architecture.md` if it is a major decision.

## Template

```markdown
# NNN: <short title>

**Status:** <Proposed | Accepted | Superseded by NNN>
**Date:** YYYY-MM-DD

## Context

Why is this decision needed? What problem is being solved? What alternatives
were considered?

## Decision

What was decided? Be specific and unambiguous.

## Consequences

What trade-offs result? What becomes easier and what becomes harder?
```

## ADR Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-use-soroban-sdk.md) | Use the Soroban SDK over raw host functions | Accepted |
| [002](002-phase-1-mock-proofs.md) | Mock ZK proofs in Phase 1 | Accepted |
| [003](003-no-admin-key.md) | No admin/pause mechanism | Accepted |
