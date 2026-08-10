# Technical Decisions

This file records important choices so AI agents do not repeatedly reconsider them.

## D-001 — Monorepo

Decision:

Use pnpm workspaces.

Reason:

Frontend, backend, and shared contracts belong together and benefit from shared TypeScript types.

Do not add Nx or Turborepo during MVP.

---

## D-002 — Backend

Decision:

Use Express + TypeScript.

Reason:

The backend is primarily an orchestration layer around SQLite, FFmpeg, and audio.cpp.

NestJS would add unnecessary structure for the current scope.

---

## D-003 — Database

Decision:

Use SQLite + Drizzle ORM.

Reason:

The application is local-first and single-user.

PocketBase is unnecessary for MVP.

---

## D-004 — Rendering

Decision:

Use FFmpeg as an external executable.

Reason:

It is mature, efficient, and supports the required media operations.

Do not implement custom media processing.

---

## D-005 — TTS

Decision:

Use audio.cpp as an external process.

Reason:

Keeps the application stack simple and avoids adding a Python backend or native Node bindings.

---

## D-006 — UI

Decision:

React + Vite + Tailwind.

Reason:

Fast development, good component ergonomics, and simple desktop-first UI.

---

## D-007 — Editing model

Decision:

Use templates and presets.

Do not build a timeline editor.

Reason:

A timeline editor would dramatically increase development time while providing little value for the target workflow.

---

## D-008 — Render jobs

Decision:

Use an in-process queue for MVP.

Persist job state in SQLite.

Do not use Redis.

---

## D-009 — Tests

Decision:

Use a small risk-based test suite.

No coverage target.

Focus on timestamp logic, validation, FFmpeg arguments, and a few important API flows.

---

## D-010 — Docker

Decision:

Docker is not required for local development.

Reason:

The app depends on local video files, local binaries, and GPU/CPU media tooling. Native local development is simpler.

Docker may be reconsidered later for CI or distribution tooling.
