# API Reference

> [!NOTE]
> This is a *reference* document (information-oriented). For the
> reasoning behind the auth strategy, see
> [explanation/decisions.md](../explanation/decisions.md).

## Table of contents

- [REST endpoints](#rest-endpoints)
  - [GET /health](#get-health)
  - [POST /api/auth/register](#post-apiauthregister)
  - [POST /api/auth/login](#post-apiauthlogin)
  - [POST /api/auth/refresh](#post-apiauthrefresh)
  - [GET /api/chat/rooms/:roomName/messages](#get-apichatroomsroomnamemessages)
- [WebSocket events (`/chat` namespace)](#websocket-events-chat-namespace)
  - [Connecting](#connecting)
  - [room:join](#roomjoin)
  - [room:leave](#roomleave)
  - [message:send](#messagesend)
  - [message:new](#messagenew)
  - [room:user_joined](#roomuser_joined)

---

## REST endpoints

### GET /health

Liveness check.

**Authentication**: None

**Example request**:

```bash
curl http://localhost:3000/health
```

**Success response** (200 OK):

```json
{ "status": "ok" }
```

---

### POST /api/auth/register

Create a new user account and return an authenticated token pair.

**Authentication**: None

**Request body**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | Must be a valid email address |
| `password` | string | Yes | Minimum 8 characters |

**Example request**:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "password123"}'
```

**Success response** (201 Created):

```json
{
  "user": { "id": "1e6d0131-...", "email": "demo@example.com" },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**Error responses**:

| Status | Reason | Response |
| --- | --- | --- |
| 400 | Invalid email/password | `{"error": "ValidationError", "message": "..."}` |
| 409 | Email already registered | `{"error": "ConflictError", "message": "An account with this email already exists"}` |

---

### POST /api/auth/login

Authenticate with email and password.

**Authentication**: None

**Request body**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | — |
| `password` | string | Yes | — |

**Success response** (200 OK): same shape as `POST /api/auth/register`.

**Error responses**:

| Status | Reason | Response |
|---|---|---|
| 401 | Wrong email or password | `{"error": "UnauthorizedError", "message": "Invalid email or password"}` |

---

### POST /api/auth/refresh

Exchange a valid refresh token for a new access/refresh token pair.

**Authentication**: None (the refresh token itself is the credential)

**Request body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `refreshToken` | string | Yes | Previously issued refresh token |

**Success response** (200 OK):

```json
{ "accessToken": "eyJhbGciOi...", "refreshToken": "eyJhbGciOi..." }
```

**Error responses**:

| Status | Reason | Response |
|---|---|---|
| 401 | Token expired, invalid, or revoked (`tokenVersion` mismatch) | `{"error": "UnauthorizedError", "message": "..."}` |

---

### GET /api/chat/rooms/:roomName/messages

Return the most recent messages in a room.

**Authentication**: Required (`Authorization: Bearer <accessToken>`)

**Path parameters**:

| Field | Type | Description |
|---|---|---|
| `roomName` | string | Room identifier |

**Example request**:

```bash
curl http://localhost:3000/api/chat/rooms/general/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success response** (200 OK):

```json
{
  "roomName": "general",
  "messages": [
    {
      "id": "01577855-...",
      "content": "hello world",
      "createdAt": "2026-07-20T11:15:41.854Z",
      "authorId": "1e6d0131-...",
      "authorEmail": "demo@example.com",
      "roomName": "general"
    }
  ]
}
```

**Error responses**:

| Status | Reason | Response |
|---|---|---|
| 401 | Missing/invalid access token | `{"error": "UnauthorizedError", "message": "..."}` |

---

## WebSocket events (`/chat` namespace)

### Connecting

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: { token: accessToken },
});
```

> [!IMPORTANT]
> The access token is sent once at connection time via the `auth` payload,
> not per-event. A missing or invalid token rejects the connection before
> any event handler runs — see
> [explanation/decisions.md](../explanation/decisions.md).

### room:join

Join a room and receive its recent message history.

**Direction**: client → server

**Payload**:

| Field | Type | Required | Description |
|---|---|---|---|
| `roomName` | string | Yes | 1–100 characters |

**Acknowledgement**:

```json
{ "ok": true, "history": [ /* ChatMessageDTO[] */ ] }
```

```json
{ "ok": false, "error": "Invalid request payload" }
```

### room:leave

Leave a previously joined room.

**Direction**: client → server

**Payload**: same as `room:join`.

**Acknowledgement**: `{ "ok": true }` or `{ "ok": false, "error": "..." }`

### message:send

Send a message to a joined room. Persisted via Prisma before broadcasting.

**Direction**: client → server

**Payload**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `roomName` | string | Yes | Must have been joined first via `room:join` |
| `content` | string | Yes | 1–2000 characters |

**Acknowledgement**: `{ "ok": true }` or `{ "ok": false, "error": "..." }`

### message:new

Broadcast to every client in the room (including the sender) after a
message is persisted.

**Direction**: server → client

**Payload** (`ChatMessageDTO`):

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Message id |
| `content` | string | Message body |
| `createdAt` | string (ISO 8601) | Server timestamp |
| `authorId` | string | Sender's user id |
| `authorEmail` | string | Sender's email |
| `roomName` | string | Room the message belongs to |

### room:user_joined

Broadcast to everyone already in a room when a new client joins it.

**Direction**: server → client

**Payload**:

| Field | Type | Description |
| --- | --- | --- |
| `userId` | string | Joining user's id |
| `email` | string | Joining user's email |
| `roomName` | string | Room that was joined |
