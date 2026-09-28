import { describe, expect, it } from "vitest";
import { ApiError } from "../lib/api-error.js";
import { FfmpegServiceError } from "./ffmpeg.service.js";
import { RenderService, resolveProjectMediaPath } from "./render.service.js";

type Job = {
  id: string;
  projectId: string;
  startSeconds: number;
  narrationAudioPath: string | null;
  narrationDuration: number | null;
  status?: string;
  progress?: number;
  outputPath?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function createHarness(options?: {
  project?: {
    id: string;
    sourceVideoPath: string | null;
    sourceDuration: number | null;
  };
  job?: Partial<Job>;
  preparationError?: Error;
  ffmpegError?: Error;
}) {
  const project =
    options?.project === undefined
      ? {
          id: "project-1",
          sourceVideoPath: "media/sources/project-1/source.mp4",
          sourceDuration: 30,
        }
      : options.project;
  const job: Job = {
    id: "render-1",
    projectId: "project-1",
    startSeconds: 10,
    narrationAudioPath: null,
    narrationDuration: null,
    ...options?.job,
  };
  const statuses: Array<{ status: string; progress?: number }> = [];
  const failures: Array<{ errorCode: string; errorMessage: string }> = [];
  const ffmpegCalls: Array<{
    sourceVideoPath: string;
    narrationAudioPath: string;
    clipStart: number;
    clipDuration: number;
  }> = [];

  const service = new RenderService(
    { findById: async () => project ?? undefined },
    {
      findById: async () => job,
      setStatus: async (_id, status, progress) => {
        statuses.push({ status, progress });
        job.status = status;
        job.progress = progress;
        return job;
      },
      setOutput: async (_id, output) => {
        job.status = "completed";
        job.progress = 100;
        job.outputPath = output.outputPath;
        job.errorCode = null;
        job.errorMessage = null;
        return job;
      },
      markFailed: async (_id, failure) => {
        failures.push(failure);
        job.status = "failed";
        job.errorCode = failure.errorCode;
        job.errorMessage = failure.errorMessage;
        return job;
      },
    },
    {
      prepareNarration: async () => {
        if (options?.preparationError) throw options.preparationError;
        job.narrationAudioPath = "media/audio/project-1/render-1.wav";
        job.narrationDuration = 5;
        return job;
      },
    },
    {
      renderVideo: async (input) => {
        if (options?.ffmpegError) throw options.ffmpegError;
        ffmpegCalls.push({
          sourceVideoPath: input.sourceVideoPath,
          narrationAudioPath: input.narrationAudioPath,
          clipStart: input.clipStart,
          clipDuration: input.clipDuration,
        });
        return {
          absolutePath: "/abs/render.mp4",
          relativePath: "media/renders/project-1/render-1.mp4",
        };
      },
    },
  );

  return { service, job, statuses, failures, ffmpegCalls };
}

describe("RenderService", () => {
  it("prepares narration, validates clip bounds, renders MP4, and completes the job", async () => {
    const { service, job, statuses, failures, ffmpegCalls } = createHarness();

    await expect(service.render("render-1")).resolves.toMatchObject({
      status: "completed",
      progress: 100,
      outputPath: "media/renders/project-1/render-1.mp4",
    });

    expect(statuses).toEqual([
      { status: "preparing_video", progress: 35 },
      { status: "rendering", progress: 70 },
    ]);
    expect(ffmpegCalls).toHaveLength(1);
    expect(ffmpegCalls[0]?.sourceVideoPath).toContain("media");
    expect(ffmpegCalls[0]?.narrationAudioPath).toContain("render-1.wav");
    expect(ffmpegCalls[0]?.clipStart).toBe(10);
    expect(ffmpegCalls[0]?.clipDuration).toBe(5);
    expect(failures).toEqual([]);
    expect(job.errorCode).toBeNull();
  });

  it("marks the job failed when the clip outlasts the source video", async () => {
    const { service, failures } = createHarness({
      project: {
        id: "project-1",
        sourceVideoPath: "media/sources/project-1/source.mp4",
        sourceDuration: 12,
      },
    });

    await expect(service.render("render-1")).rejects.toMatchObject({
      status: 400,
      code: "SOURCE_VIDEO_TOO_SHORT",
    } satisfies Partial<ApiError>);

    expect(failures).toEqual([
      {
        errorCode: "SOURCE_VIDEO_TOO_SHORT",
        errorMessage:
          "The selected gameplay video ends before the narration finishes.",
      },
    ]);
  });

  it("marks the job failed when FFmpeg fails", async () => {
    const { service, failures } = createHarness({
      ffmpegError: new FfmpegServiceError(
        "RENDER_FAILED",
        "FFmpeg failed to render the video.",
      ),
    });

    await expect(service.render("render-1")).rejects.toMatchObject({
      status: 500,
      code: "RENDER_FAILED",
    } satisfies Partial<ApiError>);

    expect(failures).toEqual([
      {
        errorCode: "RENDER_FAILED",
        errorMessage: "FFmpeg failed to render the video.",
      },
    ]);
  });

  it("does not double-wrap API errors from narration preparation", async () => {
    const { service, failures } = createHarness({
      preparationError: new ApiError(
        503,
        "TTS_UNAVAILABLE",
        "audio.cpp is not configured.",
      ),
    });

    await expect(service.render("render-1")).rejects.toMatchObject({
      status: 503,
      code: "TTS_UNAVAILABLE",
    } satisfies Partial<ApiError>);
    expect(failures).toEqual([]);
  });
});

describe("resolveProjectMediaPath", () => {
  it("rejects path traversal outside the project root", () => {
    expect(() => resolveProjectMediaPath("../../outside.mp4")).toThrow(
      "Invalid media path.",
    );
  });
});
