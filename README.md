# MCS Studio Lab

An isolated Next.js production workspace for Main Characters Studios: story generation through Vercel AI Gateway and private, Blob-backed video-render job records.

## Setup

Configure these environment variables in the Vercel `worker` project:

- `STUDIO_API_SECRET` — protects the studio APIs
- `AI_GATEWAY_API_KEY` — enables story generation
- `VIDEO_PROVIDER_WEBHOOK_SECRET` — authenticates provider completion callbacks

The Vercel Blob store is connected to the project through OIDC.

## Routes

- `POST /api/story` — creates story, dialogue, and shot prompts
- `POST /api/renders` — queues a video render job
- `GET /api/renders/:id` — returns job state
- `POST /api/renders/:id/complete` — provider completion webhook
