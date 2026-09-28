import { ApiError } from "../lib/api-error.js";
import type {
  NarrationMetadata,
  RenderJobFailure,
} from "../repositories/render-job.repository.js";
import { TtsServiceError, type AudioCppService } from "./audio-cpp.service.js";
import type { ProbeService } from "./probe.service.js";

interface ProjectLookup {
  findById(id: string): Promise<{ id: string } | undefined>;
}

interface RenderJobForNarration {
  id: string;
  projectId: string;
  script: string;
  voiceId: string;
}

interface RenderJobStore {
  findById(id: string): Promise<RenderJobForNarration | undefined>;
  setStatus(
    id: string,
    status: string,
    progress?: number,
  ): Promise<RenderJobForNarration | undefined>;
  setNarrationMetadata(
    id: string,
    metadata: NarrationMetadata,
  ): Promise<RenderJobForNarration | undefined>;
  markFailed(
    id: string,
    failure: RenderJobFailure,
  ): Promise<RenderJobForNarration | undefined>;
}

export class RenderPreparationService {
  constructor(
    private readonly projects: ProjectLookup,
    private readonly renderJobs: RenderJobStore,
    private readonly tts: Pick<AudioCppService, "generate">,
    private readonly probe: Pick<ProbeService, "probeDuration">,
  ) {}

  async prepareNarration(renderId: string) {
    const job = await this.renderJobs.findById(renderId);
    if (!job) {
      throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
    }

    const project = await this.projects.findById(job.projectId);
    if (!project) {
      await this.renderJobs.markFailed(renderId, {
        errorCode: "PROJECT_NOT_FOUND",
        errorMessage: "Project not found.",
      });
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }

    try {
      await this.renderJobs.setStatus(renderId, "generating_audio", 10);
      const narration = await this.tts.generate({
        projectId: project.id,
        renderId: job.id,
        text: job.script,
        voiceId: job.voiceId,
      });
      const narrationDuration = await this.probe.probeDuration(
        narration.absolutePath,
      );
      const updated = await this.renderJobs.setNarrationMetadata(renderId, {
        narrationAudioPath: narration.relativePath,
        narrationDuration,
      });
      if (!updated) {
        throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
      }
      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error instanceof TtsServiceError) {
        await this.renderJobs.markFailed(renderId, {
          errorCode: error.code,
          errorMessage: error.message,
        });
        throw new ApiError(503, error.code, error.message);
      }

      await this.renderJobs.markFailed(renderId, {
        errorCode: "NARRATION_PREP_FAILED",
        errorMessage: "Unable to prepare narration audio.",
      });
      throw new ApiError(
        500,
        "NARRATION_PREP_FAILED",
        "Unable to prepare narration audio.",
      );
    }
  }
}
