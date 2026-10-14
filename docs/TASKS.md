# Development Tasks

This is a lightweight implementation plan.

The UI submits renders to a single-worker queue, polls persisted progress, and
shows preview/download when a job completes. Interrupted jobs fail on startup
with a retry message. Automated tests cover the queue and API; a real full render
still needs verified audio.cpp CLI arguments, voice configuration, and a real
Whisper model. Caption parsing, ASS generation, and FFmpeg burn-in are implemented;
real speech recognition remains pending local executable/model setup.

Do not create detailed specs for every task.

Complete phases in order.

---

# Phase 0 — Repository

- [x] Initialize pnpm workspace
- [x] Create `apps/web`
- [x] Create `apps/server`
- [x] Create `packages/shared`
- [x] Configure TypeScript
- [x] Configure ESLint
- [x] Configure Prettier
- [x] Add root scripts
- [x] Add `.gitignore`
- [x] Add media directories
- [x] Add `AGENTS.md`

Expected root commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

---

# Phase 1 — UI shell

- [x] Add Tailwind
- [x] Add Lucide
- [x] Build AppShell
- [x] Build sidebar/project navigation
- [x] Build project creation screen
- [x] Build script editor
- [x] Build timestamp input
- [x] Build video picker UI
- [x] Build template selector
- [x] Build voice selector
- [x] Build render status UI

Use mocked data initially if it speeds development.

Do not over-polish animations.
---

# Phase 2 — SQLite + API

- [x] Configure Drizzle
- [x] Create SQLite database
- [x] Add projects schema
- [x] Add render jobs schema
- [x] Add migrations
- [x] Add project repository
- [x] Add render job repository
- [x] Add Express error middleware
- [x] Add Zod API schemas

Endpoints:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

POST   /api/renders
GET    /api/renders/:id
```

---

# Phase 3 — Source video

- [x] Select/import video
- [x] Store local source reference
- [x] Validate supported extensions
- [x] Run ffprobe
- [x] Save duration
- [x] Save width/height/fps metadata
- [x] Display source preview

Preferred initial formats:

- mp4
- mov
- mkv

Do not attempt every codec/container.

---

# Phase 4 — TTS

- [ ] Add audio.cpp configuration
- [x] Create `audio-cpp.service.ts`
- [x] Validate executable exists
- [x] Generate narration WAV
- [x] Determine narration duration
- [x] Store narration path
- [x] Surface useful TTS errors

Development fallback:

If audio.cpp is temporarily unavailable, allow a manually supplied narration WAV only as a development aid.

Do not ship fake TTS as finished functionality.

---

# Phase 5 — Video render

- [x] Create FFmpeg service
- [x] Validate clip bounds
- [x] Cut source clip
- [x] Crop/scale to 1080x1920
- [x] Mix narration
- [x] Reduce gameplay audio volume
- [x] Export H.264/AAC MP4
- [x] Store result
- [x] Preview result in UI

Initial output:

```text
1080x1920
30 fps
H.264
AAC
```

---

# Phase 6 — Captions

- [x] Add caption generation interface
- [x] Add whisper.cpp integration if required
- [x] Obtain timings
- [x] Generate ASS file
- [x] Add one Roblox Rant caption preset
- [x] Burn captions into output video

Do not create a visual caption editor.

---

# Phase 7 — Render queue

- [x] Create in-process render queue
- [x] Persist job status
- [x] Add status polling
- [x] Show stage in UI
- [x] Handle failures
- [x] Prevent accidental duplicate submissions

One concurrent render is acceptable initially.

---

# Phase 8 — MVP polish

- [ ] Empty states
- [ ] Loading states
- [ ] Error states
- [ ] Delete render
- [ ] Delete project
- [x] Open/export rendered file
- [ ] Validate Windows paths
- [ ] Basic setup documentation

---

# Minimal test suite

Add only useful tests.

## Unit

- [x] timestamp parser
- [x] clip end calculation
- [x] render request schema
- [x] source bounds validation
- [x] FFmpeg argument builder

## API

- [x] create project happy path
- [x] invalid render request
- [x] unknown project

Avoid broad snapshot testing.

Avoid chasing code coverage.

---

# Later — Do not implement during MVP

- YouTube upload
- scheduling
- batch rendering
- AI script generation
- Reddit template
- multiple accounts
- cloud deployment
- authentication
- payments
- collaboration
