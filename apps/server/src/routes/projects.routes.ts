import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from "@short-maker/shared";
import { Router } from "express";
import { ApiError } from "../lib/api-error.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { MediaService } from "../services/media.service.js";
import { createMediaRouter } from "./media.routes.js";

export function createProjectsRouter(
  projects: ProjectRepository,
  media: Pick<MediaService, "importSource">,
) {
  const router = Router();

  router.use("/:id/source-video", createMediaRouter(projects, media));

  router.get("/", async (_request, response) => {
    response.json(await projects.list());
  });

  router.post("/", async (request, response) => {
    const project = await projects.create(
      createProjectSchema.parse(request.body),
    );
    response.status(201).json(project);
  });

  router.get("/:id", async (request, response) => {
    const id = projectIdSchema.parse(request.params.id);
    const project = await projects.findById(id);
    if (!project)
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    response.json(project);
  });

  router.patch("/:id", async (request, response) => {
    const id = projectIdSchema.parse(request.params.id);
    if (!(await projects.findById(id))) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }
    response.json(
      await projects.update(id, updateProjectSchema.parse(request.body)),
    );
  });

  router.delete("/:id", async (request, response) => {
    const id = projectIdSchema.parse(request.params.id);
    if (!(await projects.delete(id))) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }
    response.status(204).end();
  });

  return router;
}
