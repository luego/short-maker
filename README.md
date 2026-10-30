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

The server applies pending Drizzle migrations before accepting requests, including
after pulling updates. You can also apply them manually with
`pnpm --filter @short-maker/server db:migrate`.

`POST /api/renders` validates the project source, persists a job, and enqueues it
without waiting for video processing. One render runs at a time. The UI polls
`GET /api/renders/:id`, restores the last job per project after reload, and shows
preview/download using `GET /api/renders/:id/output`. Non-terminal jobs are marked
failed after a server restart so they can be submitted again.

Configure `FFMPEG_PATH`, `FFPROBE_PATH`, `AUDIO_CPP_PATH`, and
`AUDIO_CPP_MODEL_PATH` in `apps/server/.env`. FFmpeg defaults to `ffmpeg` on PATH.
The audio.cpp adapter uses `audiocpp_cli` with the Kokoro GGUF model and native
`--task tts --family kokoro_tts --model ... --voice-id ... --text ... --out ...`
arguments. Kokoro also requires eSpeak NG. Spanish and English voices are available
in the UI; `default-voice` from older requests maps to `em_alex`.
Captions require a configured whisper.cpp executable and model.
See [macOS setup](docs/SETUP_MACOS.md) for installation and configuration.
The previous synchronous preparation/render HTTP endpoints have
been replaced by the queued workflow; services remain independently callable.

Validation: the FFmpeg service has also produced a real 1080x1920, 30 fps MP4
from generated video/audio test inputs. This checks media rendering, not TTS or
speech recognition. The live editor and custom-caption export were also verified
through the browser on Apple Silicon.

## Live editor

The editor has a responsive form and a sticky 9:16 preview. Editing the script
updates estimated caption phrases immediately in the browser, without generating
audio or starting render jobs. Playback is muted; play, pause, restart, and seek
operate on the source video from the selected start time. Imported source videos
support byte-range requests for seeking.

Caption controls include Arial/Verdana/Georgia, font size, white/yellow text,
outline, and center/lower placement. These settings are validated and persisted
per render and applied to the exported ASS subtitles. Preview timings and line
breaks are approximate; final timing comes from Whisper after voice generation.
Fonts must be available on the rendering machine; FFmpeg may substitute missing
fonts.

Voice controls include Spanish/English voices, a 1.18x Roblox Rant pacing preset,
a natural 1.00x preset, and speeds between 0.80x and 1.35x. The selected speed is
passed to Kokoro during generation and also adjusts duration estimates and silent
preview timing. These are pacing controls, not an emotional voice model or a
guarantee of a specific performance. Audio is generated only on Generate Short.

## Synchronized captions

Set `WHISPER_CPP_PATH` to the absolute path of `whisper-cli.exe` and
`WHISPER_MODEL_PATH` to a compatible multilingual Whisper model file. The server
normalizes narration to 16 kHz mono WAV, requests SRT timestamps with automatic
language detection, writes the Roblox Rant ASS preset, and burns it into the MP4.
The CLI options follow the [official whisper.cpp CLI source](https://github.com/ggml-org/whisper.cpp/blob/master/examples/cli/cli.cpp).

Missing executable/model configuration fails the job with `WHISPER_UNAVAILABLE`;
there are no fabricated caption timings. `CAPTION_GENERATION_FAILED` means audio
normalization, transcription, or subtitle output failed. Temporary WAV/SRT files
are removed after transcription, and ASS is removed after rendering finishes or
fails. Original source videos are preserved.

The ASS burn-in was verified with real FFmpeg, including a Windows path with
spaces, apostrophes, brackets, and commas. The full queued pipeline was also
verified on Apple Silicon with real Spanish Kokoro narration, Whisper base
transcription, and a completed 1080x1920 H.264/AAC MP4.
