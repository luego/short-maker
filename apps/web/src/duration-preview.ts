import { parseTimestampToSeconds } from "@short-maker/shared";

export function getDurationPreview(
  script: string,
  timestamp: string,
  sourceDuration?: number | null,
) {
  const wordCount = script.trim() ? script.trim().split(/\s+/u).length : 0;
  // Planning heuristic, not a measurement of the selected voice.
  const minSeconds = (wordCount / 190) * 60;
  const maxSeconds = (wordCount / 140) * 60;
  const videoSeconds =
    typeof sourceDuration === "number" &&
    Number.isFinite(sourceDuration) &&
    sourceDuration > 0
      ? sourceDuration
      : null;
  let startSeconds: number | null = null;
  let startError: string | null = null;
  if (timestamp.trim()) {
    try {
      startSeconds = parseTimestampToSeconds(timestamp);
      if (videoSeconds !== null && startSeconds >= videoSeconds) {
        startError = "Start time must be before the end of the source video.";
      }
    } catch (error) {
      startError =
        error instanceof Error ? error.message : "Invalid start time.";
    }
  }
  const remainingSeconds =
    videoSeconds !== null && startSeconds !== null && !startError
      ? videoSeconds - startSeconds
      : null;
  return {
    wordCount,
    minSeconds,
    maxSeconds,
    videoSeconds,
    startSeconds,
    startError,
    remainingSeconds,
    mayExceedVideo: remainingSeconds !== null && maxSeconds > remainingSeconds,
    mayExceedEntireVideo: videoSeconds !== null && minSeconds > videoSeconds,
  };
}
