import { expect, it, vi } from "vitest";
import { ApiError } from "../lib/api-error.js";
import { RenderQueue } from "./render.queue.js";

it("runs one job at a time and ignores duplicate active submissions", async () => {
  let finish!: () => void;
  const first = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const render = vi
    .fn()
    .mockImplementationOnce(() => first)
    .mockResolvedValue(undefined);
  const queue = new RenderQueue({ render }, { markFailed: vi.fn() });
  queue.enqueue("first");
  queue.enqueue("first");
  queue.enqueue("second");
  expect(render.mock.calls).toEqual([["first"]]);
  finish();
  await vi.waitFor(() =>
    expect(render.mock.calls).toEqual([["first"], ["second"]]),
  );
});

it("persists a useful failure and continues with the next job", async () => {
  const render = vi
    .fn()
    .mockRejectedValueOnce(
      new ApiError(503, "TTS_UNAVAILABLE", "Configure audio.cpp."),
    )
    .mockResolvedValue(undefined);
  const markFailed = vi.fn().mockResolvedValue(undefined);
  const queue = new RenderQueue({ render }, { markFailed });
  queue.enqueue("failed");
  queue.enqueue("next");
  await vi.waitFor(() => expect(render).toHaveBeenCalledWith("next"));
  expect(markFailed).toHaveBeenCalledWith("failed", {
    errorCode: "TTS_UNAVAILABLE",
    errorMessage: "Configure audio.cpp.",
  });
});
