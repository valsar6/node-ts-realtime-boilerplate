# How to Build, Test, and Deploy with Docker

> [!NOTE]
> This is a *how-to guide* (problem-oriented). For why the pipeline is
> shaped this way, see [explanation/decisions.md](../explanation/decisions.md).

## Table of contents

- [Multistage build](#multistage-build)
- [docker-compose](#docker-compose)
- [CI/CD pipeline](#cicd-pipeline)
- [Running the published image](#running-the-published-image)

## Multistage build

```mermaid
graph LR
    A[dependencies] --> B[test]
    B --> C[build]
    C --> D[production]
```

`docker/Dockerfile` has four stages:

1. **`dependencies`** — installs OS-level `openssl` (Prisma's query engine
   is dynamically linked against it; alpine doesn't ship it by default)
   and runs `npm ci`. Isolated so this — the slowest, most cacheable step
   — is only invalidated when `package*.json` changes, not on every source
   edit.
2. **`test`** — runs `npx prisma generate` then `npm run test:coverage`.
   If any test fails, the `RUN` instruction fails and the Docker build
   stops here. Nothing downstream (`build`, `production`) can be produced
   from a red test suite.
3. **`build`** — compiles TypeScript, then reinstalls with
   `npm ci --omit=dev` so devDependencies (`jest`, `ts-jest`, `eslint`,
   `typescript`, ...) never reach the final image.
4. **`production`** — `node:20-alpine`, only compiled JS and production
   `node_modules`, runs as a non-root `nodejs` user.

```bash
docker build -f docker/Dockerfile --target production -t app .
```

> [!TIP]
> Because `build` is built `FROM test` (not `FROM dependencies`), a plain
> `docker build` always runs the test gate even if no one explicitly
> targets the `test` stage first.

## docker-compose

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d
```

`docker/docker-compose.yml` runs the production image alongside a
`postgres:16-alpine` container. The app's startup command runs
`npx prisma migrate deploy` before `node dist/server.js`, so a fresh
`docker compose up` always has an up-to-date schema before the app starts
accepting traffic — this is why `prisma` is a production dependency (see
[explanation/decisions.md](../explanation/decisions.md)).

## CI/CD pipeline

```mermaid
graph LR
    A[test] -->|main branch only| B[build-and-push]
```

`.github/workflows/ci-cd.yml` runs on every push to `main` and every pull
request, with two jobs:

1. **`test`** — builds the Docker image up to the `test` stage. This
   reuses the exact same stage a local `docker build` would run, so
   "passes CI" and "passes a local build" are the same guarantee.
2. **`build-and-push`** — only runs on pushes to `main` (gated by
   `needs: test` and an `if` on `github.ref`), builds the `production`
   stage, and pushes it to GitHub Container Registry tagged with both the
   commit SHA (for rollback) and `latest`. It authenticates with the
   built-in `GITHUB_TOKEN` (the job requests `packages: write`), so no
   repository secrets need to be configured.

> [!IMPORTANT]
> Pull requests only trigger `test` — `build-and-push` requires
> `github.event_name == 'push'` on `main`, so a PR from a fork can never
> push an image.

## Running the published image

The pipeline stops at publishing the image. To run it elsewhere, pull it
from GHCR and point it at a PostgreSQL instance you provide (the bundled
`docker-compose.yml` builds from source, so it does not use the published
image):

```bash
docker pull ghcr.io/<owner>/<repo>:latest
docker run -d -p 3000:3000 \
  -e DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db> \
  -e JWT_ACCESS_SECRET=<32+ random chars> \
  -e JWT_REFRESH_SECRET=<32+ random chars> \
  ghcr.io/<owner>/<repo>:latest \
  sh -c "npx prisma migrate deploy && node dist/server.js"
```
