# Privacy-First Chat Blueprint

## Goal

Build a direct-message system for Student Society that is:

- end-to-end encrypted
- request-based
- media-capable (`text`, `emoji`, `image`, `voice`)
- privacy-first by default
- scalable on the current `React + Supabase + FastAPI + Cloudflare R2` stack

## What Is Good In The Current Idea

Your direction is good:

- keep messages off the server after delivery
- store chat history locally on devices
- gate conversations behind chat requests
- support simple delivery states instead of invasive read tracking
- keep online status lightweight

## What Must Change For True Privacy

These are the important corrections:

1. The server must never store plaintext.
   All text, emoji, image captions, voice-note metadata, and file keys must be encrypted before they leave the sender device.

2. "Delete from server after delivery" means no server-side history.
   That improves privacy, but it also means:
   - reinstalling the app loses message history unless you add optional encrypted backup
   - history does not automatically sync to a new device
   - analytics, moderation, and restore are much more limited

3. A sender cannot truly force-delete a message from the recipient device after delivery.
   The sender can delete the server copy and delete the sender's local copy. The recipient can delete their own local copy. That is the privacy-safe model.

4. A plain request/response backend alone is not truly realtime.
   Best architecture here is:
   - FastAPI for authenticated send, pull, upload, download, ack, and cleanup
   - Supabase Postgres for metadata, requests, devices, and encrypted message envelopes
   - Supabase Realtime or short polling as the wake-up mechanism

## Recommended Architecture

### Frontend

- React web app
- Local encrypted message store:
  - web/PWA: `IndexedDB` + `Web Crypto`
  - future mobile app: `SQLite` + `Keychain/Keystore`
- Device key manager:
  - identity key pair
  - signed pre-key
  - one-time pre-keys

### Supabase

- Auth and user identity
- RLS-protected chat settings and chat-request data
- device registry and pre-key bundles
- ephemeral encrypted message envelopes
- lightweight delivery receipts
- lightweight presence rows
- unread counters derived from pending envelopes and pending requests

### FastAPI

- `POST /chat/messages/send`
- `GET /chat/messages/pull`
- `POST /chat/messages/ack`
- `POST /chat/requests`
- `POST /chat/requests/respond`
- `POST /chat/media/upload`
- `GET /chat/media/{media_id}`
- `POST /chat/presence`
- cleanup job for expired envelopes, receipts, and encrypted media blobs

FastAPI should use the user JWT for authentication and server-side credentials only on the backend.

## Privacy Model

### Data At Rest

- sender device stores encrypted local history
- recipient device stores encrypted local history
- server stores only encrypted envelopes and encrypted media blobs temporarily
- after delivery acknowledgement, the server deletes the envelope and blob

### Data In Transit

- all chat payloads encrypted on sender device before upload
- FastAPI, R2, and Supabase only move ciphertext
- push notifications must never contain message plaintext

### Encryption Model

For 1:1 chat, use a Signal-style approach:

- X25519 identity keys
- signed pre-keys
- one-time pre-keys
- per-conversation double ratchet

Do not invent your own crypto. Use a proven library and keep the backend out of the encryption path.

## Chat Request Rules

Add a separate `chat_request_policy` on profiles:

- `everyone`
- `followers`
- `following`
- `followers_and_following`
- `no_one`

Behavior:

- if policy allows requests, show a `Message` or `Request Chat` button on the profile
- if no conversation exists, sender must attach exactly one encrypted intro message
- recipient can `Accept` or `Decline`
- on accept, create the direct conversation
- on decline, do not create a conversation and keep only minimal request metadata

## Delivery Model

### Text / Emoji

1. Sender encrypts payload locally.
2. Sender uploads encrypted envelope through FastAPI.
3. FastAPI writes one server envelope per active recipient device.
4. Recipient app pulls or receives wake signal.
5. Recipient decrypts and stores locally.
6. Recipient calls `ack`.
7. FastAPI inserts a delivery receipt and deletes the server envelope.
8. Sender sees two ticks after at least one valid delivery receipt exists.

### Image / Voice

1. Sender encrypts the file locally.
2. Sender uploads encrypted blob to Cloudflare R2 through FastAPI.
3. Sender uploads encrypted message envelope referencing the blob.
4. Recipient downloads encrypted blob through authenticated FastAPI.
5. Recipient decrypts locally and stores locally.
6. Recipient acknowledges receipt.
7. FastAPI deletes the blob when all required acknowledgements are complete or TTL expires.

## Tick Semantics

- `1 tick`: message accepted from sender and stored on server queue, but not yet acknowledged by the recipient device
- `2 ticks`: recipient device acknowledged receipt, local save completed, and server envelope was deleted

Do not add read receipts if the product goal is privacy-first. Two ticks are enough.

## Online / Offline

Use a cheap heartbeat model instead of continuous presence streaming.

- when app opens, resumes, sends a message, or opens inbox: call `POST /chat/presence`
- FastAPI upserts `chat_presence` with `expires_at = now() + 90 seconds`
- frontend shows:
  - `Online` if `expires_at > now()`
  - `Offline` otherwise

Do not show exact last-seen timestamps if privacy is the priority.

## Header Counts And Notifications

### Message Badge

The header message icon should show:

- number of conversations with unread local messages
- plus pending chat requests if you want a single combined badge

Best UX:

- chat icon badge = unread conversations
- notification bell = follow/like/comment/profile-view/chat-request/system notifications

### Chat Notifications

Add notification types:

- `chat_request`
- `chat_message`

Notification bodies should be generic:

- "sent you a chat request"
- "sent you a message"

Do not include decrypted content in notifications.

## Data Model Summary

Use these server-side entities:

- `profiles.chat_request_policy`
- `chat_blocks`
- `chat_conversations`
- `chat_participants`
- `chat_requests`
- `chat_devices`
- `chat_device_one_time_keys`
- `chat_media_blobs`
- `chat_message_envelopes`
- `chat_delivery_receipts`
- `chat_presence`

Important note:

- there is no permanent `chat_messages` history table on the server in this model

## Recommended UI Surface

### Profile

- `Message` or `Request Chat` button
- button hidden when `chat_request_policy = no_one`
- small settings hint if user cannot send request because of privacy rule

### Inbox

- `Requests`
- `Chats`
- unread badges
- simple search
- block/report actions

### Conversation Screen

- text composer
- emoji picker
- image upload
- voice-note recorder
- 1-tick / 2-tick delivery indicator
- online/offline label only

## Things You Should Also Include

These are important for a production privacy chat:

- block user
- report user
- mute conversation
- device revoke / logout from old devices
- upload size limits and rate limits
- spam throttling on requests
- encrypted backup as an explicit opt-in feature only
- key reset flow when user changes device
- abuse handling for illegal uploads without breaking message privacy

## Scalable Rollout Plan

### Phase 1

- profile chat settings
- chat requests
- direct conversations
- device registration
- local encrypted storage
- text and emoji messages
- 1-tick / 2-tick receipts

### Phase 2

- image and voice encrypted media
- PHP media download auth
- cleanup jobs
- header unread counters
- chat notifications

### Phase 3

- push notifications
- device revoke flows
- encrypted backup
- stronger abuse controls

## Recommendation For This Codebase

Because Student Society is currently a React web app, the safest practical first release is:

1. implement direct 1:1 chat only
2. keep history local in encrypted `IndexedDB`
3. store only encrypted pending envelopes in Supabase
4. use PHP for media upload/download and acknowledgement cleanup
5. use Supabase Realtime only as a wake signal, not as a plaintext message bus

That gives you the privacy behavior you want without pretending the server is more trusted than it should be.
