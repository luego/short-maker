# Short Maker Project Review

Goal: `mulkjz8x-o6zdtk`

## Files and areas inspected

- Project guidance/docs:
  - `AGENTS.md`
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/MVP.md`
  - `docs/TASKS.md`
  - `docs/DECISIONS.md`
  - `docs/UI.md`
- Workspace/config:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `eslint.config.js`
  - `.gitignore`
  - `.prettierrc.json`
- Package configs:
  - `apps/server/package.json`
  - `apps/web/package.json`
  - `packages/shared/package.json`
  - `apps/server/tsconfig.json`
  - `apps/web/tsconfig.json`
  - `packages/shared/tsconfig.json`
  - `apps/server/drizzle.config.ts`
  - `apps/server/.env.example`
- Backend implementation:
  - `apps/server/src/app.ts`
  - `apps/server/src/server.ts`
  - `apps/server/src/db/client.ts`
  - `apps/server/src/db/schema.ts`
  - `apps/server/src/lib/api-error.ts`
  - `apps/server/src/lib/paths.ts`
  - `apps/server/src/middleware/error.middleware.ts`
  - `apps/server/src/repositories/project.repository.ts`
  - `apps/server/src/repositories/render-job.repository.ts`
  - `apps/server/src/routes/projects.routes.ts`
  - `apps/server/src/routes/renders.routes.ts`
  - `apps/server/src/routes/media.routes.ts`
  - `apps/server/src/services/media.service.ts`
  - `apps/server/src/services/probe.service.ts`
  - `apps/server/src/app.test.ts`
  - `apps/server/src/services/probe.service.test.ts`
  - `apps/server/drizzle/0000_blushing_maggott.sql`
  - `apps/server/drizzle/0001_careless_nico_minoru.sql`
- Frontend implementation:
  - `apps/web/src/App.tsx`
  - `apps/web/src/AppShell.tsx`
  - `apps/web/src/CreateProjectScreen.tsx`
  - `apps/web/src/Sidebar.tsx`
  - `apps/web/src/main.tsx`
  - `apps/web/src/index.css`
  - `apps/web/src/components/RenderStatus.tsx`
  - `apps/web/src/components/TemplateSelect.tsx`
  - `apps/web/src/components/TimestampInput.tsx`
  - `apps/web/src/components/VideoPicker.tsx`
  - `apps/web/src/components/VoiceSelect.tsx`
  - `apps/web/vite.config.ts`
  - `apps/web/tailwind.config.js`
- Shared package:
  - `packages/shared/src/index.ts`
- Repository structure:
  - Inspected root, `apps/`, `apps/server/`, `apps/web/`, `packages/shared/`, and `docs/` structure with `find`.
  - Expected `templates/`, `media/`, and `tools/` content was checked; no tracked files were found under those paths in the current checkout.
  - Runtime/generated artifacts exist, including `apps/dist/`, `apps/server/data/app.db`, `packages/shared/dist/`, `node_modules/`, and `.pi/`.

## Commands/checks run and outcomes

- `pwd && find . -maxdepth 3 -type f | sed 's#^./##' | sort | head -200`
  - Outcome: passed; confirmed repository root and major files.
- `find . -maxdepth 4 -type d ... && find apps packages -maxdepth 5 -type f | sort`
  - Outcome: passed; confirmed main directory and app/package source layout.
- `find templates media tools -maxdepth 3 -type f -o -type d 2>/dev/null | sort || true`
  - Outcome: passed; no files found in those expected areas in current checkout.
- `pnpm lint`
  - Outcome: passed.
- `pnpm test`
  - Outcome: passed; 2 test files, 9 tests.
- `pnpm exec tsc -p apps/server/tsconfig.json --noEmit`
  - Outcome: passed.
- `pnpm exec tsc -p apps/web/tsconfig.json --noEmit`
  - Outcome: passed.
- `pnpm exec tsc -p packages/shared/tsconfig.json --noEmit`
  - Outcome: passed.
- `git status --short`
  - Outcome: passed; only `.pi/` appeared untracked from goal metadata/evidence.

## Repository and setup summary

- The project is a pnpm workspace monorepo with:
  - `apps/server` for the Express backend.
  - `apps/web` for the React/Vite frontend.
  - `packages/shared` for shared Zod schemas and TypeScript types.
- Root scripts:
  - `pnpm dev`: builds shared packages, then runs web and server dev processes in parallel.
  - `pnpm build`: recursive package build.
  - `pnpm lint`: ESLint across the repo.
  - `pnpm test`: Vitest with no-test pass and `dist` excluded.
  - `pnpm format` / `pnpm format:check`: Prettier.
- Tooling:
  - TypeScript strict mode via `tsconfig.base.json`.
  - ESLint flat config with JS and TypeScript recommended rules.
  - Prettier configured.
  - Drizzle configured for SQLite/libSQL using `DB_FILE_NAME` or `file:./data/app.db`.
- Dependencies align with project docs: Express, TypeScript, SQLite/libSQL, Drizzle, Zod, React, Vite, Tailwind, Lucide, Vitest, Supertest.

## Current backend capabilities

- Express app creation in `apps/server/src/app.ts` with JSON body limit and mounted routers.
- Server startup in `apps/server/src/server.ts` with structured startup log.
- SQLite/libSQL client and Drizzle schema in `apps/server/src/db`.
- Database schema includes:
  - `projects`: project metadata, source video metadata, template id, timestamps.
  - `render_jobs`: render request fields, status/progress, output/error fields, timestamps.
- Migrations exist for initial tables and source video metadata columns.
- Repositories:
  - `ProjectRepository`: list, find, create, update, delete, set source video.
  - `RenderJobRepository`: find and create queued jobs.
- Routes:
  - `GET /api/projects`
  - `POST /api/projects`
  - `GET /api/projects/:id`
  - `PATCH /api/projects/:id`
  - `DELETE /api/projects/:id`
  - `POST /api/projects/:id/source-video`
  - `GET /api/projects/:id/source-video`
  - `POST /api/renders`
  - `GET /api/renders/:id`
- Media import:
  - Uses Multer for upload.
  - Accepts `.mp4`, `.mov`, `.mkv`.
  - Enforces one file and a 2GB limit.
  - Probes source metadata via `ffprobe` using `execFile`, not shell interpolation.
  - Stores project-relative source path and returns a safe `sourceUrl` instead of exposing raw filesystem paths.
  - Streaming route resolves source path under project root before serving.
- Error handling:
  - Zod validation errors return consistent `VALIDATION_ERROR` responses.
  - `ApiError` returns consistent API error shape.
  - Unknown errors return `INTERNAL_ERROR`.
- Tests:
  - API tests cover project CRUD, source import, unsupported source format, invalid render request, and queued render job creation/retrieval.
  - Probe tests cover metadata parsing and safe argument passing without shell execution.

## Current frontend capabilities

- React/Vite/Tailwind app with `AppShell` as the mounted root component.
- Sidebar exists but currently uses mock project IDs `[1, 2]`.
- Create project screen supports:
  - Selecting source video file.
  - Browser preview via object URL.
  - Creating a backend project.
  - Uploading/importing the source video.
  - Displaying returned video metadata.
  - Script input with character count.
  - Timestamp/template/voice controls.
  - Basic error/loading/disabled state for source import.
- Generate button is currently a placeholder: it does not submit a render request and only sets status text that rendering is implemented later.

## Current shared package capabilities

- Exports `appName`.
- Zod schemas/types for:
  - UUID project/render IDs via `projectIdSchema`.
  - `createProjectSchema`.
  - `updateProjectSchema` with non-empty partial update refinement.
  - `createRenderSchema` with project ID, script, start seconds, voice ID, and template ID.
- Shared package is correctly limited to API contracts/schemas and does not contain backend implementation details.

## Key findings and risks

1. The project has a healthy foundation through source-video import, but the core media pipeline is not implemented yet.
   - Missing: audio.cpp integration, narration generation, narration duration measurement, FFmpeg rendering, captions, and queue processing.
2. Render jobs are persisted but not processed.
   - `POST /api/renders` creates a queued row only. No worker consumes it, no status transitions occur, and no output is produced.
3. Frontend project navigation is still mocked.
   - `Sidebar` uses `[1, 2]`; there is no `GET /api/projects` integration or real selected-project editing flow yet.
4. Timestamp input is UI-only.
   - The docs require formats such as `00:05`, `01:23`, and `00:12:43`, but there is no parser/normalizer or tests yet.
5. Clip-bound validation does not exist yet.
   - Once narration duration exists, the app must reject renders where `startSeconds + narrationDuration` exceeds source duration.
6. Template files are absent.
   - Docs describe `templates/roblox-rant/template.json` and caption styling files, but no tracked template files were found.
7. Captions are intentionally future work, but the interface should come after basic render works.
   - Avoid building a visual caption editor or plugin system during MVP.
8. Media security patterns are good so far and should be preserved.
   - Current code validates extensions, avoids shell interpolation, stores project-relative media paths, and avoids returning raw source paths.
9. `apps/web/src/App.tsx` is stale placeholder code and not used by `main.tsx`.
   - Low risk, but it can confuse future contributors.
10. React runtime/type version mismatch may become annoying later.
   - `react`/`react-dom` are 18.x while `@types/react`/`@types/react-dom` are 19.x. Current checks pass, but alignment would reduce future type friction.
11. Build/test baseline is currently healthy.
   - Lint, tests, and TypeScript no-emit checks all pass.

## Prioritized development plan

1. Add timestamp parsing and tests.
   - Implement parser/normalizer for documented formats.
   - Reject invalid timestamps clearly.
   - Add unit tests.
   - Use it before submitting render requests from the frontend.

2. Implement Phase 4: audio.cpp/TTS service.
   - Add `AUDIO_CPP_PATH` configuration.
   - Create `audio-cpp.service.ts`.
   - Validate executable existence.
   - Generate narration WAV at `media/audio/{projectId}/{renderId}.wav`.
   - Determine exact narration duration, likely through a focused probe helper.
   - Store narration path/duration as needed.
   - Surface useful TTS errors.

3. Add render queue skeleton before full rendering.
   - In-process single-worker queue is enough for MVP.
   - On `POST /api/renders`, create and enqueue the job.
   - Persist status transitions.
   - Keep `GET /api/renders/:id` as the polling endpoint.
   - Add recovery handling for stale `processing` jobs later.

4. Implement FFmpeg service in small focused helpers.
   - Validate clip bounds.
   - Cut source segment.
   - Crop/scale to 1080x1920.
   - Reduce source audio volume.
   - Mix narration.
   - Export H.264/AAC MP4.
   - Add tests for argument generation and bounds logic.

5. Wire frontend to real project and render flows.
   - Replace mocked sidebar projects with `GET /api/projects`.
   - Support selecting existing projects.
   - Convert timestamp input to seconds.
   - Disable Generate until source/script/timestamp/voice/template are valid.
   - Submit render jobs to `POST /api/renders`.
   - Poll `GET /api/renders/:id` and show real stages.

6. Add minimal template config.
   - Add `templates/roblox-rant/template.json`.
   - Keep behavior simple and explicit.
   - Do not introduce a plugin system.

7. Add captions after a basic render succeeds.
   - Define a caption generation interface.
   - Generate ASS subtitles.
   - Add one Roblox Rant caption preset.
   - Integrate whisper.cpp only if timing data is not otherwise available.

8. MVP polish after core pipeline works.
   - Improve empty/loading/error states.
   - Add delete render/project actions.
   - Add export/open rendered file behavior.
   - Validate Windows paths thoroughly.
   - Add setup docs for FFmpeg/audio.cpp paths.

## Recommended immediate next task

Start with timestamp parsing plus tests, then implement the TTS service and narration duration measurement. This is the safest continuation path from the already-completed source-video import phase into the rendering pipeline.
