import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@short-maker/shared";
import { desc, eq } from "drizzle-orm";
import type { database as applicationDatabase } from "../db/client.js";
import { projects } from "../db/schema.js";

export interface SourceVideoData {
  sourceVideoPath: string;
  sourceFilename: string;
  sourceDuration: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceFps: number;
}

export class ProjectRepository {
  constructor(private readonly database: typeof applicationDatabase) {}

  async list() {
    return this.database
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt));
  }

  async findById(id: string) {
    const [project] = await this.database
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async create(input: CreateProjectInput) {
    const id = crypto.randomUUID();
    await this.database.insert(projects).values({ id, ...input });
    return this.findById(id);
  }

  async update(id: string, input: UpdateProjectInput) {
    await this.database
      .update(projects)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    const result = await this.database
      .delete(projects)
      .where(eq(projects.id, id));
    return result.rowsAffected > 0;
  }

  async setSourceVideo(id: string, source: SourceVideoData) {
    await this.database
      .update(projects)
      .set({ ...source, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id));
    return this.findById(id);
  }
}
