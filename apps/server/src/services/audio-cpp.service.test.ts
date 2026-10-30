import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

  it("passes model, text and voice to the real CLI as separate arguments", async () => {
    const root = await makeTempDir();
    const audioRoot = path.join(root, "audio");
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
        filePath === "/tools/audio-cpp.exe" ||
        filePath === "/models/kokoro.gguf" ||
        filePath.endsWith("render.wav"),
      undefined,
      audioRoot,
      "/models/kokoro.gguf",
    );

    const result = await service.generate({
      projectId: "project",
      renderId: "render",
      text: "Hello; rm -rf nope",
      voiceId: "voice; nope",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("/tools/audio-cpp.exe");
    expect(calls[0]?.args).toContain("kokoro_tts");
    expect(calls[0]?.args).toContain("/models/kokoro.gguf");
    expect(calls[0]?.args).toContain("--text");
    expect(calls[0]?.args).toContain("Hello; rm -rf nope");
    expect(calls[0]?.args).toContain("--voice-id");
    expect(calls[0]?.args).toContain("voice; nope");
    expect(calls[0]?.args).toContain("--out");
    expect(result.absolutePath).toBe(
      path.join(audioRoot, "project", "render.wav"),
    );
    expect(
      result.relativePath.endsWith(path.join("audio", "project", "render.wav")),
    ).toBe(true);
  });

  it("maps the previous default voice to a packaged Spanish voice", async () => {
    const root = await makeTempDir();

    const service = new AudioCppService(
      "/tools/audio-cpp.exe",
      async (_command, args) => {
        expect(args[args.indexOf("--voice-id") + 1]).toBe("em_alex");
        await writeFile(args.at(-1) ?? "", "wav");
      },
      async (filePath) =>
        filePath === "/tools/audio-cpp.exe" ||
        filePath === "/models/kokoro.gguf" ||
        filePath.endsWith("render.wav"),
      undefined,
      path.join(root, "audio"),
      "/models/kokoro.gguf",
    );

    await service.generate({
      projectId: "project",
      renderId: "render",
      text: "Hello",
      voiceId: "default-voice",
    });
  });

  it("reports a missing model before invoking TTS", async () => {
    const service = new AudioCppService(
      "/tools/audio-cpp",
      async () => {
        throw new Error("Must not run without a model");
      },
      async (filePath) => filePath === "/tools/audio-cpp",
      undefined,
      undefined,
      "/missing/kokoro.gguf",
    );
    await expect(
      service.generate({
        projectId: "project",
        renderId: "render",
        text: "Hello",
        voiceId: "em_alex",
      }),
    ).rejects.toMatchObject({ code: "TTS_UNAVAILABLE" });
  });

  it("wraps runner failures in a typed TTS error", async () => {
    const root = await makeTempDir();
    const service = new AudioCppService(
      "/tools/audio-cpp.exe",
      async () => {
        throw new Error("boom");
      },
      async (filePath) =>
        filePath === "/tools/audio-cpp.exe" ||
        filePath === "/models/kokoro.gguf",
      undefined,
      path.join(root, "audio"),
      "/models/kokoro.gguf",
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
