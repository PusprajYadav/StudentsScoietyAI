# Stateless Realtime Chat And Notification System

## What This Implements

This repository now includes a relay-first realtime messaging system with these guarantees:

- no permanent backend storage for chat messages
- no permanent backend storage for notifications
- client devices own message history and delivered notifications
- the backend acts as an authenticated websocket relay
- offline delivery uses only a short-lived TTL queue
- horizontal scaling works with Redis-backed ephemeral storage and pub/sub

## Text Architecture Diagram

```text
                        +-----------------------------+
                        |      Supabase Auth          |
                        |   JWT issuance / profiles   |
                        +-------------+---------------+
                                      |
                                      | access token
                                      v
+-------------------+        +--------+---------+        +-------------------+
|   Sender Device   |<------>| FastAPI Backend  |<------>|   Redis (optional)|
| React + IndexedDB |  ws    | /realtime/ws     | pubsub | TTL queue + bus   |
| local messages    |        | stateless relay  |        | no permanent chat  |
+---------+---------+        +--------+---------+        +---------+---------+
          |                           ^                            |
          | ws / reconnect            | pubsub                     |
          v                           |                            v
+---------+---------+        +--------+---------+        +-------------------+
| Recipient Device  |<------>| FastAPI Backend  |        | Internal notifier |
| React + IndexedDB |  ws    | scaled instances |        | POST /realtime/...|
| local messages    |        | stateless relay  |        | ephemeral alerts  |
+-------------------+        +------------------+        +-------------------+
```

## Backend Layout

Implemented in:

- [backend/app/realtime/router.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/realtime/router.py)
- [backend/app/realtime/service.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/realtime/service.py)
- [backend/app/realtime/schemas.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/realtime/schemas.py)
- [backend/app/main.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/main.py)
- [backend/app/core/config.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/core/config.py)

### Responsibilities

- `service.py`
  Hosts the websocket relay, short-lived queue, optional Redis-backed storage, presence fanout, ack deletion, and cross-instance pub/sub.

- `router.py`
  Exposes the relay HTTP endpoints and websocket route under the same FastAPI deployment.

- `schemas.py`
  Validates internal ephemeral notification ingress payloads.

- `config.py`
  Loads realtime TTL, Redis, origin, payload, and secret settings from the same backend env file.

### Queue implementations

`service.py` provides two ephemeral queue implementations:
  - in-memory single-node queue
  - Redis-backed queue for multi-node delivery

No permanent chat database tables are used by the relay.

### FastAPI endpoints

- `GET /realtime/health`
- `GET /realtime/ready`
- `GET /realtime/metrics`
- `POST /realtime/internal/notifications`
- `WS /realtime/ws`

## Frontend Layout

Implemented in:

- [frontend/src/lib/realtimeChat/config.ts](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src/lib/realtimeChat/config.ts)
- [frontend/src/lib/realtimeChat/profileDirectory.ts](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src/lib/realtimeChat/profileDirectory.ts)
- [frontend/src/lib/realtimeChat/storage.ts](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src/lib/realtimeChat/storage.ts)
- [frontend/src/lib/realtimeChat/client.ts](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src/lib/realtimeChat/client.ts)
- [frontend/src/pages/RealtimeMessagesPage.tsx](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src/pages/RealtimeMessagesPage.tsx)

### Responsibilities

- `storage.ts`
  Stores conversations, messages, and delivered notifications only in IndexedDB.

- `client.ts`
  Maintains the websocket session, authenticates with the relay, retries on disconnect, flushes queued outgoing messages, persists incoming messages immediately, and acks after local save.

- `RealtimeMessagesPage.tsx`
  Provides the chat UI, local notification list, user search, live presence display, and queue-awareness.

## Message Flow

### Online recipient

1. User A writes a message on device A.
2. Device A saves it locally with status `queued`.
3. Device A sends `chat.send` over websocket.
4. Relay validates JWT and creates an ephemeral envelope with a 300-second TTL.
5. Relay forwards `chat.receive` to any online sockets for User B.
6. Device B writes the message to IndexedDB immediately.
7. Device B stores a local notification immediately.
8. Device B sends `chat.ack`.
9. Relay deletes the envelope.
10. Relay sends `chat.delivered` back to User A.
11. Device A updates the message status to `delivered`.

### Offline recipient inside TTL

1. User A sends `chat.send`.
2. Relay stores the envelope in the short-lived queue.
3. User B reconnects before TTL expiry.
4. Relay flushes the pending envelope during auth.
5. Device B persists locally and acks.
6. Relay deletes the envelope.

