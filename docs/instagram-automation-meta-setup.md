# Instagram Automation Setup

This guide explains how to set up the **Instagram Automation** feature in this project from end to end:

- create the Meta app
- configure Facebook Login and Instagram access
- configure webhooks
- fill every required `.env` variable
- run the Supabase migration
- test the full connection flow

## Important First Note

This codebase uses **Instagram API with Facebook Login**, not Instagram Login.

That matters because:

- the Meta app must be configured for the **Facebook Login** flow
- the connected Instagram account must be a **professional account linked to a Facebook Page**
- the backend stores the **Page access token** after OAuth and uses it for media, comments, and messaging

The current backend configuration is defined in:

- [backend/config.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/config.py)
- [backend/.env.example](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/.env.example)
- [api.ts](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src/features/instagram-automation/api.ts)

## What This Integration Uses

The Instagram Automation feature in this repo does the following:

- Supabase Auth signs the app user in
- FastAPI handles Meta OAuth completion
- the backend stores the Instagram/Page token encrypted
- the backend subscribes the Instagram account to app webhooks
- comment and DM events hit `POST /webhook/instagram`
- rules are stored in Supabase and matched by the FastAPI rule engine

Relevant code:

- [instagram_auth.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/routers/instagram_auth.py)
- [instagram_webhook.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/routers/instagram_webhook.py)
- [instagram_automation.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/services/instagram_automation.py)
- [instagram_graph.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/services/instagram_graph.py)
- [202603310001_instagram_automation.sql](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/database/supabase/migrations/202603310001_instagram_automation.sql)

## Prerequisites

Before you start, make sure you already have:

- a Meta Developer account
- a Meta app
- an Instagram **Business** account or professional Instagram account linked to a Facebook Page
- a Supabase project for this app
- a public backend URL for webhook testing in production
- a frontend URL where the tool is hosted

If your app is already verified, you mainly need to confirm the correct permissions, redirect URI, webhook configuration, and env values.

## 1. Create or Open the Meta App

Go to the Meta App Dashboard:

