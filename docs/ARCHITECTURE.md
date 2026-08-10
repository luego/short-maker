# Architecture

## Overview

Short Maker is a local-first monorepo.

```text
Browser
   │
   ▼
React / Vite
   │ HTTP
   ▼
Express
   │
   ├── SQLite / Drizzle
   ├── FFmpeg
   ├── audio.cpp
   └── whisper.cpp (optional)
```

The browser never calls FFmpeg or audio.cpp directly.

The backend owns local filesystem and process execution.

## Monorepo

Use pnpm workspaces.

```yaml
packages:
  - apps/*
  - packages/*
```

### apps/web

Responsibilities:

- UI
- forms
- preview
- API calls
- render progress polling
- local UI state

### apps/server

Responsibilities:

- API
- persistence
- media metadata
- TTS
- render orchestration
- FFmpeg
- job processing

### packages/shared

Responsibilities:

- request/response schemas
- Zod contracts
- common types

Do not place application services here.

## Suggested server modules

```text
apps/server/src/
├─ app.ts
├─ server.ts
├─ config/
├─ db/
│  ├─ client.ts
│  ├─ schema.ts
│  └─ migrations/
├─ routes/
│  ├─ projects.routes.ts
│  ├─ media.routes.ts
│  ├─ renders.routes.ts
│  └─ voices.routes.ts
├─ services/
│  ├─ audio-cpp.service.ts
│  ├─ ffmpeg.service.ts
│  ├─ captions.service.ts
│  ├─ render.service.ts
│  ├─ media.service.ts
│  └─ probe.service.ts
├─ repositories/
│  ├─ project.repository.ts
│  └─ render-job.repository.ts
├─ jobs/
│  └─ render.queue.ts
├─ middleware/
│  └─ error.middleware.ts
└─ lib/
```

## Rendering job

`POST /api/renders`

Example:

```json
{
  "projectId": "uuid",
  "script": "Narration text",
  "startSeconds": 523,
  "voiceId": "roblox-rant-default",
  "templateId": "roblox-rant"
}
```

Response:

```json
{
  "id": "uuid",
  "status": "queued"
}
```

Frontend polls:

```text
GET /api/renders/:id
```

Do not keep the HTTP request open for the entire render.

## Queue

V1 may use a simple in-process queue.

Rules:

- one or a small configurable number of concurrent renders
- persist status transitions in SQLite
- recover stale `processing` jobs on server startup by marking them failed or queued
- do not introduce Redis

## FFmpeg

Do not create one giant FFmpeg command builder.

Use focused helpers for:

- probe metadata
- normalize/crop video
- mix audio
- caption rendering
- final export

Keep the final invocation visible and debuggable in logs without exposing unsafe content.

## TTS integration

Treat `audio.cpp` as an external executable.

Example conceptual interface:

```ts
export interface TtsGenerateInput {
  text: string;
  voiceId: string;
  outputPath: string;
}

export interface TtsService {
  generate(input: TtsGenerateInput): Promise<void>;
}
```

Do not create native Node bindings.

## Caption generation

Preferred implementation order:

1. If reliable timing data is available from the selected TTS model, use it.
2. Otherwise run generated narration through whisper.cpp.
3. Generate ASS subtitles.
4. Burn subtitles through FFmpeg.

Keep caption styling template-driven.

## Templates

Template folder:

```text
templates/
└─ roblox-rant/
   ├─ template.json
   └─ captions.ass
```

Example configuration:

```json
{
  "id": "roblox-rant",
  "name": "Roblox Rant",
  "video": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },
  "audio": {
    "sourceVolume": 0.18,
    "voiceVolume": 1.0
  },
  "captions": {
    "preset": "viral-center"
  }
}
```

Do not build a generic plugin system yet.

Templates are configuration plus known rendering behavior.

## Persistence

Possible starting schema:

### projects

- id
- name
- sourceVideoPath
- sourceDuration
- templateId
- createdAt
- updatedAt

### render_jobs

- id
- projectId
- script
- startSeconds
- narrationDuration
- voiceId
- templateId
- status
- progress
- outputPath
- errorCode
- errorMessage
- createdAt
- updatedAt

### voices

May initially be static configuration rather than a database table.

## API validation

All external API input must pass a Zod schema from `packages/shared`.

Example:

```ts
const CreateRenderSchema = z.object({
  projectId: z.string().uuid(),
  script: z.string().min(1).max(5000),
  startSeconds: z.number().min(0),
  voiceId: z.string().min(1),
  templateId: z.string().min(1)
});
```

## Configuration

Use environment variables only for machine-specific paths/config.

Example:

```env
PORT=4300
DATABASE_PATH=./data/app.db
FFMPEG_PATH=C:/tools/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/tools/ffmpeg/bin/ffprobe.exe
AUDIO_CPP_PATH=C:/tools/audio-cpp/audio.exe
WHISPER_CPP_PATH=C:/tools/whisper/whisper-cli.exe
```

Do not hardcode local absolute paths.
