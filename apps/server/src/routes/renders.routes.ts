import { createRenderSchema, projectIdSchema } from "@short-maker/shared";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { mediaRoot, projectRoot } from "../lib/paths.js";
import type { RenderQueue } from "../jobs/render.queue.js";
import { Router } from "express";
import { ApiError } from "../lib/api-error.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { RenderJobRepository } from "../repositories/render-job.repository.js";
export function createRendersRouter(
  projects: ProjectRepository,
  renderJobs: RenderJobRepository,
  queue: Pick<RenderQueue, "enqueue">,
) {
  const router = Router();

  router.post("/", async (request, response) => {
    const input = createRenderSchema.parse(request.body);
    const project = await projects.findById(input.projectId);
    if (!project) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }
    if (!project.sourceVideoPath) {
      throw new ApiError(
        400,
        "SOURCE_VIDEO_REQUIRED",
        "Import a source video before generating a Short.",
      );
    }
    if (
      project.sourceDuration !== null &&
      input.startSeconds >= project.sourceDuration
    ) {
      throw new ApiError(
        400,
        "CLIP_START_OUT_OF_RANGE",
        "Start time must be before the end of the source video.",
      );
    }
    const job = await renderJobs.create(input);
    if (!job)
      throw new ApiError(500, "RENDER_FAILED", "Unable to create render job.");
    queue.enqueue(job.id);
    response.status(201).json(publicJob(job));
  });

  router.get("/:id/output", async (request, response, next) => {
    const id = projectIdSchema.parse(request.params.id);
    const job = await renderJobs.findById(id);
    if (!job)
      throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
    if (job.status !== "completed" || !job.outputPath) {
      throw new ApiError(
        404,
        "OUTPUT_NOT_FOUND",
        "The rendered video is not available.",
      );
    }
    const root = path.resolve(mediaRoot, "renders");
    const candidate = path.resolve(projectRoot, job.outputPath);
    if (
      !candidate.startsWith(`${root}${path.sep}`) ||
      path.extname(candidate).toLowerCase() !== ".mp4"
    ) {
      throw new ApiError(400, "INVALID_MEDIA_PATH", "Invalid media path.");
    }
    let filePath: string;
    try {
      const actualRoot = await realpath(root);
      filePath = await realpath(candidate);
      if (!filePath.startsWith(`${actualRoot}${path.sep}`)) {
        throw new ApiError(400, "INVALID_MEDIA_PATH", "Invalid media path.");
      }
      const metadata = await stat(filePath);
      if (!metadata.isFile() || metadata.size === 0)
        throw new Error("Missing output");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        404,
        "OUTPUT_NOT_FOUND",
        "The rendered video is not available.",
      );
    }
    response.type("mp4");
    response.sendFile(filePath, (error) => {
      if (error) next(error);
    });
  });

  router.get("/:id", async (request, response) => {
    const id = projectIdSchema.parse(request.params.id);
    const job = await renderJobs.findById(id);
    if (!job)
      throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
    response.json(publicJob(job));
  });

  return router;
}

function publicJob(
  job: NonNullable<Awaited<ReturnType<RenderJobRepository["findById"]>>>,
) {
  const { outputPath, narrationAudioPath, ...metadata } = job;
  void narrationAudioPath;
  return {
    ...metadata,
    outputUrl:
      job.status === "completed" && outputPath
        ? `/api/renders/${job.id}/output`
        : null,
  };
}
