# node-ts-realtime-boilerplate

A production-ready Node.js + TypeScript boilerplate for **realtime-first**
applications: Express for REST, Socket.io for WebSocket, Prisma +
PostgreSQL for persistence. Built as a reference architecture — clean
enough to read end-to-end, opinionated enough to defend in a technical
interview.

## Why "realtime-first"?

Most Node boilerplates treat WebSocket as a bolt-on to a REST app. Here,
the WebSocket layer is a first-class citizen: it has its own auth
middleware, its own input validation, and its own module structure that
mirrors the REST modules exactly (`controller` / `service` / `routes` +
`events.ts`). The `chat` module demonstrates the full pattern — join a
room, send a message, persist it, broadcast it — without being a complete
chat app.

## Stack

| Concern         | Choice                                |
|------------------|------------------------------------------|
| HTTP framework   | Express                                    |
| Language         | TypeScript (strict mode)                     |
| Realtime         | Socket.io                                      |
| Database / ORM   | PostgreSQL + Prisma                              |
| Validation       | Zod                                                |
| Logging          | Winston (JSON in prod, pretty in dev)                |
| Testing          | Jest + Supertest                                       |
| Containerization | Docker (multistage)                                      |
| CI/CD            | GitHub Actions → GHCR → VPS via SSH                        |

## Quick start

```bash
cp .env.example .env
# fill in JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (32+ random chars each)

docker compose -f docker/docker-compose.yml up -d
```

This builds the production image (running the full test suite as a build
gate), starts Postgres, applies Prisma migrations, and starts the app on
`http://localhost:3000`.

### Local development (without Docker)

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev        # tsx watch, hot reload
npm test           # jest
```

## Folder structure

```text
src/
  config/              # env.ts (Zod-validated env vars), constants.ts
  modules/              # one folder per feature — not classic MVC
    auth/
      controller.ts      # parses input, calls service, shapes response
      service.ts          # business logic, framework-agnostic
      schemas.ts           # Zod input schemas
      routes.ts             # Express router
    chat/                    # demo realtime module
      controller.ts           # REST surface (room history)
      service.ts                # Prisma persistence, reusable outside Socket.io
      schemas.ts                  # Zod schemas for socket payloads
      routes.ts                    # REST routes
      events.ts                     # Socket.io namespace + event handlers
  shared/
    errors/               # AppError hierarchy
    middleware/             # requireAuth, errorHandler, asyncHandler, requestLogger
    socket/                   # Socket.io server setup, socket auth middleware
    types/                      # shared TS types (JWT payloads, Express augmentation)
    utils/                        # logger, jwt, password hashing, prisma client
  app.ts                # Express app factory (testable without a live server)
  server.ts              # entry point: HTTP + Socket.io server, graceful shutdown
tests/
  auth/                 # service + middleware unit tests
  chat/                  # service unit tests
docker/
  Dockerfile            # multistage: deps → test → build → production
  docker-compose.yml     # app + Postgres
.github/workflows/
  ci-cd.yml              # test → build & push to GHCR → deploy to VPS
prisma/
  schema.prisma           # User, Room, Message
docs/
  README.md                 # documentation hub
  explanation/                # understanding-oriented
    architecture.md            # layering, request/connection lifecycle
    decisions.md                 # short-form ADRs for non-obvious choices
  guides/                      # problem-oriented, how-to
    testing.md                   # how to run and understand the test suite
    deployment.md                  # how to build, run, and deploy
  reference/                    # information-oriented
    api.md                        # every REST endpoint and Socket.io event
```

## Documentation

Full documentation lives in [docs/](docs/), organized by the
[Divio System](https://docs.divio.com/documentation-system/):

- [docs/explanation/architecture.md](docs/explanation/architecture.md) —
  module layering, why feature-based over MVC, REST and WebSocket
  lifecycles (with diagrams).
- [docs/explanation/decisions.md](docs/explanation/decisions.md) —
  short-form ADRs explaining the non-obvious choices (env validation,
  error handling, JWT strategy, ...).
- [docs/guides/testing.md](docs/guides/testing.md) — how to run the test
  suite and what it covers.
- [docs/guides/deployment.md](docs/guides/deployment.md) — how to build,
  run, and deploy with Docker and the CI/CD pipeline.
- [docs/reference/api.md](docs/reference/api.md) — every REST endpoint and
  Socket.io event, with request/response shapes and examples.

## Authentication

JWT access token (short-lived, stateless verification) + refresh token
(long-lived, revocable via a `tokenVersion` check), applied identically to
REST and Socket.io through the same verification functions. All request/
event payloads are validated with Zod at the boundary. Full rationale in
[docs/explanation/decisions.md](docs/explanation/decisions.md), full
endpoint/event shapes in [docs/reference/api.md](docs/reference/api.md).
