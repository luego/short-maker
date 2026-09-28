import path from "node:path";
import { ApiError } from "../lib/api-error.js";
import { projectRoot } from "../lib/paths.js";
import type {
  RenderJobFailure,
  RenderOutput,
} from "../repositories/render-job.repository.js";
import { calculateClipBounds, ClipValidationError } from "./clip.service.js";
import { FfmpegServiceError, type FfmpegService } from "./ffmpeg.service.js";

interface ProjectForRender {
  id: string;
  sourceVideoPath: string | null;
  sourceDuration: number | null;
}

interface RenderJobForRender {
  id: string;
  projectId: string;
  startSeconds: number;
  narrationAudioPath: string | null;
  narrationDuration: number | null;
}

interface ProjectLookup {
  findById(id: string): Promise<ProjectForRender | undefined>;
}

interface RenderJobStore {
  findById(id: string): Promise<RenderJobForRender | undefined>;
  setStatus(
    id: string,
    status: string,
    progress?: number,
  ): Promise<RenderJobForRender | undefined>;
  setOutput(
    id: string,
    output: RenderOutput,
  ): Promise<RenderJobForRender | undefined>;
  markFailed(
    id: string,
    failure: RenderJobFailure,
  ): Promise<RenderJobForRender | undefined>;
}

export class RenderService {
  constructor(
    private readonly projects: ProjectLookup,
    private readonly renderJobs: RenderJobStore,
    private readonly preparation: {
      prepareNarration(renderId: string): Promise<unknown>;
    },
    private readonly ffmpeg: Pick<FfmpegService, "renderVideo">,
  ) {}

  async render(renderId: string) {
    const initialJob = await this.renderJobs.findById(renderId);
    if (!initialJob) {
      throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
    }

    const project = await this.projects.findById(initialJob.projectId);
    if (!project) {
      await this.fail(renderId, "PROJECT_NOT_FOUND", "Project not found.");
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }

    try {
      await this.preparation.prepareNarration(renderId);
      const renderJob = await this.renderJobs.findById(renderId);
      if (!renderJob) {
        throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
      }

      if (!project.sourceVideoPath) {
        throw new ClipValidationError(
          "SOURCE_VIDEO_REQUIRED",
          "Import a source video before rendering.",
        );
      }

      if (!renderJob.narrationAudioPath) {
        throw new ClipValidationError(
          "NARRATION_DURATION_REQUIRED",
          "Generate narration before rendering video.",
        );
      }

      await this.renderJobs.setStatus(renderId, "preparing_video", 35);
      const clip = calculateClipBounds({
        sourceDuration: project.sourceDuration,
        startSeconds: renderJob.startSeconds,
        narrationDuration: renderJob.narrationDuration,
      });

      await this.renderJobs.setStatus(renderId, "rendering", 70);
      const output = await this.ffmpeg.renderVideo({
        projectId: project.id,
        renderId,
        sourceVideoPath: resolveProjectMediaPath(project.sourceVideoPath),
        narrationAudioPath: resolveProjectMediaPath(
          renderJob.narrationAudioPath,
        ),
        clipStart: clip.clipStart,
        clipDuration: clip.clipDuration,
      });

      const completed = await this.renderJobs.setOutput(renderId, {
        outputPath: output.relativePath,
      });
      if (!completed) {
        throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
      }
      return completed;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error instanceof ClipValidationError) {
        await this.fail(renderId, error.code, error.message);
        throw new ApiError(400, error.code, error.message);
      }

      if (error instanceof FfmpegServiceError) {
        await this.fail(renderId, error.code, error.message);
        throw new ApiError(500, error.code, error.message);
      }

      await this.fail(renderId, "RENDER_FAILED", "Unable to render the video.");
      throw new ApiError(500, "RENDER_FAILED", "Unable to render the video.");
    }
  }

  private async fail(
    renderId: string,
    errorCode: string,
    errorMessage: string,
  ) {
    await this.renderJobs.markFailed(renderId, { errorCode, errorMessage });
  }
}

export function resolveProjectMediaPath(relativePath: string) {
  const resolved = path.resolve(projectRoot, relativePath);
  if (
    resolved !== projectRoot &&
    !resolved.startsWith(`${projectRoot}${path.sep}`)
  ) {
    throw new ApiError(400, "INVALID_MEDIA_PATH", "Invalid media path.");
  }
  return resolved;
}
