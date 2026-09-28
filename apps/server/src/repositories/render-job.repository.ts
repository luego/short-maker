import type { CreateRenderInput } from "@short-maker/shared";
import { eq } from "drizzle-orm";
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

export class RenderJobRepository {
  constructor(private readonly database: typeof applicationDatabase) {}

  async findById(id: string) {
    const [job] = await this.database
      .select()
      .from(renderJobs)
      .where(eq(renderJobs.id, id));
    return job;
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
