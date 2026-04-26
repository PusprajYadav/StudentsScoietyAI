# FastAPI Backend Deployment with Supabase, Cloudflare R2, and Cloud Run

This guide explains how to deploy the new FastAPI backend in:

- [backend](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend)

It is designed for this stack:

- FastAPI on Google Cloud Run
- Supabase PostgreSQL with the existing schema
- Supabase Auth JWT validation
- Cloudflare R2 for media uploads

## What This Backend Does

The new backend is organized into:

- `auth/`
- `users/`
- `posts/`
- `media/`

The FastAPI application entrypoint is:

- [backend/main.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/main.py)

The modular app package lives in:

- [backend/app](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app)

## 1. Prepare Environment Variables

Copy the example file:

```bash
cd /Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend
cp .env.example cloudrun.env
```

Fill in all real values in `cloudrun.env`.

Important variables:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`

Optional but recommended:

- `R2_PUBLIC_BASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_KEY`
- `SUPABASE_JWT_SECRET`

Notes:

- `DATABASE_URL` must be a Postgres connection string for Supabase
- `SUPABASE_URL` is the REST/Auth project URL
- `SUPABASE_ANON_KEY` is enough for JWT issuer metadata lookups in the FastAPI app
- `SUPABASE_KEY` is an optional compatibility alias if you want one shared key variable name
- if `SUPABASE_JWT_SECRET` is not set, the backend validates JWTs using the Supabase JWKS endpoint
- `R2_PUBLIC_BASE_URL` should be your public media domain if you want permanent public URLs in `posts.image_url` and `media_assets.public_url`

## 2. Enable Google Cloud APIs

Set the project:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region asia-south1
```

Enable APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

## 3. Build with Docker

The backend Dockerfile is:

- [backend/Dockerfile](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/Dockerfile)

It is already set up for Cloud Run:

- binds to `0.0.0.0`
- uses `PORT`
- defaults to `8080`

Build locally:

```bash
docker build -t studentsociety-backend .
```

Test locally:

```bash
docker run --rm --env-file cloudrun.env -p 8080:8080 studentsociety-backend
```

Health check:

```bash
curl http://localhost:8080/health
```

## 4. Push to Artifact Registry

Create a repository once:

```bash
gcloud artifacts repositories create studentsociety-backend \
  --repository-format=docker \
  --location=asia-south1 \
  --description=\"Student Society backend images\"
```

Configure Docker auth:

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

Build and push:

```bash
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=asia-south1
export REPOSITORY=studentsociety-backend
export SERVICE=studentsociety-api
export IMAGE=\"$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE:latest\"

docker build -t \"$IMAGE\" .
docker push \"$IMAGE\"
```

## 5. Deploy to Cloud Run

Deploy the container:

```bash
gcloud run deploy \"$SERVICE\" \
  --image \"$IMAGE\" \
  --platform managed \
  --region \"$REGION\" \
  --allow-unauthenticated \
  --port 8080 \
  --env-vars-file cloudrun.env
```

This creates or updates the Cloud Run service and injects the backend secrets as environment variables.

## 6. Alternative: Let Cloud Run Build from Source

If you do not want to push the image manually:

```bash
gcloud run deploy studentsociety-api \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --env-vars-file cloudrun.env
```

This uses the local Dockerfile during Google Cloud build.

## 7. Verify the Deployment

Get the service URL:

```bash
SERVICE_URL=\"$(gcloud run services describe studentsociety-api \
  --platform managed \
  --region asia-south1 \
  --format='value(status.url)')\"

echo \"$SERVICE_URL\"
```

Check health:

```bash
curl \"$SERVICE_URL/health\"
```

Expected response:

```json
{\"status\":\"ok\"}
```

## 8. Media Upload Flow

The backend provides:

- `GET /media/upload-url`

Example:

```bash
curl -H \"Authorization: Bearer <supabase-access-token>\" \
  \"$SERVICE_URL/media/upload-url?content_type=image/jpeg\"
```

The response returns:

- `post_id`
- `object_key`
- `upload_url`
- `file_url`
- required upload headers

Frontend flow:

1. call `GET /media/upload-url`
2. upload the file directly to Cloudflare R2 using the returned presigned `PUT` URL
3. call `POST /posts` with the returned `post_id` and `file_url`

R2 path format:

```text
users/{user_id}/posts/{post_id}.jpg
```

## 9. Authentication Flow

The backend expects a Supabase access token in:

```text
Authorization: Bearer <token>
```

It validates the JWT and extracts `sub` as the authenticated `user_id`.

Main authenticated endpoints:

- `GET /auth/session`
- `GET /users/me`
- `GET /posts`
- `POST /posts`
- `DELETE /posts/{id}`
- `GET /media/upload-url`

## 10. Common Issues

### Cloud Run says the container did not listen on the expected port

Check:

- the container command uses `uvicorn main:app --host 0.0.0.0 --port ${PORT}`
- Cloud Run deploy uses `--port 8080`

### Upload URLs are generated but images do not load publicly

Usually this means:

- `R2_PUBLIC_BASE_URL` is missing or incorrect
- the bucket is not exposed through a public domain

### JWT validation fails

Check:

- `SUPABASE_URL` is correct
- the frontend sends the real Supabase access token
- `SUPABASE_JWT_SECRET` is correct if you use symmetric signing

### Database connection fails

Check:

- `DATABASE_URL` uses the async driver form `postgresql+asyncpg://...`
- the Supabase database allows the deployed connection path

## Related Files

- [backend/app/main.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/main.py)
- [backend/app/auth/service.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/auth/service.py)
- [backend/app/posts/service.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/posts/service.py)
- [backend/app/media/service.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/app/media/service.py)
- [backend/.env.example](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/.env.example)
- [backend/Dockerfile](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/Dockerfile)
