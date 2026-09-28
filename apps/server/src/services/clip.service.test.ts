import { describe, expect, it } from "vitest";
import { calculateClipBounds, ClipValidationError } from "./clip.service.js";

function catchClipError(callback: () => void) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new Error("Expected callback to throw.");
}

describe("calculateClipBounds", () => {
  it("calculates clip start, duration, and end from narration duration", () => {
    expect(
      calculateClipBounds({
        sourceDuration: 30,
        startSeconds: 10,
        narrationDuration: 5.5,
      }),
    ).toEqual({ clipStart: 10, clipDuration: 5.5, clipEnd: 15.5 });
  });

  it("allows a clip that ends exactly at the source duration", () => {
    expect(
      calculateClipBounds({
        sourceDuration: 15,
        startSeconds: 10,
        narrationDuration: 5,
      }),
    ).toEqual({ clipStart: 10, clipDuration: 5, clipEnd: 15 });
  });

  it("requires source video duration", () => {
    expect(() =>
      calculateClipBounds({ startSeconds: 0, narrationDuration: 5 }),
    ).toThrow(ClipValidationError);
    expect(() =>
      calculateClipBounds({ startSeconds: 0, narrationDuration: 5 }),
    ).toThrow("Import a source video before rendering.");
  });

  it("requires narration duration", () => {
    expect(
      catchClipError(() =>
        calculateClipBounds({ sourceDuration: 30, startSeconds: 0 }),
      ),
    ).toMatchObject({ code: "NARRATION_DURATION_REQUIRED" });
  });

  it("rejects invalid clip starts", () => {
    expect(
      catchClipError(() =>
        calculateClipBounds({
          sourceDuration: 30,
          startSeconds: -1,
          narrationDuration: 5,
        }),
      ),
    ).toMatchObject({ code: "CLIP_START_OUT_OF_RANGE" });

    expect(
      catchClipError(() =>
        calculateClipBounds({
          sourceDuration: 30,
          startSeconds: 30,
          narrationDuration: 5,
        }),
      ),
    ).toMatchObject({ code: "CLIP_START_OUT_OF_RANGE" });
  });

  it("rejects clips that outlast the source video", () => {
    expect(
      catchClipError(() =>
        calculateClipBounds({
          sourceDuration: 30,
          startSeconds: 28,
          narrationDuration: 5,
        }),
      ),
    ).toMatchObject({ code: "SOURCE_VIDEO_TOO_SHORT" });
  });
});
