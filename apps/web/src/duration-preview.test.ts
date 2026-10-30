import { describe, expect, it } from "vitest";
import { getDurationPreview } from "./duration-preview";

describe("duration preview", () => {
  it("compares the estimate with remaining video, not the total length", () => {
    const preview = getDurationPreview("word ".repeat(30), "00:55", 60);
    expect(preview.remainingSeconds).toBe(5);
    expect(preview.minSeconds).toBeCloseTo(9.47);
    expect(preview.maxSeconds).toBeCloseTo(12.86);
    expect(preview.mayExceedVideo).toBe(true);
    expect(preview.mayExceedEntireVideo).toBe(false);
  });

  it("identifies a script unlikely to fit even from the beginning", () => {
    expect(getDurationPreview("word ".repeat(100), "00:00", 10)).toMatchObject({
      mayExceedVideo: true,
      mayExceedEntireVideo: true,
    });
  });

  it("flags starts at or after the end of the source", () => {
    for (const timestamp of ["00:10", "00:11"]) {
      expect(getDurationPreview("Hello", timestamp, 10)).toMatchObject({
        remainingSeconds: null,
        startError: expect.any(String),
      });
    }
  });

  it("does not invent a duration for blank, invalid or unknown inputs", () => {
    expect(getDurationPreview(" \n ", "", 10)).toMatchObject({
      wordCount: 0,
      maxSeconds: 0,
      remainingSeconds: null,
    });
    expect(getDurationPreview("Hello", "00:99", 10).startError).toBeTruthy();
    expect(getDurationPreview("Hello", "00:00", null)).toMatchObject({
      remainingSeconds: null,
      mayExceedVideo: false,
    });
  });
});
