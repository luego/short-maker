import { execFile } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { mediaRoot } from "../lib/paths.js";

const execFileAsync = promisify(execFile);
type Runner = (command: string, args: string[]) => Promise<void>;

export class CaptionServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type CaptionCue = { start: number; end: number; text: string };

function timestamp(value: string) {
  const [hours, minutes, seconds, millis] = value.split(/[:,]/).map(Number);
  return hours! * 3600 + minutes! * 60 + seconds! + millis! / 1000;
}

export function parseSrt(content: string, duration: number): CaptionCue[] {
  if (!Number.isFinite(duration) || duration <= 0)
    throw new CaptionServiceError(
      "CAPTION_TIMING_INVALID",
      "Narration duration is invalid.",
    );
  const blocks = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n/);
  const cues: CaptionCue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const times = lines[1]?.match(
      /^(\d{2,}:\d{2}:\d{2},\d{3}) --> (\d{2,}:\d{2}:\d{2},\d{3})$/,
    );
    if (!/^\d+$/.test(lines[0] ?? "") || !times)
      throw new CaptionServiceError(
        "CAPTION_TIMING_INVALID",
        "Whisper returned invalid subtitle timings.",
      );
    for (const value of [times[1]!, times[2]!]) {
      const parts = value.split(/[:,]/).map(Number);
      if (parts[1]! > 59 || parts[2]! > 59)
        throw new CaptionServiceError(
          "CAPTION_TIMING_INVALID",
          "Whisper returned invalid subtitle timings.",
        );
    }
    const start = timestamp(times[1]!);
    const end = Math.min(timestamp(times[2]!), duration);
    const text = lines.slice(2).join(" ").trim();
    if (!text || end <= start || start < (cues.at(-1)?.end ?? 0))
      throw new CaptionServiceError(
        "CAPTION_TIMING_INVALID",
        "Whisper returned invalid subtitle timings.",
      );
    cues.push({ start, end, text });
  }
  return cues;
}

export function escapeAssText(text: string) {
  // Remove override delimiters and escape sequences so subtitle text stays literal.
  return text
    .replace(/\\/g, "＼")
    .replace(/{/g, "｛")
    .replace(/}/g, "｝")
    .replace(/[\r\n]+/g, " ")
    .split("")
    .filter((character) => character.charCodeAt(0) >= 32)
    .join("");
}

function assTimestamp(seconds: number) {
  const centiseconds = Math.floor(seconds * 100);
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor(centiseconds / 6000) % 60;
  const wholeSeconds = Math.floor(centiseconds / 100) % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(centiseconds % 100).padStart(2, "0")}`;
}

export function buildAss(cues: CaptionCue[]) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: RobloxRant,Arial,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,1,5,90,90,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${cues.map((cue) => `Dialogue: 0,${assTimestamp(cue.start)},${assTimestamp(cue.end)},RobloxRant,,0,0,0,,${escapeAssText(cue.text)}`).join("\n")}
`;
}

async function defaultRunner(command: string, args: string[]) {
  try {
    await execFileAsync(command, args, { maxBuffer: 1024 * 1024 });
    console.log(
      JSON.stringify({ event: "captions.process_exit", command, exitCode: 0 }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "captions.process_exit",
        command,
        exitCode: (error as { code?: unknown }).code,
      }),
    );
    throw error;
  }
}

export class CaptionsService {
  constructor(
    private readonly executable = process.env.WHISPER_CPP_PATH,
    private readonly model = process.env.WHISPER_MODEL_PATH,
    private readonly runner: Runner = defaultRunner,
    private readonly tempRoot = path.join(mediaRoot, "temp"),
    private readonly ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg",
  ) {}

  async generate(input: {
    renderId: string;
    narrationAudioPath: string;
    narrationDuration: number;
  }) {
    z.string()
      .regex(/^[a-zA-Z0-9-]+$/)
      .parse(input.renderId);
    if (!this.executable || !this.model)
      throw new CaptionServiceError(
        "WHISPER_UNAVAILABLE",
        "Configure WHISPER_CPP_PATH and WHISPER_MODEL_PATH to generate synchronized captions.",
      );
    try {
      await access(this.executable);
      await access(this.model);
    } catch {
      throw new CaptionServiceError(
        "WHISPER_UNAVAILABLE",
        "Whisper executable or model was not found. Check the configured paths.",
      );
    }
    await mkdir(this.tempRoot, { recursive: true });
    const prefix = path.join(this.tempRoot, `${input.renderId}-captions`);
    const wav = `${prefix}.wav`;
    const srt = `${prefix}.srt`;
    const ass = `${prefix}.ass`;
    try {
      // whisper.cpp accepts 16 kHz mono PCM WAV input.
      await this.runner(this.ffmpeg, [
        "-y",
        "-v",
        "error",
        "-i",
        input.narrationAudioPath,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        wav,
      ]);
      await rm(srt, { force: true });
      await this.runner(this.executable, [
        "-m",
        this.model,
        "-f",
        wav,
        "-l",
        "auto",
        "-osrt",
        "-of",
        prefix,
        "-ml",
        "32",
        "-sow",
        "-np",
      ]);
      const cues = parseSrt(
        await readFile(srt, "utf8"),
        input.narrationDuration,
      );
      await writeFile(ass, buildAss(cues), "utf8");
      return ass;
    } catch (error) {
      if (error instanceof CaptionServiceError) throw error;
      throw new CaptionServiceError(
        "CAPTION_GENERATION_FAILED",
        "Unable to generate synchronized captions. Check Whisper, its model, and FFmpeg.",
      );
    } finally {
      await rm(wav, { force: true });
      await rm(srt, { force: true });
    }
  }
}
