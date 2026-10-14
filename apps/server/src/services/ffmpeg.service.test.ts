import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { FfmpegService, FfmpegServiceError } from "./ffmpeg.service.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const directory = await mkdtemp(path.join(tmpdir(), "short-maker-ffmpeg-"));
  tempDirs.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("FfmpegService", () => {
  it("renders with FFmpeg argument arrays and stores the final MP4", async () => {
    const root = await makeTempDir();
    const rendersRoot = path.join(root, "renders");
    const tempRoot = path.join(root, "temp");
    const calls: Array<{ command: string; args: string[] }> = [];

    const service = new FfmpegService(
      "/tools/ffmpeg.exe",
      async (command, args) => {
        calls.push({ command, args });
        await writeFile(args.at(-1) ?? "", "mp4");
      },
      async (filePath) => filePath.endsWith("render-1.mp4"),
      undefined,
      rendersRoot,
      tempRoot,
    );

    const result = await service.renderVideo({
      projectId: "project-1",
      renderId: "render-1",
      sourceVideoPath: "/media/source;rm -rf nope.mp4",
      narrationAudioPath: "/media/narration.wav",
      captionsPath: "C:/captions/test.ass",
      clipStart: 2.5,
      clipDuration: 7,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("/tools/ffmpeg.exe");
    expect(calls[0]?.args).toContain("-filter_complex");
    expect(calls[0]?.args).toContain("/media/source;rm -rf nope.mp4");
    expect(calls[0]?.args).toContain("/media/narration.wav");
    expect(calls[0]?.args).toContain("libx264");
    expect(calls[0]?.args).toContain("aac");
    expect(calls[0]?.args.join(" ")).toContain("scale=1080:1920");
    expect(calls[0]?.args.join(" ")).toContain("volume=0.18");
    expect(calls[0]?.args.join(" ")).toContain("ass=filename=");
    expect(result.absolutePath).toBe(
      path.join(rendersRoot, "project-1", "render-1.mp4"),
    );
    await expect(readFile(result.absolutePath, "utf8")).resolves.toBe("mp4");
  });

  it("supports template render settings without changing shell safety", async () => {
    const root = await makeTempDir();
    const calls: string[][] = [];
    const service = new FfmpegService(
      "ffmpeg",
      async (_command, args) => {
        calls.push(args);
        await writeFile(args.at(-1) ?? "", "mp4");
      },
      async () => true,
      undefined,
      path.join(root, "renders"),
      path.join(root, "temp"),
    );

    await service.renderVideo({
      projectId: "project-1",
      renderId: "render-1",
      sourceVideoPath: "/media/source.mp4",
      narrationAudioPath: "/media/narration.wav",
      clipStart: 0,
      clipDuration: 3,
      width: 720,
      height: 1280,
      fps: 24,
      sourceVolume: 0.1,
      narrationVolume: 0.9,
    });

    expect(calls[0]?.join(" ")).toContain("scale=720:1280");
    expect(calls[0]?.join(" ")).toContain("fps=24");
    expect(calls[0]?.join(" ")).toContain("volume=0.1");
    expect(calls[0]?.join(" ")).toContain("volume=0.9");
  });

  it("wraps FFmpeg failures in a typed error", async () => {
    const root = await makeTempDir();
    const service = new FfmpegService(
      "ffmpeg",
      async () => {
        throw new Error("boom");
      },
      async () => false,
      undefined,
      path.join(root, "renders"),
      path.join(root, "temp"),
    );

    await expect(
      service.renderVideo({
        projectId: "project-1",
        renderId: "render-1",
        sourceVideoPath: "/media/source.mp4",
        narrationAudioPath: "/media/narration.wav",
        clipStart: 0,
        clipDuration: 3,
      }),
    ).rejects.toMatchObject({ code: "RENDER_FAILED" });
  });

  it("reports missing output when FFmpeg exits without creating an MP4", async () => {
    const root = await makeTempDir();
    const service = new FfmpegService(
      "ffmpeg",
      async () => {},
      async () => false,
      undefined,
      path.join(root, "renders"),
      path.join(root, "temp"),
    );

    await expect(
      service.renderVideo({
        projectId: "project-1",
        renderId: "render-1",
        sourceVideoPath: "/media/source.mp4",
        narrationAudioPath: "/media/narration.wav",
        clipStart: 0,
        clipDuration: 3,
      }),
    ).rejects.toBeInstanceOf(FfmpegServiceError);
    await expect(
      service.renderVideo({
        projectId: "project-1",
        renderId: "render-1",
        sourceVideoPath: "/media/source.mp4",
        narrationAudioPath: "/media/narration.wav",
        clipStart: 0,
        clipDuration: 3,
      }),
    ).rejects.toMatchObject({ code: "RENDER_OUTPUT_MISSING" });
  });
});