### Offline recipient after TTL expiry

1. User A sends `chat.send`.
2. Relay stores the envelope with TTL.
3. User B stays offline past expiry.
4. Cleanup removes the envelope automatically.
5. Relay emits `chat.expired` to the sender when possible.
6. No long-term copy remains on the backend.

## WebSocket Event Examples

### Authenticate

```json
{
  "type": "auth",
  "accessToken": "supabase-jwt",
  "deviceId": "relay-device-123"
}
```

### Send message

```json
{
  "type": "chat.send",
  "messageId": "2e7b4d1c-5e2e-4c9f-b9f2-8c090a4b83f1",
  "recipientUserId": "user-b",
  "conversationId": "user-a::user-b",
  "text": "Hello from a stateless relay",
  "senderProfile": {
    "id": "user-a",
    "username": "alice",
    "fullName": "Alice",
    "avatarUrl": null,
    "isVerified": false,
    "updatedAt": null
  }
}
```

### Accepted by relay

```json
{
  "type": "chat.accepted",
  "messageId": "2e7b4d1c-5e2e-4c9f-b9f2-8c090a4b83f1",
  "conversationId": "user-a::user-b",
  "expiresAt": "2026-04-03T12:05:00.000Z"
}
```

### Delivered to recipient

```json
{
  "type": "chat.receive",
  "envelope": {
    "id": "2e7b4d1c-5e2e-4c9f-b9f2-8c090a4b83f1",
    "kind": "chat.message",
    "createdAt": "2026-04-03T12:00:00.000Z",
    "expiresAt": 1775217645000,
    "senderUserId": "user-a",
    "senderDeviceId": "relay-device-123",
    "recipientUserId": "user-b",
    "conversationId": "user-a::user-b",
    "payload": {
      "messageId": "2e7b4d1c-5e2e-4c9f-b9f2-8c090a4b83f1",
      "text": "Hello from a stateless relay",
      "senderProfile": {
        "id": "user-a",
        "username": "alice",
        "fullName": "Alice",
        "avatarUrl": null,
        "isVerified": false,
        "updatedAt": null
      },
      "expiresAt": "2026-04-03T12:05:00.000Z"
    }
  }
}
```

### Ack from recipient

```json
{
  "type": "chat.ack",
  "messageId": "2e7b4d1c-5e2e-4c9f-b9f2-8c090a4b83f1"
}
```

### Sender delivery confirmation

```json
{
  "type": "chat.delivered",
  "messageId": "2e7b4d1c-5e2e-4c9f-b9f2-8c090a4b83f1",
  "conversationId": "user-a::user-b",
  "deliveredAt": "2026-04-03T12:00:03.000Z",
  "recipientUserId": "user-b"
}
```

## Notifications

This implementation supports two notification paths:

- websocket-delivered chat notifications created locally when a message is received
- ephemeral system notifications sent to `POST /internal/notifications`

The relay never writes notifications to a database. Clients store them only after they arrive.

## Redis TTL Logic

When `REALTIME_REDIS_URL` is configured:

- each envelope is stored at `relay:envelope:<messageId>` with Redis key expiry
- each recipient has a sorted set `relay:user:<userId>:pending`
- a global sorted set `relay:pending-expiries` tracks expirations
- cleanup polls `relay:pending-expiries` for expired entries
- ack deletes the envelope key and removes it from pending sets
- relay nodes publish `relay.deliver`, `relay.ack`, `relay.expire`, and `relay.presence` events over Redis pub/sub

This keeps every relay instance stateless while still allowing:

- cross-node message fanout
- cross-node ack propagation
- cross-node presence updates
- no SQL database involvement

## Production Notes

- The relay is hosted inside the same FastAPI backend deployment and uses the same backend base URL.
- Put the FastAPI service behind a load balancer with sticky sessions preferred but not required when Redis is enabled.
- Enable Redis for horizontal scaling. In-memory mode is single-node only.
- Set `REALTIME_MESSAGE_TTL_SECONDS` for the relay queue window you want. The current implementation defaults to 300 seconds.
- Reuse Supabase auth only for user identity and profile lookup. Do not store messages there.
- Terminate TLS at the edge and expose the relay over `wss://`.
- Lock down `REALTIME_CORS_ORIGINS` or reuse the backend `CORS_ORIGINS`.
- Set `REALTIME_INTERNAL_SECRET` before using the internal notification endpoint.

## No Backend Message Schema

There is intentionally no permanent chat or notification table in this design.

- server queue state is ephemeral only
- client IndexedDB is the source of delivered history
- expired or acknowledged relay envelopes are deleted automatically