- [Meta App Dashboard](https://developers.facebook.com/apps/)

If you are creating a new app:

1. Click `Create App`
2. Choose the app type that fits your business setup
3. Open the new app in the dashboard

For this project, the important part is not the app label itself, but that the app is configured to use:

- Facebook Login
- Instagram API with Facebook Login
- Webhooks

## 2. Add the Required Meta Products

In the Meta App Dashboard, add these products:

- `Facebook Login`
- `Webhooks`
- `Instagram` / `Instagram API with Facebook Login`

This project follows Meta’s Instagram API with Facebook Login flow. In Meta’s official guide, the setup flow is based on creating the configuration in the App Dashboard and then using Facebook Login for the Instagram business connection.

## 3. Basic Meta App Settings

In the Meta app settings, fill the standard app fields properly:

- App name
- App icon
- Privacy Policy URL
- Terms of Service URL if you have one
- Business email
- App category
- App domains

Make sure the app domains include the domains used by:

- your frontend
- your backend if Meta calls it directly

Example:

- frontend: `studentsociety.in`
- backend: `api.studentsociety.in`

## 4. Configure Facebook Login

Go to:

- `Products -> Facebook Login -> Settings`

Enable:

- `Client OAuth Login`
- `Web OAuth Login`

Then add the exact frontend redirect URI used by this codebase.

### Redirect URI for this project

The backend expects `META_REDIRECT_URI` to point to the frontend Instagram Automation tool page.

Default local value:

```env
META_REDIRECT_URI=http://localhost:5173/app/tools/instagram-automation
```

Production example:

```env
META_REDIRECT_URI=https://studentsociety.in/app/tools/instagram-automation
```

In Meta Dashboard, add the same exact value to **Valid OAuth Redirect URIs**.

Do not use a different path. It must match exactly.

## 5. Configure Instagram Access

Your connected Instagram account must be linked to a Facebook Page.

This backend does the following after OAuth:

1. exchanges the user token
2. fetches `me/accounts`
3. finds a Page with `instagram_business_account`
4. stores the selected `page_id`, `ig_user_id`, and Page access token

If the Instagram account is not linked to a Facebook Page, this project will fail to connect the account.

## 6. Required Meta Permissions

The current backend requests this scope list:

```env
META_OAUTH_SCOPES=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_read_engagement,pages_messaging
```

For this project, make sure the app has access to at least:

- `instagram_basic`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `pages_show_list`
- `pages_read_engagement`
- `pages_messaging`

### What each one is used for here

- `instagram_basic`
  Used to identify and access the linked Instagram business profile.
- `instagram_manage_comments`
  Used for auto comment replies.
- `instagram_manage_messages`
  Used for auto DM replies inside Instagram Messaging conversations.
- `pages_show_list`
  Used to list Facebook Pages and find the Page linked to the Instagram account.
- `pages_read_engagement`
  Used as part of Page/Instagram business access and media reads.
- `pages_messaging`
  Required for Meta-compliant private replies that start from Instagram comments.

## 6.1 Private Replies vs Standard DMs

This project now treats comment-triggered “DM” flows as **Private Replies** first, not as unrestricted outbound DMs.

- comment-triggered follow-up messages are sent through the linked **Facebook Page** messaging endpoint
- inbound DM auto-replies still use the Instagram messaging flow within the active conversation window
- if the account is missing the Page messaging capability, the backend logs a skipped or partial action instead of forcing a non-compliant send

The frontend now preserves the backend-provided OAuth scope instead of rewriting it with a hardcoded fallback list. That keeps the login URL aligned with `META_OAUTH_SCOPES`.

## 7. App Review and Access Level

If your app serves multiple businesses or external users, confirm that the needed permissions are approved with the required access level in Meta App Review.

Check:

- `App Review`
- `Permissions and Features`
- app mode is `Live`

For a verified production app, confirm the permissions you use in this project are available with the access level you need.

When Meta asks for review material, prepare:

- clear step-by-step reviewer instructions
- test credentials if needed
- one screencast per permission or feature where required
- at least one successful API call before requesting advanced access for certain permissions

## 8. Configure Webhooks

Go to Meta Dashboard:

- `Products -> Webhooks`

Use this callback URL:

```text
{BACKEND_BASE_URL}/webhook/instagram
```

Examples:

- local via tunnel: `https://abc123.ngrok-free.app/webhook/instagram`
- production: `https://api.studentsociety.in/webhook/instagram`

Use this verify token:

```env
META_WEBHOOK_VERIFY_TOKEN=your-meta-webhook-verify-token
```

That value must match exactly between:

- Meta Webhooks dashboard
- `backend/.env`
- [instagram_webhook.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/routers/instagram_webhook.py)

### Webhook signature checking

This repo now verifies Meta’s `X-Hub-Signature-256` header using:

```env
META_APP_SECRET
```

So if webhook delivery starts failing with `Invalid webhook signature`, the first thing to check is whether `META_APP_SECRET` in your backend matches the Meta app exactly.

## 9. Supabase Setup

Run the Instagram Automation migration before testing:

- [202603310001_instagram_automation.sql](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/database/supabase/migrations/202603310001_instagram_automation.sql)

This creates:

- `instagram_accounts`
- `instagram_comment_rules`
- `instagram_dm_rules`
- `instagram_comment_dm_rules`
- `instagram_automation_logs`

The backend expects a working Supabase project with:

- `profiles`
- Supabase Auth enabled
- valid anon key
- valid service role key

## 10. Backend `.env` Variables

Put these in your backend `.env` file.

Source template:

- [backend/.env.example](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/.env.example)

### Required backend variables

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

BULK_MAILER_SECRET_KEY=your-bulk-mailer-secret-key
INSTAGRAM_AUTOMATION_SECRET_KEY=replace-with-a-long-random-server-only-secret

BACKEND_BASE_URL=http://localhost:8000
FRONTEND_APP_BASE_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=http://localhost:5173/app/tools/instagram-automation
META_GRAPH_API_VERSION=v23.0
META_WEBHOOK_VERIFY_TOKEN=replace-with-a-random-verify-token
META_OAUTH_SCOPES=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_read_engagement
```

### What each backend variable means

- `SUPABASE_URL`
  Your Supabase project URL.
- `SUPABASE_ANON_KEY`
  Used by the backend when resolving auth and making project requests where needed.
- `SUPABASE_SERVICE_ROLE_KEY`
  Required for secure backend insert/update/delete operations.
- `BULK_MAILER_SECRET_KEY`
  Existing bulk mailer encryption key. Not part of Instagram setup, but still required by the backend config.
- `INSTAGRAM_AUTOMATION_SECRET_KEY`
  Used by the Instagram Automation backend to encrypt stored access tokens and sign OAuth state. Keep it stable and server-only.
- `BACKEND_BASE_URL`
  Public base URL of your FastAPI backend. Used to build correct webhook references and backend-originated URLs.
- `FRONTEND_APP_BASE_URL`
  Public base URL of your frontend app.
- `CORS_ORIGINS`
  Comma-separated frontend origins allowed to call FastAPI.
- `META_APP_ID`
  Meta app id from the App Dashboard.
- `META_APP_SECRET`
  Meta app secret from the App Dashboard. Also used for webhook signature verification.
- `META_REDIRECT_URI`
  The exact frontend tool page registered in Valid OAuth Redirect URIs.
- `META_GRAPH_API_VERSION`
  The Graph API version used by the backend. Current default in this repo is `v23.0`.
- `META_WEBHOOK_VERIFY_TOKEN`
  Shared string used by Meta to verify `GET /webhook/instagram`.
- `META_OAUTH_SCOPES`
  Comma-separated permission list requested during Meta OAuth.

## 11. Frontend `.env` Variables

For the frontend, the safest variable to set is:

```env
VITE_INSTAGRAM_AUTOMATION_API_BASE_URL=http://localhost:8000
```

Production example:

```env
VITE_INSTAGRAM_AUTOMATION_API_BASE_URL=https://api.studentsociety.in
```

### Notes

- In dev, the frontend can also work through the Vite proxy in [vite.config.ts](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/vite.config.ts)
- the Instagram tool reads `VITE_INSTAGRAM_AUTOMATION_API_BASE_URL`
- if you already use `VITE_FASTAPI_API_BASE_URL`, the Vite proxy can reuse that backend base URL too

## 12. Local Development Example

### Backend `.env`

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

BULK_MAILER_SECRET_KEY=existing-secret
INSTAGRAM_AUTOMATION_SECRET_KEY=super-long-random-local-secret

BACKEND_BASE_URL=https://your-ngrok-subdomain.ngrok-free.app
FRONTEND_APP_BASE_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

META_APP_ID=123456789012345
META_APP_SECRET=your-meta-secret
META_REDIRECT_URI=http://localhost:5173/app/tools/instagram-automation
META_GRAPH_API_VERSION=v23.0
META_WEBHOOK_VERIFY_TOKEN=instagram-local-verify-token
META_OAUTH_SCOPES=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_read_engagement
```

### Frontend `.env`

```env
VITE_INSTAGRAM_AUTOMATION_API_BASE_URL=https://your-ngrok-subdomain.ngrok-free.app
```

### Meta Dashboard values for local testing

- Valid OAuth Redirect URI:
  `http://localhost:5173/app/tools/instagram-automation`
- Webhook callback:
  `https://your-ngrok-subdomain.ngrok-free.app/webhook/instagram`
- Webhook verify token:
  `instagram-local-verify-token`

## 13. Production Example

### Backend `.env`

```env
BACKEND_BASE_URL=https://api.studentsociety.in
FRONTEND_APP_BASE_URL=https://studentsociety.in
CORS_ORIGINS=https://studentsociety.in

META_REDIRECT_URI=https://studentsociety.in/app/tools/instagram-automation
META_WEBHOOK_VERIFY_TOKEN=instagram-prod-verify-token
META_GRAPH_API_VERSION=v23.0
```

### Frontend `.env`

```env
VITE_INSTAGRAM_AUTOMATION_API_BASE_URL=https://api.studentsociety.in
```

### Meta Dashboard values for production

- Valid OAuth Redirect URI:
  `https://studentsociety.in/app/tools/instagram-automation`
- Webhook callback:
  `https://api.studentsociety.in/webhook/instagram`
- Webhook verify token:
  `instagram-prod-verify-token`

## 14. How to Test the Full Flow

After everything is configured:

1. Start the frontend
2. Start the backend
3. Sign in to Student Society
4. Open `Tools -> Business -> Instagram Automation`
5. Click `Connect Instagram`
6. Complete the Meta OAuth flow
7. Confirm that the backend creates a row in `instagram_accounts`
8. Confirm `instagram_username`, `ig_user_id`, `page_id`, and `page_name` are stored
9. Create one comment rule or DM rule
10. Trigger a real Instagram comment or DM on the connected account
11. Confirm the action appears in `instagram_automation_logs`

## 15. Common Problems

### `No connected Facebook Page with an Instagram Business account was found`

Cause:

- the Instagram profile is not linked to a Facebook Page
- the logged-in user does not manage the Page you expect

Fix:

- link the Instagram professional account to a Facebook Page
- re-run the OAuth flow with a user who manages that Page

### `redirect URI is not white-listed`

Cause:

- `META_REDIRECT_URI` and Meta Dashboard do not exactly match

Fix:

- make the URI exact on both sides
- include protocol, domain, path, and no accidental slash mismatch

### Webhook verification fails

Cause:

- Meta verify token does not match `META_WEBHOOK_VERIFY_TOKEN`

Fix:

- update the Meta webhook config and backend env so they are identical

### `Invalid webhook signature`

Cause:

- `META_APP_SECRET` in backend does not match the Meta app secret

Fix:

- copy the Meta app secret again into backend `.env`
- restart the backend

### OAuth works but media/comments/messages do not

Cause:

- missing permissions
- app still not in the correct access mode
- App Review approval does not cover the exact permissions being used

Fix:

- confirm every required permission in App Review / Permissions and Features
- confirm app is live if production users need access
- reconnect the Instagram account after permission changes

## 16. References

Official Meta references used for this setup:

- [Instagram API with Facebook Login: Business Login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram)
- [Instagram Platform Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)
- [App Review for Instagram API](https://developers.facebook.com/docs/instagram-platform/app-review)

Key Meta details reflected in this guide:

- Meta’s Facebook Login setup requires the redirect URI to be added in `Valid OAuth Redirect URIs`
- Instagram API with Facebook Login requires a professional Instagram account linked to a Facebook Page
- advanced access / app review requirements depend on your business scenario and requested permissions
