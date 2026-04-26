# Email OTP Auth Setup

This app now supports:

- Email + password login
- Signup with a 6-digit email OTP
- Password reset with a 6-digit email OTP
- Redirect-back auth for protected pages and actions
- Public discussions, communities, and public profile viewing for anonymous visitors

## Required Supabase email template setting

For the 6-digit OTP experience to work, the Supabase email templates must send `{{ .Token }}` instead of only `{{ .ConfirmationURL }}`.

Update these Supabase Auth email templates:

- Confirm signup
- Reset password

Recommended behavior:

- Confirm signup email should show the 6-digit token
- Reset password email should show the 6-digit token
- The app verifies those tokens client-side with `verifyOtp`

If the templates still use confirmation links only, the new UI will show an OTP form but the email may not contain a 6-digit code yet.

## Public access behavior

Anonymous visitors can now browse:

- `/app/discussions/:kind`
- `/app/communities`
- `/app/communities/:communitySlug`
- `/app/tools`
- `/app/experiments`
- `/profile/:username`

Protected screens still require auth:

- `/app/create`
- `/app/messages`
- `/profile/:username/edit`
- `/profile/:username/settings`
- `/admin`

Protected actions inside public pages also redirect through `/auth?redirectTo=...`, so users return to the same place after login.
