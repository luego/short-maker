import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../lib/api-error.js";
import { mediaRoot, projectRoot } from "../lib/paths.js";
import type { ProbeService } from "./probe.service.js";

const supportedExtensions = new Set([".mp4", ".mov", ".mkv"]);

export interface UploadedVideo {
  originalname: string;
  path: string;
}

export class MediaService {
  constructor(
    private readonly probe: ProbeService,
    private readonly sourcesRoot = path.join(mediaRoot, "sources"),
  ) {}

  async importSource(projectId: string, file: UploadedVideo) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!supportedExtensions.has(extension)) {
      await rm(file.path, { force: true });
      throw new ApiError(
        400,
        "UNSUPPORTED_VIDEO_FORMAT",
        "Use an MP4, MOV, or MKV video.",
      );
    }

    const directory = path.join(this.sourcesRoot, projectId);
    const destination = path.join(directory, `source${extension}`);
    await mkdir(directory, { recursive: true });
    await rename(file.path, destination);

    try {
      const metadata = await this.probe.probe(destination);
      return {
        sourceVideoPath: path.relative(projectRoot, destination),
        sourceFilename: path.basename(file.originalname),
        sourceDuration: metadata.duration,
        sourceWidth: metadata.width,
        sourceHeight: metadata.height,
        sourceFps: metadata.fps,
      };
    } catch {
      await rm(destination, { force: true });
      throw new ApiError(
        400,
        "VIDEO_PROBE_FAILED",
        "Unable to read video metadata.",
      );
    }
  }
}
