import type { CreateRenderInput } from "@short-maker/shared";
import { eq } from "drizzle-orm";
import type { database as applicationDatabase } from "../db/client.js";
import { renderJobs } from "../db/schema.js";

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
}
