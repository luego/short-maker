import { describe, expect, it } from "vitest";
import { ApiError } from "../lib/api-error.js";
import { TtsServiceError } from "./audio-cpp.service.js";
import { RenderPreparationService } from "./render-preparation.service.js";

type Job = {
  id: string;
  projectId: string;
  script: string;
  voiceId: string;
  status?: string;
  narrationAudioPath?: string | null;
  narrationDuration?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function createHarness(options?: { ttsError?: Error }) {
  const job: Job = {
    id: "render-1",
    projectId: "project-1",
    script: "Hello narration",
    voiceId: "voice-1",
  };
  const failures: Array<{ errorCode: string; errorMessage: string }> = [];
  const statuses: Array<{ status: string; progress?: number }> = [];

  const service = new RenderPreparationService(
    { findById: async () => ({ id: "project-1" }) },
    {
      findById: async () => job,
      setStatus: async (_id, status, progress) => {
        statuses.push({ status, progress });
        job.status = status;
        return job;
      },
      setNarrationMetadata: async (_id, metadata) => {
        job.narrationAudioPath = metadata.narrationAudioPath;
        job.narrationDuration = metadata.narrationDuration;
        job.status = "analyzing_audio";
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
      generate: async (input) => {
        if (options?.ttsError) throw options.ttsError;
        expect(input).toMatchObject({
          projectId: "project-1",
          renderId: "render-1",
          text: "Hello narration",
          voiceId: "voice-1",
        });
        return {
          absolutePath: "/abs/narration.wav",
          relativePath: "media/audio/project-1/render-1.wav",
        };
      },
    },
    { probeDuration: async () => 4.25 },
  );

  return { service, job, failures, statuses };
}

describe("RenderPreparationService", () => {
  it("generates narration, measures duration, and persists metadata", async () => {
    const { service, job, statuses, failures } = createHarness();

    await expect(service.prepareNarration("render-1")).resolves.toMatchObject({
      narrationAudioPath: "media/audio/project-1/render-1.wav",
      narrationDuration: 4.25,
      status: "analyzing_audio",
    });

    expect(statuses).toEqual([{ status: "generating_audio", progress: 10 }]);
    expect(job.narrationDuration).toBe(4.25);
    expect(failures).toEqual([]);
  });

  it("records a failed job and returns a useful API error when TTS is unavailable", async () => {
    const { service, failures } = createHarness({
      ttsError: new TtsServiceError(
        "TTS_UNAVAILABLE",
        "audio.cpp is not configured. Set AUDIO_CPP_PATH to enable narration generation.",
      ),
    });

    await expect(service.prepareNarration("render-1")).rejects.toMatchObject({
      status: 503,
      code: "TTS_UNAVAILABLE",
    } satisfies Partial<ApiError>);

    expect(failures).toEqual([
      {
        errorCode: "TTS_UNAVAILABLE",
        errorMessage:
          "audio.cpp is not configured. Set AUDIO_CPP_PATH to enable narration generation.",
      },
    ]);
  });
});
