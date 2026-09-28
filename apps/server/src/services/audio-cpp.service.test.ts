import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { AudioCppService, TtsServiceError } from "./audio-cpp.service.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const directory = await mkdtemp(path.join(tmpdir(), "short-maker-tts-"));
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

describe("AudioCppService", () => {
  it("returns a useful unavailable error when no executable is configured", async () => {
    const service = new AudioCppService(undefined);

    await expect(
      service.generate({
        projectId: "project",
        renderId: "render",
        text: "Hello",
        voiceId: "voice",
      }),
    ).rejects.toMatchObject({
      code: "TTS_UNAVAILABLE",
      message:
        "audio.cpp is not configured. Set AUDIO_CPP_PATH to enable narration generation.",
    });
  });

  it("validates that the configured executable exists", async () => {
    const service = new AudioCppService(
      "/missing/audio-cpp",
      async () => {},
      async () => false,
    );

    await expect(
      service.generate({
        projectId: "project",
        renderId: "render",
        text: "Hello",
        voiceId: "voice",
      }),
    ).rejects.toMatchObject({ code: "TTS_UNAVAILABLE" });
  });

  it("invokes audio.cpp with arguments instead of a shell command and writes text through a temp file", async () => {
    const root = await makeTempDir();
    const audioRoot = path.join(root, "audio");
    const tempRoot = path.join(root, "temp");
    const calls: Array<{ command: string; args: string[] }> = [];

    const service = new AudioCppService(
      "/tools/audio-cpp.exe",
      async (command, args) => {
        calls.push({ command, args });
        const outputPath = args.at(-1);
        if (!outputPath) throw new Error("missing output path");
        await writeFile(outputPath, "wav");
      },
      async (filePath) =>
        filePath === "/tools/audio-cpp.exe" || filePath.endsWith("render.wav"),
      undefined,
      audioRoot,
      tempRoot,
    );

    const result = await service.generate({
      projectId: "project",
      renderId: "render",
      text: "Hello; rm -rf nope",
      voiceId: "voice; nope",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("/tools/audio-cpp.exe");
    expect(calls[0]?.args).toContain("--text-file");
    expect(calls[0]?.args).toContain("--voice");
    expect(calls[0]?.args).toContain("voice; nope");
    expect(calls[0]?.args).toContain("--output");
    expect(result.absolutePath).toBe(
      path.join(audioRoot, "project", "render.wav"),
    );
    expect(
      result.relativePath.endsWith(path.join("audio", "project", "render.wav")),
    ).toBe(true);
  });

  it("removes the temporary text file after successful generation", async () => {
    const root = await makeTempDir();
    const tempRoot = path.join(root, "temp");
    let textFilePath = "";

    const service = new AudioCppService(
      "/tools/audio-cpp.exe",
      async (_command, args) => {
        textFilePath = args[1] ?? "";
        expect(await readFile(textFilePath, "utf8")).toBe("Hello");
        await writeFile(args.at(-1) ?? "", "wav");
      },
      async (filePath) =>
        filePath === "/tools/audio-cpp.exe" || filePath.endsWith("render.wav"),
      undefined,
      path.join(root, "audio"),
      tempRoot,
    );

    await service.generate({
      projectId: "project",
      renderId: "render",
      text: "Hello",
      voiceId: "voice",
    });

    await expect(readFile(textFilePath, "utf8")).rejects.toThrow();
  });

  it("wraps runner failures in a typed TTS error", async () => {
    const root = await makeTempDir();
    const service = new AudioCppService(
      "/tools/audio-cpp.exe",
      async () => {
        throw new Error("boom");
      },
      async (filePath) => filePath === "/tools/audio-cpp.exe",
      undefined,
      path.join(root, "audio"),
      path.join(root, "temp"),
    );

    await expect(
      service.generate({
        projectId: "project",
        renderId: "render",
        text: "Hello",
        voiceId: "voice",
      }),
    ).rejects.toBeInstanceOf(TtsServiceError);
    await expect(
      service.generate({
        projectId: "project",
        renderId: "render",
        text: "Hello",
        voiceId: "voice",
      }),
    ).rejects.toMatchObject({ code: "TTS_GENERATION_FAILED" });
  });
});
