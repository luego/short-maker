import { expect, it } from "vitest";
import { buildPreviewCaptions } from "./preview-captions";

it("preserves every word with bounded groups and continuous estimated timings", () => {
  const script = "¿En serio? Nadie me avisó de que esto iba a pasar.";
  const cues = buildPreviewCaptions(script, 1);
  expect(cues.map((cue) => cue.text).join(" ")).toBe(script);
  expect(cues[0]?.start).toBe(0);
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i]!;
    expect(cue.end).toBeGreaterThan(cue.start);
    expect(cue.text.split(" ").length).toBeLessThanOrEqual(4);
    if (i > 0) expect(cue.start).toBe(cues[i - 1]?.end);
  }
});

it("adjusts preview timing with speaking speed and handles blank scripts", () => {
  expect(buildPreviewCaptions(" \n ", 1)).toEqual([]);
  const normal = buildPreviewCaptions("A quick story for a short.", 1).at(
    -1,
  )!.end;
  const rant = buildPreviewCaptions("A quick story for a short.", 1.18).at(
    -1,
  )!.end;
  expect(rant).toBeCloseTo(normal / 1.18);
});
