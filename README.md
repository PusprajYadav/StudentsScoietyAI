# Student Society

Student Society is now organized into four top-level areas so the project is easier to manage:

- `frontend/` for the Vite + React + Tailwind web and mobile app
- `backend/` for the FastAPI server and service integrations
- `database/` for Supabase migrations and database setup files
- `docs/` for deployment guides, product notes, and technical documentation

## Structure

See [docs/project-structure.md](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/docs/project-structure.md) for the detailed folder map.

## Frontend

Run the app from [frontend](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend):

```bash
cd frontend
npm run dev
```

Common frontend paths:

- [frontend/src](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src)
- [frontend/public](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/public)
- [frontend/android](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/android)
- [frontend/ios](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/ios)

## Backend

Run the API from [backend](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend):

```bash
cd backend
venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Key backend paths:

- [backend/app](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app)
- [backend/routers](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/routers)
- [backend/services](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/services)
- [backend/app/realtime](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/realtime) for the stateless websocket chat relay hosted inside FastAPI

## Database

Supabase migration files now live in [database/supabase/migrations](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/database/supabase/migrations).

After the first user account is created, assign an admin role manually:

```sql
insert into public.admin_roles (user_id, role)
values ('YOUR_USER_UUID', 'super_admin')
on conflict (user_id) do update set role = excluded.role;
```

## Docs

Deployment and setup guides are available in [docs](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/docs).

The stateless realtime chat design is documented in [docs/stateless-realtime-chat-system.md](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/docs/stateless-realtime-chat-system.md).
# StudentsScoietyAI
