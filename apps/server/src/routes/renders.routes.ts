import { createRenderSchema, projectIdSchema } from "@short-maker/shared";
import { Router } from "express";
import { ApiError } from "../lib/api-error.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { RenderJobRepository } from "../repositories/render-job.repository.js";
import type { RenderPreparationService } from "../services/render-preparation.service.js";
import type { RenderService } from "../services/render.service.js";

export function createRendersRouter(
  projects: ProjectRepository,
  renderJobs: RenderJobRepository,
  preparation?: Pick<RenderPreparationService, "prepareNarration">,
  renderer?: Pick<RenderService, "render">,
) {
  const router = Router();

  router.post("/", async (request, response) => {
    const input = createRenderSchema.parse(request.body);
    if (!(await projects.findById(input.projectId))) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }
    response.status(201).json(await renderJobs.create(input));
  });

  router.post("/:id/prepare-narration", async (request, response) => {
    if (!preparation) {
      throw new ApiError(
        503,
        "NARRATION_PREP_UNAVAILABLE",
        "Narration preparation is not configured.",
      );
    }
    const id = projectIdSchema.parse(request.params.id);
    response.json(await preparation.prepareNarration(id));
  });

  router.post("/:id/render", async (request, response) => {
    if (!renderer) {
      throw new ApiError(
        503,
        "RENDER_UNAVAILABLE",
        "Video rendering is not configured.",
      );
    }
    const id = projectIdSchema.parse(request.params.id);
    response.json(await renderer.render(id));
  });

  router.get("/:id", async (request, response) => {
    const id = projectIdSchema.parse(request.params.id);
    const job = await renderJobs.findById(id);
    if (!job)
      throw new ApiError(404, "RENDER_NOT_FOUND", "Render job not found.");
    response.json(job);
  });

  return router;
}
