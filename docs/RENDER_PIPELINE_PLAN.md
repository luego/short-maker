# Render pipeline plan

## Objective

Plan the MVP render pipeline for Short Maker: script -> TTS narration -> narration duration -> source clip selection -> 9:16 video preparation -> captions -> final MP4.

## Current state reviewed

Relevant files reviewed:

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/MVP.md`
- `docs/DECISIONS.md`
- `docs/TASKS.md`
- `packages/shared/src/index.ts`
- `apps/server/src/routes/renders.routes.ts`
- `apps/server/src/routes/media.routes.ts`
- `apps/server/src/services/media.service.ts`
- `apps/server/src/services/probe.service.ts`
- `apps/server/src/services/audio-cpp.service.ts`
- `apps/server/src/services/render-preparation.service.ts`
- `apps/server/src/repositories/render-job.repository.ts`
- `apps/server/src/db/schema.ts`
- `apps/server/src/app.ts`
- `apps/server/src/server.ts`
- related API/service tests

Existing capabilities:

- Project and render-job persistence exist in SQLite via Drizzle.
- Source video upload/import exists for `.mp4`, `.mov`, `.mkv`.
- `ffprobe` metadata extraction exists for source video and audio duration.
- `audio.cpp` service exists and uses `execFile` argument arrays, not shell string interpolation.
- Narration preparation can generate WAV and persist narration path/duration.
- Render job statuses can be updated and failures persisted.

Main gaps:

- `POST /api/renders` creates a job and immediately enqueues background processing.
- A single-worker in-process queue exists; interrupted jobs fail on startup.
- FFmpeg render service exists; local binary execution remains to be verified.
- Clip bounds validation and render orchestration exist with unit tests.
- No captions service yet.
- Output streaming, UI preview, and download are implemented.
- Output path persistence exists in render orchestration.
- Stale non-terminal jobs are marked failed on startup.
- UI polls job status and restores the last render per project after reload.

The stages below retain the original design plan; the capability list above records
the current implementation. Captions and real audio.cpp verification remain pending.

## Target pipeline

### Stage 1: Create render job

Input:

- `projectId`
- `script`
- `startSeconds`
- `voiceId`
- `templateId`

Responsible modules:

- `routes/renders.routes.ts`
- `RenderJobRepository`
- future `RenderQueue`

Behavior:

1. Validate request with Zod schema from `packages/shared`.
2. Confirm project exists and has a source video before accepting render.
3. Create `render_jobs` row with status `queued`.
4. Push render id to in-process queue.
5. Return immediately to browser.

Expected errors:

- `VALIDATION_ERROR`
- `PROJECT_NOT_FOUND`
- `SOURCE_VIDEO_REQUIRED`

### Stage 2: Generate narration

Input:

- render job script
- project id
- render id
- voice id

Output:

- `media/audio/{projectId}/{renderId}.wav`
- persisted `narrationAudioPath`

Responsible modules:

- `RenderPreparationService`
- `AudioCppService`
- `RenderJobRepository`

Status:

- `generating_audio`

Behavior:

1. Write script to a temporary text file.
2. Invoke `audio.cpp` with `execFile(command, args)`.
3. Verify the output WAV exists.
4. Remove temporary text file in `finally`.

Expected errors:

- `TTS_UNAVAILABLE`
- `TTS_GENERATION_FAILED`
- `TTS_OUTPUT_MISSING`

### Stage 3: Measure narration duration

Input:

- generated WAV absolute path

Output:

- `narrationDuration`

Responsible modules:

- `ProbeService`
- `RenderPreparationService`
- `RenderJobRepository`

Status:

- `analyzing_audio`

Behavior:

1. Run `ffprobe` against narration WAV.
2. Parse positive finite duration.
3. Persist `narrationDuration`.

Expected errors:

- `NARRATION_PROBE_FAILED` or current fallback `NARRATION_PREP_FAILED`

### Stage 4: Validate clip bounds

Input:

- project source duration
- render `startSeconds`
- narration duration

Output:

- `clipStart`
- `clipDuration`
- `clipEnd`

Responsible modules:

- future focused helper, for example `render-planning.service.ts` or `clip.service.ts`

Status:

- can remain `preparing_video`

Behavior:

1. `clipStart = startSeconds`.
2. `clipDuration = narrationDuration`.
3. `clipEnd = clipStart + clipDuration`.
4. Reject if source video is missing.
5. Reject if `clipStart >= sourceDuration`.
6. Reject if `clipEnd > sourceDuration`.

Expected errors:

- `SOURCE_VIDEO_REQUIRED`
- `CLIP_START_OUT_OF_RANGE`
- `SOURCE_VIDEO_TOO_SHORT`

### Stage 5: Prepare/render video with FFmpeg

Input:

- project source video path
- narration WAV path
- clip start/duration
- template config

Output:

- `media/renders/{projectId}/{renderId}.mp4`
- persisted `outputPath`

Responsible modules:

- future `ffmpeg.service.ts`
- future `render.service.ts`
- `RenderJobRepository`

Status:

- `preparing_video`
- `rendering`

Initial MVP FFmpeg target:

- 1080x1920
- 30 fps
- H.264
- AAC
- gameplay/source audio reduced to about `0.18`
- narration at `1.0`

Recommended FFmpeg behavior:

- Seek/cut source by start and duration.
- Scale/crop to 9:16 with `scale` + `crop` or `scale` + `pad` depending template choice.
- Mix source audio and narration with controlled volumes.
- Write to a temp output first, then rename to final MP4 after success.

Expected errors:

- `FFMPEG_UNAVAILABLE`
- `VIDEO_PREP_FAILED`
- `RENDER_FAILED`
- `RENDER_OUTPUT_MISSING`

### Stage 6: Generate and burn captions

Input:

- script
- narration WAV
- timing source if available
- template caption preset

Output:

- `media/temp/{renderId}.ass` or another deterministic temp ASS file
- captions burned into final MP4

Responsible modules:

- future `captions.service.ts`
- future optional `whisper.service.ts` or integrated whisper adapter
- `ffmpeg.service.ts`

Status:

- `generating_captions`

Preferred timing order:

1. Use reliable timing output from selected TTS if available.
2. Otherwise run generated narration through `whisper.cpp`.
3. Generate ASS subtitles.
4. Burn ASS subtitles through FFmpeg.

MVP fallback option:

- If whisper is not configured yet, generate simple approximate word/phrase timings from narration duration for development only, clearly marked as non-final if used.

Expected errors:

- `CAPTION_TIMING_UNAVAILABLE`
- `CAPTION_GENERATION_FAILED`
- `WHISPER_UNAVAILABLE`

### Stage 7: Complete and expose output

Input:

- final MP4 path

Output:

- completed job with `outputPath`
- frontend preview/download URL

Responsible modules:

- `RenderJobRepository`
- future media/render output route
- frontend polling UI

Status:

- `completed`

Behavior:

1. Persist `outputPath`.
2. Set `progress` to 100.
3. UI polling sees `completed`.
4. UI shows preview and export/download action.

Expected errors:

- `RENDER_NOT_FOUND`
- `OUTPUT_NOT_FOUND`
- `INVALID_MEDIA_PATH`

## Proposed service/module layout

Keep modules focused and simple:

```text
apps/server/src/
├─ jobs/
│  └─ render.queue.ts
├─ services/
│  ├─ audio-cpp.service.ts        # exists
│  ├─ probe.service.ts            # exists
│  ├─ media.service.ts            # exists
│  ├─ render-preparation.service.ts # exists, can remain narration-focused
│  ├─ ffmpeg.service.ts           # new: execute focused FFmpeg operations
│  ├─ captions.service.ts         # new: produce ASS subtitles
│  ├─ render.service.ts           # new: orchestrate one render job
│  └─ clip.service.ts             # optional small helper for bounds calculation
└─ routes/
   └─ renders.routes.ts           # enqueue job and expose polling
