import { execFile } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { mediaRoot, projectRoot } from "../lib/paths.js";

const execFileAsync = promisify(execFile);

export class TtsServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface TtsGenerateInput {
  projectId: string;
  renderId: string;
  text: string;
  voiceId: string;
}

export interface TtsGenerateResult {
  absolutePath: string;
  relativePath: string;
}

type Runner = (command: string, args: string[]) => Promise<void>;
type FileExists = (filePath: string) => Promise<boolean>;

type ArgsBuilderInput = TtsGenerateInput & {
  textFilePath: string;
  outputPath: string;
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

function defaultArgsBuilder(input: ArgsBuilderInput) {
  return [
    "--text-file",
    input.textFilePath,
    "--voice",
    input.voiceId,
    "--output",
    input.outputPath,
  ];
}

export class AudioCppService {
  constructor(
    private readonly executable = process.env.AUDIO_CPP_PATH,
    private readonly runner: Runner = defaultRunner,
    private readonly fileExists: FileExists = defaultFileExists,
    private readonly argsBuilder: ArgsBuilder = defaultArgsBuilder,
    private readonly audioRoot = path.join(mediaRoot, "audio"),
    private readonly tempRoot = path.join(mediaRoot, "temp"),
  ) {}

  async generate(input: TtsGenerateInput): Promise<TtsGenerateResult> {
    if (!this.executable) {
      throw new TtsServiceError(
        "TTS_UNAVAILABLE",
        "audio.cpp is not configured. Set AUDIO_CPP_PATH to enable narration generation.",
      );
    }

    if (!(await this.fileExists(this.executable))) {
      throw new TtsServiceError(
        "TTS_UNAVAILABLE",
        "audio.cpp executable was not found. Check AUDIO_CPP_PATH.",
      );
    }

    const directory = path.join(this.audioRoot, input.projectId);
    const outputPath = path.join(directory, `${input.renderId}.wav`);
    const textFilePath = path.join(this.tempRoot, `${input.renderId}.txt`);

    await mkdir(directory, { recursive: true });
    await mkdir(this.tempRoot, { recursive: true });
    await writeFile(textFilePath, input.text, "utf8");

    try {
      await this.runner(
        this.executable,
        this.argsBuilder({ ...input, textFilePath, outputPath }),
      );

      if (!(await this.fileExists(outputPath))) {
        throw new TtsServiceError(
          "TTS_OUTPUT_MISSING",
          "audio.cpp completed but did not create the narration WAV.",
        );
      }

      return {
        absolutePath: outputPath,
        relativePath: path.relative(projectRoot, outputPath),
      };
    } catch (error) {
      if (error instanceof TtsServiceError) throw error;
      throw new TtsServiceError(
        "TTS_GENERATION_FAILED",
        "audio.cpp failed to generate narration audio.",
      );
    } finally {
      await rm(textFilePath, { force: true });
    }
  }
}
