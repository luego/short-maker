# AGENTS.md

This repository is intended to be developed with AI coding agents, including Pi Agent.

Follow these rules before making changes.

## 1. Development philosophy

Prioritize:

1. simplicity
2. fast iteration
3. working software
4. readable code
5. maintainability

Avoid speculative abstractions.

Do not build infrastructure for requirements that do not exist yet.

Prefer a small working implementation over a perfect generalized system.

## 2. Architecture

Use a pnpm workspace monorepo.

Expected structure:

```text
short-maker/
├─ apps/
│  ├─ web/
│  └─ server/
├─ packages/
│  └─ shared/
├─ templates/
│  └─ roblox-rant/
├─ media/
│  ├─ sources/
│  ├─ audio/
│  ├─ renders/
│  └─ temp/
├─ tools/
├─ docs/
├─ pnpm-workspace.yaml
├─ package.json
└─ AGENTS.md
```

Do not add new top-level folders without a clear reason.

## 3. Backend rules

Use:

- Express
- TypeScript
- SQLite
- Drizzle ORM
- Zod

Prefer this organization:

```text
apps/server/src/
├─ routes/
├─ services/
├─ repositories/
├─ db/
├─ jobs/
├─ lib/
└─ app.ts
```

Keep controllers/routes thin.

Business/process logic belongs in services.

Database access belongs in repositories or small focused data-access modules.

Do not create a GenericRepository.

Do not use UnitOfWork.

Do not introduce CQRS.

Do not add a dependency injection framework.

Use explicit imports and plain constructor/function dependencies.

## 4. Frontend rules

Use:

- React
- Vite
- TypeScript
- Tailwind CSS
- Lucide icons

Prefer simple components.

Do not introduce a heavy UI framework unless explicitly requested.

Use accessible HTML.

Keep forms responsive.

The UI must work well at:

- 1280px+
- laptop widths
- tablet widths

Mobile support is desirable, but desktop is the main target because video processing happens locally on a PC.

## 5. UI direction

The application should look modern, minimal, calm, and professional.

Avoid:

- excessive gradients
- glassmorphism everywhere
- huge rounded cards
- neon gamer styling
- clutter
- excessive animations
- dashboards with unnecessary metrics

Prefer:

- neutral background
- strong typography
- subtle borders
- compact spacing
- one primary accent color
- simple states
- clear hierarchy

Think modern creator tool, not gaming website.

## 6. Core pipeline

The main rendering pipeline is:

```text
script
  ↓
TTS
  ↓
narration.wav
  ↓
measure audio duration
  ↓
extract source video segment
  ↓
crop/scale to 9:16
  ↓
generate captions
  ↓
compose video + narration + captions
  ↓
render MP4
```

Each stage should be independently callable where practical.

Recommended services:

```text
tts.service.ts
ffmpeg.service.ts
captions.service.ts
render.service.ts
media.service.ts
```

Keep shell/process execution isolated in service modules.

Never concatenate unsafe user input directly into shell commands.

Use process argument arrays.

Validate paths and filenames.

## 7. Shared package

`packages/shared` may contain:

- API contracts
- Zod schemas
- shared TypeScript types
- enums
- constants

Do not move backend implementation details into shared.

## 8. Database

Use SQLite.

Keep schema small.

Initial entities may include:

- projects
- source_videos
- render_jobs
- voices
- templates

Only add tables when required.

Use migrations.

Do not store large binary media files in SQLite.

Store media paths and metadata only.

## 9. Media files

Media directories must not be committed.

Add appropriate `.gitignore` rules.

Use stable project-relative paths where possible.

Generated files should have deterministic, collision-safe names.

Clean temporary files after successful renders when safe.

Do not delete original source videos.

## 10. Error handling

Use one Express error middleware.

Return consistent API errors.

Example:

```json
{
  "error": {
    "code": "RENDER_FAILED",
    "message": "Unable to render video."
  }
}
```

Do not add try/catch to every function.

Catch errors only when:

- translating them
- adding useful context
- recovering
- cleaning resources

Otherwise allow them to propagate to the global handler.

## 11. Logging

Use simple structured logging.

Log:

- render started
- render completed
- render failed
- external process exit codes
- relevant file paths
- elapsed processing time

Do not log full scripts or sensitive tokens by default.

## 12. Tests

Testing should be pragmatic, not exhaustive.

Add tests for logic that can easily break.

Priority tests:

- timestamp parsing
- narration duration → clip end calculation
- render request validation
- FFmpeg argument generation
- important API happy path
- important API validation error

Do not chase arbitrary coverage percentages.

Do not test trivial getters, static configuration, or framework behavior.

A small reliable test suite is preferred.

## 13. Security

Treat all file input as untrusted.

Required:

- validate extensions
- validate file existence
- normalize paths
- prevent path traversal
- never expose arbitrary filesystem paths through API endpoints
- never interpolate user input into shell command strings
- enforce sensible upload/file-size limits
- validate all API input with Zod

For rendered text and captions, properly escape content before passing it to FFmpeg/ASS filters.

## 14. Performance

Video processing is expensive.

Do not block the Express request until a full render completes.

Create a render job and process it asynchronously within the running local server process.

A simple in-memory queue is acceptable for V1.

Persist job status in SQLite.

Only introduce a dedicated queue system if later required.

## 15. Agent workflow

Before implementing a task:

1. Read `AGENTS.md`.
2. Read relevant files in `docs/`.
3. Inspect the existing code before creating new abstractions.
4. Make the smallest coherent change.
5. Run relevant checks.
6. Fix issues caused by the change.
7. Update documentation only when behavior or architecture materially changes.

Do not rewrite unrelated code.

Do not rename large parts of the codebase without need.

Do not perform broad refactors during feature work.

## 16. Definition of done

A task is complete when:

- behavior works
- TypeScript compiles
- relevant lint checks pass
- relevant tests pass
- no obvious console errors exist
- failure states are handled
- UI has loading/error/disabled states where appropriate

Do not leave fake implementations presented as complete.

If an external binary such as FFmpeg or audio.cpp is unavailable, clearly mark the integration as pending and provide a development fallback only when useful.
