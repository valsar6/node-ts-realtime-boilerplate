# How to Run and Understand the Test Suite

> [!NOTE]
> This is a *how-to guide* (problem-oriented). For the reasoning behind
> mocking Prisma instead of using a real database, see
> [explanation/decisions.md](../explanation/decisions.md).

## Running the tests

```bash
npm test              # jest --runInBand
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

## Scope

`npm test` runs Jest against `src/` and `tests/`, mirroring the
`tests/auth/`, `tests/chat/` structure to the `src/modules/` layout.

Tests are unit tests for the service and middleware layers:

| Test file | What it covers |
| --- | --- |
| `tests/auth/service.test.ts` | `authService.register`/`login` with Prisma mocked |
| `tests/chat/service.test.ts` | `chatService.saveMessage`/`getRecentMessages` with Prisma mocked |
| `tests/auth/middleware.test.ts` | `requireAuth` with hand-built `Request`/`Response` doubles |
| `tests/health.test.ts` | the Express app via Supertest, no live HTTP listener |

> [!WARNING]
> Real database behavior, Socket.io event round-trips, and full request/
> response integration are **out of scope** for this suite. They belong in
> a separate integration/e2e suite running against a real Postgres
> instance — this boilerplate does not include one.

## Why mock Prisma instead of using a test database

This is what makes `npm test` safe to run inside the Docker `test` stage
(see [deployment.md](deployment.md)) with zero external dependencies: no
Postgres container, no network access, no test data seeding required for
the build to gate on a green suite.

## Environment setup for tests

`tests/setupEnv.ts` populates `process.env` with valid dummy values before
any test file imports `src/config/env.ts`. Without this, the first import
of `env.ts` in a test process would call `process.exit(1)` on missing
config and kill the Jest worker — `env.ts`'s fail-fast behavior (see
[explanation/decisions.md](../explanation/decisions.md)) is deliberate for
production, but tests need a way to satisfy it with throwaway values.
