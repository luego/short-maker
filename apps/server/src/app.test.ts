import { createClient } from "@libsql/client";
import { mkdir, writeFile, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import * as schema from "./db/schema.js";
import { ProjectRepository } from "./repositories/project.repository.js";
import { RenderJobRepository } from "./repositories/render-job.repository.js";
import { mediaRoot, projectRoot } from "./lib/paths.js";

const sourceVideo = Buffer.from("fake-video");
const client = createClient({ url: ":memory:" });
const database = drizzle({ client, schema });
const enqueue = vi.fn();
const app = createApp({
  queue: { enqueue },
  projects: new ProjectRepository(database),
  renderJobs: new RenderJobRepository(database),
  media: {
    importSource: async () => ({
      sourceVideoPath: "media/sources/project/source.mp4",
      sourceFilename: "source.mp4",
      sourceDuration: 12.5,
      sourceWidth: 1920,
      sourceHeight: 1080,
      sourceFps: 30,
    }),
  },
});

beforeEach(async () => {
  enqueue.mockClear();
  await client.executeMultiple(`
    DROP TABLE IF EXISTS render_jobs;
    DROP TABLE IF EXISTS projects;
    CREATE TABLE projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      source_video_path TEXT,
      source_filename TEXT,
      source_duration REAL,
      source_width INTEGER,
      source_height INTEGER,
      source_fps REAL,
      template_id TEXT NOT NULL DEFAULT 'roblox-rant',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE render_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      script TEXT NOT NULL,
      start_seconds REAL NOT NULL,
      narration_audio_path TEXT,
      narration_duration REAL,
      voice_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      output_path TEXT,
      error_code TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

describe("projects API", () => {
  it("creates and retrieves a project", async () => {
    const created = await request(app)
      .post("/api/projects")
      .send({ name: "Roblox Rant #1", templateId: "roblox-rant" })
      .expect(201);

    expect(created.body).toMatchObject({
      name: "Roblox Rant #1",
      templateId: "roblox-rant",
    });
    expect(created.body.id).toEqual(expect.any(String));

    const fetched = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .expect(200);

    expect(fetched.body).toEqual(created.body);
  });

  it("returns a consistent not-found error for an unknown project", async () => {
    const response = await request(app)
      .get("/api/projects/00000000-0000-4000-8000-000000000000")
      .expect(404);

    expect(response.body).toEqual({
      error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
    });
  });

  it("lists, updates, and deletes a project", async () => {
    const created = await request(app)
      .post("/api/projects")
      .send({ name: "Original" })
      .expect(201);

    const listed = await request(app).get("/api/projects").expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].id).toBe(created.body.id);

    const updated = await request(app)
      .patch(`/api/projects/${created.body.id}`)
      .send({ name: "Updated" })
      .expect(200);
    expect(updated.body.name).toBe("Updated");

    await request(app).delete(`/api/projects/${created.body.id}`).expect(204);
    await request(app).get(`/api/projects/${created.body.id}`).expect(404);
  });

  it("imports a supported source video and returns its metadata", async () => {
    const project = await request(app)
      .post("/api/projects")
      .send({ name: "Source project" })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${project.body.id}/source-video`)
      .attach("video", sourceVideo, "gameplay.mp4")
      .expect(200);

    expect(response.body).toMatchObject({
      sourceFilename: "source.mp4",
      sourceDuration: 12.5,
      sourceWidth: 1920,
      sourceHeight: 1080,
      sourceFps: 30,
      sourceUrl: `/api/projects/${project.body.id}/source-video`,
    });
    expect(response.body.sourceVideoPath).toBeUndefined();
  });

  it("rejects an unsupported source video extension", async () => {
    const project = await request(app)
      .post("/api/projects")
      .send({ name: "Invalid source" })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${project.body.id}/source-video`)
      .attach("video", sourceVideo, "gameplay.avi")
      .expect(400);

    expect(response.body.error.code).toBe("UNSUPPORTED_VIDEO_FORMAT");
  });
});

describe("renders API", () => {
  it("rejects an invalid render request", async () => {
    const response = await request(app)
      .post("/api/renders")
      .send({ script: "", startSeconds: -1 })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.message).toBe("Invalid request.");
  });

  it("creates and retrieves a queued render job", async () => {
    const project = await request(app)
      .post("/api/projects")
      .send({ name: "Render project" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${project.body.id}/source-video`)
      .attach("video", sourceVideo, "source.mp4")
      .expect(200);
    const created = await request(app)
      .post("/api/renders")
      .send({
        projectId: project.body.id,
        script: "This is the narration.",
        startSeconds: 0,
        voiceId: "default",
        templateId: "roblox-rant",
      })
      .expect(201);

    expect(created.body).toMatchObject({
      projectId: project.body.id,
      status: "queued",
      progress: 0,
    });

    expect(enqueue).toHaveBeenCalledWith(created.body.id);
    expect(created.body.outputPath).toBeUndefined();
    expect(created.body.narrationAudioPath).toBeUndefined();
    const fetched = await request(app)
      .get(`/api/renders/${created.body.id}`)
      .expect(200);
    expect(fetched.body).toEqual(created.body);
  });
});

