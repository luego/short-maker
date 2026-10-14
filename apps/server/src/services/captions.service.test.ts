import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  buildAss,
  CaptionsService,
  escapeAssText,
  parseSrt,
} from "./captions.service.js";

it("parses Whisper SRT timestamps and clamps the last cue to narration duration", () => {
  expect(
    parseSrt(
      "\uFEFF1\r\n00:00:00,100 --> 00:00:01,500\r\nHola\r\nmundo\r\n\r\n2\r\n00:00:01,500 --> 00:00:03,000\r\nFinal",
      2,
    ),
  ).toEqual([
    { start: 0.1, end: 1.5, text: "Hola mundo" },
    { start: 1.5, end: 2, text: "Final" },
  ]);
});

it.each([
  "",
  "1\n00:00:02,000 --> 00:00:01,000\nBackwards",
  "1\n00:60:00,000 --> 00:60:01,000\nInvalid minutes",
  "1\n00:00:00,000 --> 00:00:02,000\nFirst\n\n2\n00:00:01,000 --> 00:00:02,000\nOverlap",
])("rejects invalid or missing subtitle timing", (content) => {
  expect(() => parseSrt(content, 3)).toThrow();
});

it("prevents ASS override commands and line escapes from becoming executable styling", () => {
  const escaped = escapeAssText("{\\pos(0,0)}Hola\\Nworld\nnext");
  expect(escaped).not.toMatch(/[{}\\\n]/);
  expect(buildAss([{ start: 61.23, end: 62.5, text: "Hola" }])).toContain(
    "Dialogue: 0,0:01:01.23,0:01:02.50,RobloxRant",
  );
});

it("reports missing Whisper configuration rather than fabricating captions", async () => {
  const service = new CaptionsService("", "");
  await expect(
    service.generate({
      renderId: "render-1",
      narrationAudioPath: "narration.wav",
      narrationDuration: 3,
    }),
  ).rejects.toMatchObject({ code: "WHISPER_UNAVAILABLE" });
});

it("normalizes audio, invokes Whisper with argument arrays, writes ASS, and cleans intermediate files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "short-maker-captions-"));
  try {
    const executable = path.join(root, "whisper.exe");
    const model = path.join(root, "model.bin");
    await writeFile(executable, "fixture");
    await writeFile(model, "fixture");
    const calls: string[][] = [];
    const service = new CaptionsService(
      executable,
      model,
      async (command, args) => {
        calls.push(args);
        if (command === executable) {
          await writeFile(
            `${args[args.indexOf("-of") + 1]}.srt`,
            "1\n00:00:00,000 --> 00:00:01,000\nHello captions",
          );
        } else await writeFile(args.at(-1)!, "wav");
      },
      root,
    );
    const ass = await service.generate({
      renderId: "safe-id",
      narrationAudioPath: "source;unsafe.wav",
      narrationDuration: 1,
    });
    expect(calls[0]).toContain("source;unsafe.wav");
    expect(calls[0]).toContain("16000");
    expect(calls[1]).toContain("-osrt");
    expect(calls[1]).toContain(model);
    expect(await readFile(ass, "utf8")).toContain("Hello captions");
    await expect(
      readFile(path.join(root, "safe-id-captions.wav")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(path.join(root, "safe-id-captions.srt")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      service.generate({
        renderId: "../escape",
        narrationAudioPath: "narration.wav",
        narrationDuration: 1,
      }),
    ).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
