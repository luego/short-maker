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
