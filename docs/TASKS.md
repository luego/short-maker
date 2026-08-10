# Development Tasks

This is a lightweight implementation plan.

Do not create detailed specs for every task.

Complete phases in order.

---

# Phase 0 — Repository

- [ ] Initialize pnpm workspace
- [ ] Create `apps/web`
- [ ] Create `apps/server`
- [ ] Create `packages/shared`
- [ ] Configure TypeScript
- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Add root scripts
- [ ] Add `.gitignore`
- [ ] Add media directories
- [ ] Add `AGENTS.md`

Expected root commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

---

# Phase 1 — UI shell

- [ ] Add Tailwind
- [ ] Add Lucide
- [ ] Build AppShell
- [ ] Build sidebar/project navigation
- [ ] Build project creation screen
- [ ] Build script editor
- [ ] Build timestamp input
- [ ] Build video picker UI
- [ ] Build template selector
- [ ] Build voice selector
- [ ] Build render status UI

Use mocked data initially if it speeds development.

Do not over-polish animations.

---

# Phase 2 — SQLite + API

- [ ] Configure Drizzle
- [ ] Create SQLite database
- [ ] Add projects schema
- [ ] Add render jobs schema
- [ ] Add migrations
- [ ] Add project repository
- [ ] Add render job repository
- [ ] Add Express error middleware
- [ ] Add Zod API schemas

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

- [ ] Select/import video
- [ ] Store local source reference
- [ ] Validate supported extensions
- [ ] Run ffprobe
- [ ] Save duration
- [ ] Save width/height/fps metadata
- [ ] Display source preview

Preferred initial formats:

- mp4
- mov
- mkv

Do not attempt every codec/container.

---

# Phase 4 — TTS

- [ ] Add audio.cpp configuration
- [ ] Create `audio-cpp.service.ts`
- [ ] Validate executable exists
- [ ] Generate narration WAV
- [ ] Determine narration duration
- [ ] Store narration path
- [ ] Surface useful TTS errors

Development fallback:

If audio.cpp is temporarily unavailable, allow a manually supplied narration WAV only as a development aid.

Do not ship fake TTS as finished functionality.

---

# Phase 5 — Video render

- [ ] Create FFmpeg service
- [ ] Validate clip bounds
- [ ] Cut source clip
- [ ] Crop/scale to 1080x1920
- [ ] Mix narration
- [ ] Reduce gameplay audio volume
- [ ] Export H.264/AAC MP4
- [ ] Store result
- [ ] Preview result in UI

Initial output:

```text
1080x1920
30 fps
H.264
AAC
```

---

# Phase 6 — Captions

- [ ] Add caption generation interface
- [ ] Add whisper.cpp integration if required
- [ ] Obtain timings
- [ ] Generate ASS file
- [ ] Add one Roblox Rant caption preset
- [ ] Burn captions into output video

Do not create a visual caption editor.

---

# Phase 7 — Render queue

- [ ] Create in-process render queue
- [ ] Persist job status
- [ ] Add status polling
- [ ] Show stage in UI
- [ ] Handle failures
- [ ] Prevent accidental duplicate submissions

One concurrent render is acceptable initially.

---

# Phase 8 — MVP polish

- [ ] Empty states
- [ ] Loading states
- [ ] Error states
- [ ] Delete render
- [ ] Delete project
- [ ] Open/export rendered file
- [ ] Validate Windows paths
- [ ] Basic setup documentation

---

# Minimal test suite

Add only useful tests.

## Unit

- [ ] timestamp parser
- [ ] clip end calculation
- [ ] render request schema
- [ ] source bounds validation
- [ ] FFmpeg argument builder

## API

- [ ] create project happy path
- [ ] invalid render request
- [ ] unknown project

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