it("rejects render creation without a source and does not enqueue it", async () => {
  const project = await request(app)
    .post("/api/projects")
    .send({ name: "No source" });
  const result = await request(app)
    .post("/api/renders")
    .send({
      projectId: project.body.id,
      script: "Narration",
      startSeconds: 0,
      voiceId: "default",
      templateId: "roblox-rant",
    })
    .expect(400);
  expect(result.body.error.code).toBe("SOURCE_VIDEO_REQUIRED");
  expect(enqueue).not.toHaveBeenCalled();
});

it("fails interrupted jobs on startup while preserving completed jobs", async () => {
  const projects = new ProjectRepository(database);
  const jobs = new RenderJobRepository(database);
  const project = await projects.create({
    name: "Recovery",
    templateId: "roblox-rant",
  });
  const input = {
    projectId: project!.id,
    script: "Narration",
    startSeconds: 0,
    voiceId: "default",
    templateId: "roblox-rant",
  };
  const pending = await jobs.create(input);
  const completed = await jobs.create(input);
  await jobs.setOutput(completed!.id, {
    outputPath: "media/renders/result.mp4",
  });
  await jobs.failInterrupted();
  expect(await jobs.findById(pending!.id)).toMatchObject({
    status: "failed",
    errorCode: "RENDER_INTERRUPTED",
  });
  expect(await jobs.findById(completed!.id)).toMatchObject({
    status: "completed",
  });
});

it("rejects output paths outside the render directory", async () => {
  const projects = new ProjectRepository(database);
  const jobs = new RenderJobRepository(database);
  const project = await projects.create({
    name: "Output",
    templateId: "roblox-rant",
  });
  const job = await jobs.create({
    projectId: project!.id,
    script: "Narration",
    startSeconds: 0,
    voiceId: "default",
    templateId: "roblox-rant",
  });
  await jobs.setOutput(job!.id, { outputPath: "../../package.json" });
  const response = await request(app)
    .get(`/api/renders/${job!.id}/output`)
    .expect(400);
  expect(response.body.error.code).toBe("INVALID_MEDIA_PATH");
});

it("serves a completed output with byte ranges for browser playback", async () => {
  const projects = new ProjectRepository(database);
  const jobs = new RenderJobRepository(database);
  const project = await projects.create({
    name: "Playback",
    templateId: "roblox-rant",
  });
  const job = await jobs.create({
    projectId: project!.id,
    script: "Narration",
    startSeconds: 0,
    voiceId: "default",
    templateId: "roblox-rant",
  });
  const directory = path.join(mediaRoot, "renders", project!.id);
  const output = path.join(directory, `${job!.id}.mp4`);
  await mkdir(directory, { recursive: true });
  await writeFile(output, Buffer.from("0123456789"));
  try {
    await jobs.setOutput(job!.id, {
      outputPath: path.relative(projectRoot, output),
    });
    const response = await request(app)
      .get(`/api/renders/${job!.id}/output`)
      .set("Range", "bytes=0-3")
      .expect(206);
    expect(response.headers["content-range"]).toBe("bytes 0-3/10");
    expect(response.body.toString()).toBe("0123");
  } finally {
    await rm(output, { force: true });
    await rmdir(directory);
  }
});
