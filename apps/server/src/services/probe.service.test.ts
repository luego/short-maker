import { describe, expect, it } from "vitest";
import { parseProbeOutput, ProbeService } from "./probe.service.js";

describe("probe service", () => {
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
});
