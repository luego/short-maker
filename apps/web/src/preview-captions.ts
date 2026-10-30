export type PreviewCue = { text: string; start: number; end: number };

// Text-only timings for the silent editor. Export uses measured Whisper timings.
export function buildPreviewCaptions(
  script: string,
  speed: number,
): PreviewCue[] {
  const words = script.trim().split(/\s+/u).filter(Boolean);
  const cues: PreviewCue[] = [];
  const secondsPerWord = 60 / (165 * speed);
  let group: string[] = [];
  let elapsed = 0;
  const flush = () => {
    if (!group.length) return;
    const end = elapsed + group.length * secondsPerWord;
    cues.push({ text: group.join(" "), start: elapsed, end });
    elapsed = end;
    group = [];
  };
  for (const word of words) {
    if (group.length === 4 || [...group, word].join(" ").length > 32) flush();
    group.push(word);
    if (/[.!?]$/.test(word)) flush();
  }
  flush();
  return cues;
}

export function previewTime(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}
