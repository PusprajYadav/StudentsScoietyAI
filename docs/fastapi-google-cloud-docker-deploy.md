# FastAPI Deployment on Google Cloud with Docker

This guide shows how to deploy the FastAPI backend in this repo to **Google Cloud Run** using the backend Docker image.

It is written for the backend in:

- [backend](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend)

It assumes the backend entrypoint is:

- [main.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/main.py)

And the container files are:

- [Dockerfile](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/Dockerfile)
- [.dockerignore](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/.dockerignore)

## Recommended Target

For this project, the cleanest Google Cloud target is **Cloud Run**:

- it runs Docker containers directly
- it scales automatically
- it works well for FastAPI
- it does not require managing a VM

## Prerequisites

Before deploying, make sure you have:

- a Google Cloud project
- billing enabled on that project
- `gcloud` installed
- Docker installed and running
- permission to deploy Cloud Run services

You also need these Google Cloud APIs enabled:

- `run.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`

## 1. Prepare the Backend Environment File

Move into the backend folder:

```bash
cd /Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend
```

Create a deployment env file from the example:

```bash
cp .env.example cloudrun.env
```

Fill in the real values in `cloudrun.env`.

At minimum, this backend expects:

- `APP_ENV`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`

Add:

```env
APP_ENV=production
```

Optional but recommended:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_KEY`
- `SUPABASE_JWT_SECRET`
- `R2_PUBLIC_BASE_URL`
- `CORS_ORIGINS`

Important notes:

- `cloudrun.env` must contain only valid `KEY=value` lines
- remove any accidental raw token lines or broken values
- do not commit `cloudrun.env`
- `SUPABASE_ANON_KEY` is enough for JWT validation metadata; `SUPABASE_KEY` is supported as a compatibility alias
- `R2_PUBLIC_BASE_URL` should point at your public media domain if you want durable shareable asset URLs

The source example lives here:

- [backend/.env.example](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/.env.example)

## 2. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region asia-south1
```

You can verify the active account and project:

```bash
gcloud auth list
gcloud config list
```

## 3. Enable Required APIs

Run this once per project:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

## 4. Create an Artifact Registry Repository

Run this once per region:

```bash
gcloud artifacts repositories create studentsociety-backend \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Student Society backend images"
```

If the repository already exists, Google Cloud will tell you.

## 5. Configure Docker to Push to Artifact Registry

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

## 6. Build the Docker Image

Set a few shell variables:

```bash
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=asia-south1
export REPOSITORY=studentsociety-backend
export SERVICE=studentsociety-api
export IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE:$(date +%Y%m%d-%H%M%S)"
```

Build the image from the backend folder:

```bash
docker build -t "$IMAGE" .
```

Why this Dockerfile works for Cloud Run:

- it starts `uvicorn`
- it binds to `0.0.0.0`
- it respects `PORT`
- Cloud Run injects `PORT=8080`

## 7. Push the Image

```bash
docker push "$IMAGE"
```

## 8. Deploy to Cloud Run

Deploy the pushed image:

```bash
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --env-vars-file cloudrun.env
```

What this does:

- creates or updates the Cloud Run service
- sets the runtime container port to `8080`
- injects your backend env vars
- exposes the backend publicly

## 9. Get the Live Service URL

After deploy:

```bash
SERVICE_URL="$(gcloud run services describe "$SERVICE" \
  --platform managed \
  --region "$REGION" \
  --format='value(status.url)')"

echo "$SERVICE_URL"
```

## 10. Update `BACKEND_BASE_URL`

This backend uses `BACKEND_BASE_URL` for generated links such as tracking and callback URLs.

After the first deploy, update it to the actual Cloud Run URL:

```bash
gcloud run services update "$SERVICE" \
  --platform managed \
  --region "$REGION" \
  --update-env-vars BACKEND_BASE_URL="$SERVICE_URL"
```

If you later attach a custom domain like `https://api.studentsociety.in`, update `BACKEND_BASE_URL` again to that final domain.

## 11. Verify the Deployment

Check the health endpoint:

```bash
curl "$SERVICE_URL/health"
```

Expected response:

```json
{"status":"ok"}
```

## 12. Project-Specific Example

For this repo, the values used in one deployment looked like this:

```bash
export PROJECT_ID=studentsociety-15812
export REGION=asia-south1
export REPOSITORY=studentsociety-backend
export SERVICE=studentsociety-api
```

Example deploy flow:

```bash
cd /Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend

docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE:latest" .
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE:latest"

gcloud run deploy "$SERVICE" \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE:latest" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --env-vars-file cloudrun.env
```

## Shortcut: Let Cloud Run Build from the Dockerfile

If you do not want to build and push with local Docker, Cloud Run can build directly from the backend source because this folder already contains a Dockerfile.

From the backend folder:

```bash
gcloud run deploy studentsociety-api \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --env-vars-file cloudrun.env
```

This still uses Docker. Google Cloud builds the container from your local source and the existing `Dockerfile`.

## Common Problems

### Container failed to start on Cloud Run

Usually this means one of these:

- the app is not listening on `0.0.0.0`
- the app is not listening on the `PORT` Cloud Run gives it
- required env vars are missing
- the container crashes during startup

For this backend, the Dockerfile should run:

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT}
```

### `cloudrun.env` is rejected

Check for:

- blank or malformed lines
- raw secrets pasted without `KEY=`
- duplicate keys

### Docker push fails

Usually:

- Docker is not running
- Artifact Registry auth was not configured
- the repository does not exist yet

### Service deploys but `/health` fails

Check:

- Cloud Run revision logs
- Supabase and Meta env variables
- the exact value of `BACKEND_BASE_URL`

You can inspect logs with:

```bash
gcloud run services describe "$SERVICE" --region "$REGION"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE" --limit=50
```

## Useful Commands

Redeploy after a new image:

```bash
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION"
```

List Cloud Run services:

```bash
gcloud run services list --platform=managed --region "$REGION"
```

Open service details:

```bash
gcloud run services describe "$SERVICE" \
  --platform=managed \
  --region "$REGION"
```

## Related Files

- [backend/Dockerfile](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/Dockerfile)
- [backend/.dockerignore](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/.dockerignore)
- [backend/.env.example](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/.env.example)
- [backend/config.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/config.py)
- [backend/main.py](/Users/pusprajyadav/PusprajExternal/Company/StudentSociety/StudentSociety/backend/main.py)
