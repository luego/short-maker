# MVP Scope

## Objective

Replace the core workflow of a paid Shorts generation application with a lightweight local tool focused first on Roblox rant videos.

The MVP should be intentionally narrow.

## Primary user flow

### Step 1 — Create project

User creates a project and selects:

- source gameplay video
- template
- voice

Initial template:

- Roblox Rant

### Step 2 — Add script

User pastes a narration script.

The UI displays:

- character count
- approximate duration before generation if useful

No AI script generation in MVP.

### Step 3 — Select clip start

User specifies a source-video start position.

Supported input examples:

```text
00:05
01:23
00:12:43
```

Internally normalize to seconds.

### Step 4 — Generate narration

The server invokes audio.cpp.

Output:

```text
media/audio/{projectId}/{renderId}.wav
```

After generation, determine exact audio duration.

### Step 5 — Determine video clip

Formula:

```text
clipStart = selected start time
clipDuration = narration duration
clipEnd = clipStart + clipDuration
```

Reject the render if the source video is too short.

### Step 6 — Render

FFmpeg creates:

- 1080x1920
- H.264 video
- AAC audio
- narration mixed with source audio
- captions rendered into the video

For V1, background/source audio should be reduced automatically while narration is present.

### Step 7 — Preview

Show the rendered MP4 in the browser.

Actions:

- Render again
- Download/export
- Delete render

A timeline editor is out of scope.

## Required MVP pages

### Projects

Simple project list.

Fields:

- project name
- source filename
- template
- last updated

### New/Edit Project

Main creation screen.

Layout should prioritize the video preview and generation form.

### Render Result

May be part of the same project screen.

Display:

- progress
- state
- preview
- output metadata
- export action

## Render states

```text
queued
generating_audio
analyzing_audio
preparing_video
generating_captions
rendering
completed
failed
```

## Out of scope for MVP

Do NOT implement:

- YouTube OAuth
- automatic upload
- scheduling
- local LLM
- OpenAI/Gemini/Claude
- Reddit import
- Reddit screenshots/cards
- multiple social platforms
- user accounts
- cloud storage
- collaboration
- payments
- drag-and-drop video timeline editor
- arbitrary video effects
- mobile app
- Docker requirement
- multi-machine processing

These belong to later phases.

## V1.1 candidates

After MVP is stable:

- additional caption presets
- multiple saved voices
- template configuration
- batch script generation from one gameplay video
- reusable render presets

## V1.2 candidates

- YouTube OAuth
- title
- description
- hashtags
- upload
- scheduled publishing

## V2 candidates

- local AI script generation
- batch generation
- automatic clip allocation
- Reddit Story template
- GTA/Minecraft/background templates
