# Project Structure

This repository is organized into four top-level folders to keep responsibilities clear.

## Top-level folders

- [frontend](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend): React, Vite, Tailwind, Capacitor, assets, mobile builds, and frontend scripts
- [backend](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend): FastAPI application, routers, services, models, Docker files, and backend environment files
- [database](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/database): Supabase migrations and database-related setup
- [docs](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/docs): deployment guides, setup instructions, architecture notes, and progress tracking

## Frontend breakdown

- [frontend/src](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/src): application source code
- [frontend/public](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/public): public static assets
- [frontend/assets](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/assets): design and media assets
- [frontend/scripts](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/scripts): helper scripts for build and native development
- [frontend/android](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/android): Android Capacitor project
- [frontend/ios](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/frontend/ios): iOS Capacitor project

## Backend breakdown

- [backend/app](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app): modular FastAPI application code
- [backend/routers](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/routers): route modules for existing integrations
- [backend/services](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/services): service layer and third-party integration logic
- [backend/models](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/models): backend data models

## Database breakdown

- [database/supabase/migrations](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/database/supabase/migrations): ordered SQL migrations

## Working conventions

- Start frontend work inside `frontend/`
- Start backend work inside `backend/`
- Apply SQL changes from `database/supabase/migrations`
- Keep operational and deployment notes in `docs/`
