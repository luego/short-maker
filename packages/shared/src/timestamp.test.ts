import { describe, expect, it } from "vitest";
import { parseTimestampToSeconds } from "./index.js";

describe("parseTimestampToSeconds", () => {
  it("parses documented mm:ss examples", () => {
    expect(parseTimestampToSeconds("00:05")).toBe(5);
    expect(parseTimestampToSeconds("01:23")).toBe(83);
  });

  it("parses documented hh:mm:ss examples", () => {
    expect(parseTimestampToSeconds("00:12:43")).toBe(763);
    expect(parseTimestampToSeconds("01:02:03")).toBe(3723);
  });

  it("trims surrounding whitespace", () => {
    expect(parseTimestampToSeconds("  02:30  ")).toBe(150);
  });

  it("rejects empty or malformed timestamps", () => {
    expect(() => parseTimestampToSeconds("")).toThrow("Enter a start time");
    expect(() => parseTimestampToSeconds("abc")).toThrow(
      "Use MM:SS or HH:MM:SS",
    );
    expect(() => parseTimestampToSeconds("1:2:3:4")).toThrow(
      "Use MM:SS or HH:MM:SS",
    );
    expect(() => parseTimestampToSeconds("01::23")).toThrow(
      "Use MM:SS or HH:MM:SS",
    );
  });

  it("rejects minutes or seconds outside clock ranges", () => {
    expect(() => parseTimestampToSeconds("00:60")).toThrow(
      "Seconds must be between 00 and 59",
    );
    expect(() => parseTimestampToSeconds("60:00")).toThrow(
      "Minutes must be between 00 and 59",
    );
    expect(() => parseTimestampToSeconds("01:60:00")).toThrow(
      "Minutes must be between 00 and 59",
    );
  });

  it("rejects negative values and decimals", () => {
    expect(() => parseTimestampToSeconds("-01:00")).toThrow(
      "Use MM:SS or HH:MM:SS",
    );
    expect(() => parseTimestampToSeconds("01:02.5")).toThrow(
      "Use MM:SS or HH:MM:SS",
    );
  });
});
