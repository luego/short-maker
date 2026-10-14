import { execFile } from "node:child_process";
import { access, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { mediaRoot, projectRoot } from "../lib/paths.js";

const execFileAsync = promisify(execFile);

export class FfmpegServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface RenderVideoInput {
  projectId: string;
  renderId: string;
  sourceVideoPath: string;
  narrationAudioPath: string;
  clipStart: number;
  clipDuration: number;
  width?: number;
  height?: number;
  fps?: number;
  sourceVolume?: number;
  narrationVolume?: number;
  captionsPath?: string;
}

export interface RenderVideoResult {
  absolutePath: string;
  relativePath: string;
}

type Runner = (command: string, args: string[]) => Promise<void>;
type FileExists = (filePath: string) => Promise<boolean>;

type ArgsBuilderInput = Required<
  Pick<
    RenderVideoInput,
    | "clipStart"
    | "clipDuration"
    | "width"
    | "height"
    | "fps"
    | "sourceVolume"
    | "narrationVolume"
  >
> & {
  sourceVideoPath: string;
  narrationAudioPath: string;
  outputPath: string;
  captionsPath?: string;
};

type ArgsBuilder = (input: ArgsBuilderInput) => string[];

async function defaultRunner(command: string, args: string[]) {
  await execFileAsync(command, args, { maxBuffer: 1024 * 1024 });
}

async function defaultFileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function escapeFilterPath(value: string) {
  const option = value.replace(/\\/g, "/").replace(/[':]/g, "\\$&");
  return option.replace(/[\\'[\],;]/g, "\\$&");
}

function defaultArgsBuilder(input: ArgsBuilderInput) {
  const videoFilter = [
    `scale=${input.width}:${input.height}:force_original_aspect_ratio=increase`,
    `crop=${input.width}:${input.height}`,
    `fps=${input.fps}`,
    ...(input.captionsPath
      ? [`ass=filename=${escapeFilterPath(input.captionsPath)}`]
      : []),
  ].join(",");
  const filterComplex = [
    `[0:v]${videoFilter}[v]`,
    `[0:a]volume=${input.sourceVolume}[sourcea]`,
    `[1:a]volume=${input.narrationVolume}[voice]`,
    "[sourcea][voice]amix=inputs=2:duration=first:dropout_transition=0[a]",
  ].join(";");

  return [
    "-y",
    "-ss",
    String(input.clipStart),
    "-t",
    String(input.clipDuration),
    "-i",
    input.sourceVideoPath,
    "-i",
    input.narrationAudioPath,
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    input.outputPath,
  ];
}

export class FfmpegService {
  constructor(
    private readonly executable = process.env.FFMPEG_PATH ?? "ffmpeg",
    private readonly runner: Runner = defaultRunner,
    private readonly fileExists: FileExists = defaultFileExists,
    private readonly argsBuilder: ArgsBuilder = defaultArgsBuilder,
    private readonly rendersRoot = path.join(mediaRoot, "renders"),
    private readonly tempRoot = path.join(mediaRoot, "temp"),
  ) {}

  async renderVideo(input: RenderVideoInput): Promise<RenderVideoResult> {
    const width = input.width ?? 1080;
    const height = input.height ?? 1920;
    const fps = input.fps ?? 30;
    const sourceVolume = input.sourceVolume ?? 0.18;
    const narrationVolume = input.narrationVolume ?? 1;

    const directory = path.join(this.rendersRoot, input.projectId);
    const finalPath = path.join(directory, `${input.renderId}.mp4`);
    const tempPath = path.join(this.tempRoot, `${input.renderId}.mp4`);

    await mkdir(directory, { recursive: true });
    await mkdir(this.tempRoot, { recursive: true });
    await rm(tempPath, { force: true });

    try {
      await this.runner(
        this.executable,
        this.argsBuilder({
          sourceVideoPath: input.sourceVideoPath,
          narrationAudioPath: input.narrationAudioPath,
          outputPath: tempPath,
          clipStart: input.clipStart,
          clipDuration: input.clipDuration,
          width,
          height,
          fps,
          sourceVolume,
          narrationVolume,
          captionsPath: input.captionsPath,
        }),
      );

      if (!(await this.fileExists(tempPath))) {
        throw new FfmpegServiceError(
          "RENDER_OUTPUT_MISSING",
          "FFmpeg completed but did not create the render output.",
        );
      }

      await rename(tempPath, finalPath);

      return {
        absolutePath: finalPath,
        relativePath: path.relative(projectRoot, finalPath),
      };
    } catch (error) {
      await rm(tempPath, { force: true });
      if (error instanceof FfmpegServiceError) throw error;
      throw new FfmpegServiceError(
        "RENDER_FAILED",
        "FFmpeg failed to render the video.",
      );
    }
  }
}
