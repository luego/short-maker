export class ClipValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface ClipBoundsInput {
  sourceDuration?: number | null;
  startSeconds: number;
  narrationDuration?: number | null;
}

export interface ClipBounds {
  clipStart: number;
  clipDuration: number;
  clipEnd: number;
}

export function calculateClipBounds(input: ClipBoundsInput): ClipBounds {
  if (!Number.isFinite(input.sourceDuration) || !input.sourceDuration) {
    throw new ClipValidationError(
      "SOURCE_VIDEO_REQUIRED",
      "Import a source video before rendering.",
    );
  }

  if (!Number.isFinite(input.narrationDuration) || !input.narrationDuration) {
    throw new ClipValidationError(
      "NARRATION_DURATION_REQUIRED",
      "Generate narration before rendering video.",
    );
  }

  if (!Number.isFinite(input.startSeconds) || input.startSeconds < 0) {
    throw new ClipValidationError(
      "CLIP_START_OUT_OF_RANGE",
      "Choose a valid source video start position.",
    );
  }

  const sourceDuration = input.sourceDuration;
  const clipDuration = input.narrationDuration;
  const clipStart = input.startSeconds;
  const clipEnd = clipStart + clipDuration;

  if (clipStart >= sourceDuration) {
    throw new ClipValidationError(
      "CLIP_START_OUT_OF_RANGE",
      "The selected start position is outside the source video.",
    );
  }

  if (clipEnd > sourceDuration) {
    throw new ClipValidationError(
      "SOURCE_VIDEO_TOO_SHORT",
      "The selected gameplay video ends before the narration finishes.",
    );
  }

  return { clipStart, clipDuration, clipEnd };
}
