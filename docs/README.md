# Documentation

Documentation is organized using the [Divio System](https://docs.divio.com/documentation-system/):
four kinds of content, each answering a different question.

| Type | Question it answers | Section |
| --- | --- | --- |
| Explanation | *Why is it built this way?* | [explanation/](explanation/) |
| Guides | *How do I do X?* | [guides/](guides/) |
| Reference | *What exactly does X accept/return?* | [reference/](reference/) |

## Explanation

- [architecture.md](explanation/architecture.md) — module layering, why
  feature-based over MVC, REST and WebSocket lifecycles, with diagrams.
- [decisions.md](explanation/decisions.md) — short-form ADRs for every
  non-obvious choice (env validation, error handling, JWT strategy, ...).

## Guides

- [testing.md](guides/testing.md) — how to run the test suite and what it
  covers.
- [deployment.md](guides/deployment.md) — how to build, run, and ship
  with Docker and the CI/CD pipeline.

## Reference

- [api.md](reference/api.md) — every REST endpoint and Socket.io event,
  with request/response shapes and examples.

## Where to start

New to the codebase? Read [architecture.md](explanation/architecture.md)
first, then [api.md](reference/api.md) to see what the two modules
(`auth`, `chat`) actually expose.

Deploying it? Go straight to [deployment.md](guides/deployment.md).