```

Avoid:

- generic repositories
- dependency injection framework
- CQRS
- Redis during MVP
- one giant command builder for everything

## Queue plan

Use one in-process queue for MVP.

Responsibilities:

1. Accept render ids.
2. Process one job at a time initially.
3. Load the latest job/project data before processing.
4. Persist every stage transition.
5. Catch failures and mark the job `failed`.
6. On server startup, recover stale non-terminal jobs by marking them failed or re-queued.

Recommended terminal states:

- `completed`
- `failed`

Recommended active states:

- `queued`
- `generating_audio`
- `analyzing_audio`
- `preparing_video`
- `generating_captions`
- `rendering`

## Security and validation checklist

Paths and files:

- Validate upload extensions before accepting source videos.
- Keep source extensions limited to `.mp4`, `.mov`, `.mkv` for MVP.
- Resolve persisted media paths against `projectRoot` before reading/streaming.
- Reject any resolved path outside the project/media root.
- Store relative paths in SQLite, not arbitrary absolute user paths.
- Generate deterministic, collision-safe output names using `projectId` and `renderId`.
- Never delete original source videos during temp cleanup.

Processes:

- Use `execFile` or `spawn` with argument arrays only.
- Never concatenate user script, filenames, paths, template ids, or voice ids into shell strings.
- Validate external executable configuration before use.
- Capture exit failures and translate to API/job errors.
- Log command names, exit codes, elapsed time, and safe paths; do not log full scripts by default.

FFmpeg/captions:

- Escape ASS subtitle text correctly.
- Escape paths for FFmpeg filter arguments where required, especially Windows paths.
- Prefer temp output then atomic rename to final output.
- Verify final MP4 exists and is non-empty before marking completed.

API/UI:

- Validate every request with Zod.
- Require project to have source video before render creation or before queue processing.
- Return consistent error payloads.
- UI should disable duplicate render submission while a job is queued/active.
- UI should poll `GET /api/renders/:id` and show actual stage text.

Cleanup:

- Remove temporary text files after TTS.
- Remove temporary ASS/intermediate files after successful render when safe.
- Keep failed-job temp files only if useful for debugging, or clean them with a clear policy.

## Tests/checks before implementation is considered done

Unit tests:

- timestamp parser already exists and should remain passing.
- clip end calculation and bounds validation.
- FFmpeg argument generation uses args arrays and includes expected scale/crop/audio filters.
- ASS caption escaping.
- path normalization/path traversal rejection.
- stale job recovery behavior.

Service tests:

- TTS unavailable/missing output/failure paths.
- probe duration failure path.
- render orchestration happy path with mocked TTS/probe/FFmpeg/captions.
- render orchestration marks failed on each major stage failure.

API tests:

- render creation rejects project without source video.
- render creation enqueues and returns quickly.
- render polling returns stage/status/error/output metadata.
- output route rejects invalid paths and returns a completed MP4 path only.

Manual checks:

- `pnpm test`
- `pnpm --filter @short-maker/server build`
- `pnpm --filter @short-maker/web build`
- one local render with configured FFmpeg/audio.cpp once external binaries are available

## Recommended implementation order

1. Add clip bounds helper and tests.
2. Add `ffmpeg.service.ts` with small tested helpers for final MP4 args.
3. Add `render.service.ts` orchestration using mocked dependencies in tests.
4. Add `jobs/render.queue.ts` and enqueue from `POST /api/renders`.
5. Add source-video-required validation for render creation.
6. Add output route and UI polling/preview.
7. Add captions service with simple ASS generation.
8. Add optional whisper.cpp integration only if TTS timings are unavailable.

## Main risks

- External binary configuration varies by machine, especially on Windows.
- FFmpeg filter path escaping can fail with Windows paths and ASS files.
- Caption timing quality depends on either TTS timings or whisper availability.
- Long renders can leave stale jobs after server shutdown unless startup recovery is added.
- Logging too much text could expose full scripts; logs should stay structured and minimal.
