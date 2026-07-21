# Architecture Decisions

Short-form ADRs for the non-obvious choices in this codebase. See also
[architecture.md](architecture.md) for the structural overview.

## Table of contents

- [Fail-fast environment validation](#fail-fast-environment-validation)
- [Centralized error handling](#centralized-error-handling)
- [Transport-agnostic service layer](#transport-agnostic-service-layer)
- [Socket.io namespaces, not one flat connection handler](#socketio-namespaces-not-one-flat-connection-handler)
- [JWT: short-lived access token, revocable refresh token](#jwt-short-lived-access-token-revocable-refresh-token)
- [`prisma` CLI shipped as a production dependency](#prisma-cli-shipped-as-a-production-dependency)
- [No path aliases in `tsconfig.json`](#no-path-aliases-in-tsconfigjson)
- [No comments in source code](#no-comments-in-source-code)

## Fail-fast environment validation

`src/config/env.ts` validates `process.env` against a Zod schema once, at
import time, and calls `process.exit(1)` if anything required is missing
or malformed.

**Why:** a misconfigured deploy should crash immediately on boot with a
clear message, not fail mysteriously at 3am when the first request that
happens to touch the missing variable comes in.

## Centralized error handling

Controllers throw typed `AppError` subclasses (`ValidationError`,
`UnauthorizedError`, `NotFoundError`, `ConflictError`, `ForbiddenError`).
One Express error-handling middleware (`shared/middleware/errorHandler.ts`)
converts them into a consistent JSON shape.

**Why:** this is the single place that decides what's safe to expose to
the client. An `AppError.message` is safe — the codebase wrote it
deliberately. An unexpected error's message might leak internals (stack
traces, SQL, file paths), so in production it's replaced with a generic
message while the full detail is still logged server-side.

`errorHandler.ts` and `asyncHandler.ts` are separate files even though
both are "error-related middleware": `errorHandler` maps errors to HTTP
responses, `asyncHandler` forwards a rejected promise into Express's
`next()` chain. Two reasons to change, two files.

## Transport-agnostic service layer

`auth/service.ts` and `chat/service.ts` know nothing about Express or
Socket.io. Password hashing lives in `shared/utils/password.ts`, token
signing in `shared/utils/jwt.ts` — the service layer composes these, it
doesn't own cryptographic primitives directly.

**Why:** this is what lets `chat/events.ts` (WebSocket) and
`chat/controller.ts` (REST) both call `chatService` directly, and what
makes the service layer testable with plain Jest, no HTTP server or socket
connection required.

## Socket.io namespaces, not one flat connection handler

The `/chat` namespace has its own auth middleware and event set. A future
`/notifications` namespace would be fully isolated from it.

**Why:** a single `io.on('connection', ...)` with manual event-name
routing means every feature's events share one auth policy and one
handler registry. Namespaces make the isolation structural instead of a
convention someone has to remember.

`chat/events.ts` further splits each socket event into its own function
(`handleRoomJoin`, `handleRoomLeave`, `handleMessageSend`) rather than
inline closures inside the `connection` callback — each function has one
event's worth of responsibility, and each is independently testable in
isolation from the socket transport if needed.

## JWT: short-lived access token, revocable refresh token

Access tokens (default 15m) are verified statelessly — no DB hit per
request. Refresh tokens (default 7d) carry a `tokenVersion` that's checked
against `User.tokenVersion` in the database.

**Why:** stateless access tokens keep the hot path fast. Revocation (e.g.
on password change, or an explicit "log out everywhere") is handled by
bumping `tokenVersion`, which invalidates every previously issued refresh
token without maintaining a server-side blocklist.

Both REST (`shared/middleware/auth.ts`) and Socket.io
(`shared/socket/socketAuth.ts`) verify the same access token through the
same `shared/utils/jwt.ts` functions, so the two transports cannot drift
out of sync on how a token is validated.

> [!IMPORTANT]
> `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be two distinct
> secrets, each at least 32 characters, and never reused across
> environments. A leaked access-token secret should not be enough to
> forge refresh tokens, and vice versa — see `src/config/env.ts`, which
> refuses to boot if either is too short.

## `prisma` CLI shipped as a production dependency

`package.json` lists `prisma` (the CLI) under `dependencies`, not
`devDependencies`.

**Why:** `docker-compose.yml` runs `npx prisma migrate deploy` as part of
the production container's startup command, which requires the CLI —
`@prisma/client` alone isn't enough.

## No path aliases in `tsconfig.json`

See [architecture.md](architecture.md#no-path-aliases).

## No comments in source code

Code is expected to be self-explanatory through naming and structure.
Where a decision needs justification beyond what a well-named function
communicates, that justification lives here, not inline — this file (and
`architecture.md`) is the deliberate replacement for comments explaining
*why*.
