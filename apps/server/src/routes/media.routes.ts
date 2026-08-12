import { createReadStream } from "node:fs";
import path from "node:path";
import { projectIdSchema } from "@short-maker/shared";
import { Router } from "express";
import multer from "multer";
import { ApiError } from "../lib/api-error.js";
import { mediaRoot, projectRoot } from "../lib/paths.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { MediaService } from "../services/media.service.js";

const supportedVideoExtension = /\.(mp4|mov|mkv)$/i;

const upload = multer({
  dest: path.join(mediaRoot, "temp"),
  limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!supportedVideoExtension.test(file.originalname)) {
      callback(
        new ApiError(
          400,
          "UNSUPPORTED_VIDEO_FORMAT",
          "Use an MP4, MOV, or MKV video.",
        ),
      );
      return;
    }
    callback(null, true);
  },
});

export function createMediaRouter(
  projects: ProjectRepository,
  media: Pick<MediaService, "importSource">,
) {
  const router = Router({ mergeParams: true });

  router.post("/", upload.single("video"), async (request, response) => {
    const projectId = projectIdSchema.parse(
      (request.params as { id?: string }).id,
    );
    if (!(await projects.findById(projectId))) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }
    if (!request.file) {
      throw new ApiError(400, "VIDEO_REQUIRED", "Select a source video.");
    }

    const source = await media.importSource(projectId, request.file);
    const project = await projects.setSourceVideo(projectId, source);
    const safeProject = { ...project, sourceVideoPath: undefined };
    response.json({
      ...safeProject,
      sourceUrl: `/api/projects/${projectId}/source-video`,
    });
  });

  router.get("/", async (request, response) => {
    const projectId = projectIdSchema.parse(
      (request.params as { id?: string }).id,
    );
    const project = await projects.findById(projectId);
    if (!project?.sourceVideoPath) {
      throw new ApiError(
        404,
        "SOURCE_VIDEO_NOT_FOUND",
        "Source video not found.",
      );
    }
    const filePath = path.resolve(projectRoot, project.sourceVideoPath);
    if (!filePath.startsWith(`${projectRoot}${path.sep}`)) {
      throw new ApiError(400, "INVALID_MEDIA_PATH", "Invalid media path.");
    }
    response.type(path.extname(filePath));
    createReadStream(filePath).pipe(response);
  });

  return router;
}
