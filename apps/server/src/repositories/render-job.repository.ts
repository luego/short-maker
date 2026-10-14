import type { CreateRenderInput } from "@short-maker/shared";
import { eq, notInArray } from "drizzle-orm";
import type { database as applicationDatabase } from "../db/client.js";
import { renderJobs } from "../db/schema.js";

export interface NarrationMetadata {
  narrationAudioPath: string;
  narrationDuration: number;
}

export interface RenderJobFailure {
  errorCode: string;
  errorMessage: string;
}

export interface RenderOutput {
  outputPath: string;
}

export class RenderJobRepository {
  constructor(private readonly database: typeof applicationDatabase) {}

  async findById(id: string) {
    const [job] = await this.database
      .select()
      .from(renderJobs)
      .where(eq(renderJobs.id, id));
    return job;
  }

  async failInterrupted() {
    await this.database
      .update(renderJobs)
      .set({
        status: "failed",
        errorCode: "RENDER_INTERRUPTED",
        errorMessage:
          "The server stopped before this render finished. Generate it again.",
        updatedAt: new Date().toISOString(),
      })
      .where(notInArray(renderJobs.status, ["completed", "failed"]));
  }

  async create(input: CreateRenderInput) {
    const id = crypto.randomUUID();
    await this.database.insert(renderJobs).values({ id, ...input });
    return this.findById(id);
  }

  async setStatus(id: string, status: string, progress?: number) {
    await this.database
      .update(renderJobs)
      .set({
        status,
        ...(progress === undefined ? {} : { progress }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(renderJobs.id, id));
    return this.findById(id);
  }

  async setNarrationMetadata(id: string, metadata: NarrationMetadata) {
    await this.database
      .update(renderJobs)
      .set({
        narrationAudioPath: metadata.narrationAudioPath,
        narrationDuration: metadata.narrationDuration,
        status: "analyzing_audio",
        progress: 25,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(renderJobs.id, id));
    return this.findById(id);
  }

  async setOutput(id: string, output: RenderOutput) {
    await this.database
      .update(renderJobs)
      .set({
        outputPath: output.outputPath,
        status: "completed",
        progress: 100,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(renderJobs.id, id));
    return this.findById(id);
  }

  async markFailed(id: string, failure: RenderJobFailure) {
    await this.database
      .update(renderJobs)
      .set({
        status: "failed",
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(renderJobs.id, id));
    return this.findById(id);
  }
}
