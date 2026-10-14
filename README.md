# Short Maker

Local-first application to generate YouTube Shorts from long gameplay videos and scripts.

The first use case is Roblox rant-style Shorts:

1. Select a long gameplay video.
2. Enter a script.
3. Select the start timestamp.
4. Generate TTS narration locally.
5. Calculate narration duration.
6. Cut the matching gameplay segment.
7. Convert it to vertical 9:16.
8. Add narration and captions.
9. Preview and export the final Short.

The application should be fast to develop, easy to maintain, lightweight, and designed so more templates can be added later, such as Reddit stories, Minecraft stories, GTA stories, facts, confessions, etc.

## Stack

- Monorepo: pnpm workspaces
- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: SQLite + Drizzle ORM
- Validation: Zod
- Video processing: FFmpeg
- Local TTS: audio.cpp
- Optional transcription/timestamps: whisper.cpp
- Styling: Tailwind CSS
- Icons: Lucide
- Testing:
  - Vitest for selected unit tests
  - Supertest for a few important API tests

Do not introduce Nx, Turborepo, NestJS, .NET, Docker, CQRS, MediatR, generic repositories, dependency injection frameworks, or microservices unless a future requirement clearly justifies them.

## Main principle

Presets over editing.

This is NOT a CapCut replacement.

The application should generate videos through reusable templates instead of providing a complex timeline editor.

## Initial development target

Build only the Roblox Rant workflow first.

A successful V1 allows the user to:

- import a source video
- enter a script
- enter/select a start timestamp
- choose a voice
- generate narration
- automatically determine clip duration
- generate a 1080x1920 video
- add captions
- preview the result
- export MP4

YouTube upload/scheduling and AI script generation are future phases.

## Current render workflow

`POST /api/renders` validates the project source, persists a job, and enqueues it
without waiting for video processing. One render runs at a time. The UI polls
`GET /api/renders/:id`, restores the last job per project after reload, and shows
preview/download using `GET /api/renders/:id/output`. Non-terminal jobs are marked
failed after a server restart so they can be submitted again.

Configure `FFMPEG_PATH`, `FFPROBE_PATH`, and `AUDIO_CPP_PATH` in the server's
`.env`. FFmpeg defaults to `ffmpeg` on PATH. The audio.cpp adapter currently expects
`--text-file`, `--voice`, and `--output`; verify these flags and voice IDs against
your installed executable before considering TTS ready. Captions are not yet
implemented. The previous synchronous preparation/render HTTP endpoints have
been replaced by the queued workflow; services remain independently callable.

Validation: the FFmpeg service has also produced a real 1080x1920, 30 fps MP4
from generated video/audio test inputs. This checks media rendering, not TTS or
caption generation. Full manual browser verification remains pending.
