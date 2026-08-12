import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ProbeOutput = {
  format?: { duration?: string };
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
  }>;
};

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export function parseProbeOutput(output: ProbeOutput): VideoMetadata {
  const video = output.streams?.find((stream) => stream.codec_type === "video");
  const duration = Number(output.format?.duration);
  const [numerator, denominator] = (video?.avg_frame_rate ?? "0/1")
    .split("/")
    .map(Number);
  const fps = (numerator ?? 0) / (denominator || 1);

  if (
    !video?.width ||
    !video.height ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(fps) ||
    fps <= 0
  ) {
    throw new Error("ffprobe returned incomplete video metadata.");
  }

  return { duration, width: video.width, height: video.height, fps };
}

type Runner = (command: string, args: string[]) => Promise<string>;

async function defaultRunner(command: string, args: string[]) {
  const { stdout } = await execFileAsync(command, args, {
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

export class ProbeService {
  constructor(
    private readonly executable = process.env.FFPROBE_PATH ?? "ffprobe",
    private readonly runner: Runner = defaultRunner,
  ) {}

  async probe(filePath: string) {
    const output = await this.runner(this.executable, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);
    return parseProbeOutput(JSON.parse(output) as ProbeOutput);
  }
}
