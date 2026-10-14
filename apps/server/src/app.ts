import express from "express";
import { errorMiddleware } from "./middleware/error.middleware.js";
import type { ProjectRepository } from "./repositories/project.repository.js";
import type { RenderJobRepository } from "./repositories/render-job.repository.js";
import { createProjectsRouter } from "./routes/projects.routes.js";
import { createRendersRouter } from "./routes/renders.routes.js";
import type { MediaService } from "./services/media.service.js";
import type { RenderQueue } from "./jobs/render.queue.js";

export interface AppDependencies {
  projects: ProjectRepository;
  renderJobs: RenderJobRepository;
  media: Pick<MediaService, "importSource">;
  queue: Pick<RenderQueue, "enqueue">;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api/projects",
    createProjectsRouter(dependencies.projects, dependencies.media),
  );
  app.use(
    "/api/renders",
    createRendersRouter(
      dependencies.projects,
      dependencies.renderJobs,
      dependencies.queue,
    ),
  );
  app.use(errorMiddleware);
  return app;
}
