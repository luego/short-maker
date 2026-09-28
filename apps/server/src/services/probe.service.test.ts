import { describe, expect, it } from "vitest";
import {
  parseDuration,
  parseProbeOutput,
  ProbeService,
} from "./probe.service.js";

describe("probe service", () => {
  it("extracts audio or video duration", () => {
    expect(parseDuration({ format: { duration: "3.75" } })).toBe(3.75);
  });

  it("rejects missing or invalid duration", () => {
    expect(() => parseDuration({ format: { duration: "0" } })).toThrow(
      "ffprobe returned incomplete duration metadata.",
    );
    expect(() => parseDuration({})).toThrow(
      "ffprobe returned incomplete duration metadata.",
    );
  });

  it("extracts duration and video dimensions", () => {
    expect(
      parseProbeOutput({
        format: { duration: "15.25" },
        streams: [
          { codec_type: "audio" },
          {
            codec_type: "video",
            width: 1920,
            height: 1080,
            avg_frame_rate: "30000/1001",
          },
        ],
      }),
    ).toEqual({
      duration: 15.25,
      width: 1920,
      height: 1080,
      fps: 30000 / 1001,
    });
  });

  it("passes the file path as an argument without a shell", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const service = new ProbeService("ffprobe", async (command, args) => {
      calls.push({ command, args });
      return JSON.stringify({
        format: { duration: "1" },
        streams: [
          {
            codec_type: "video",
            width: 640,
            height: 480,
            avg_frame_rate: "30/1",
          },
        ],
      });
    });

    await service.probe("/tmp/video;rm -rf safe.mp4");

    expect(calls[0]?.command).toBe("ffprobe");
    expect(calls[0]?.args.at(-1)).toBe("/tmp/video;rm -rf safe.mp4");
  });

  it("probes duration without requiring a video stream", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const service = new ProbeService("ffprobe", async (command, args) => {
      calls.push({ command, args });
      return JSON.stringify({ format: { duration: "2.5" } });
    });

    await expect(service.probeDuration("/tmp/narration.wav")).resolves.toBe(
      2.5,
    );

    expect(calls[0]?.command).toBe("ffprobe");
    expect(calls[0]?.args).toContain("-show_format");
    expect(calls[0]?.args).not.toContain("-show_streams");
    expect(calls[0]?.args.at(-1)).toBe("/tmp/narration.wav");
  });
});
