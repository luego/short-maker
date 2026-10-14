import { afterEach, expect, it, vi } from "vitest";
import { apiRequest } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("preserves the server's useful error message", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Video is too large." } }),
          { status: 413 },
        ),
      ),
  );
  await expect(apiRequest("/api/projects", "Upload failed.")).rejects.toThrow(
    "Video is too large.",
  );
});

it("uses a readable fallback when the server returns HTML instead of JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<html>Unavailable</html>", { status: 503 }),
      ),
  );
  await expect(
    apiRequest("/api/projects", "Unable to load projects."),
  ).rejects.toThrow("Unable to load projects.");
});

it("keeps upload headers unset so the browser can supply the multipart boundary", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"project"}'));
  vi.stubGlobal("fetch", fetchMock);
  const body = new FormData();
  body.append("video", new Blob(["video"]), "source.mp4");
  await expect(
    apiRequest("/api/projects/project/source-video", "Upload failed.", {
      method: "POST",
      body,
    }),
  ).resolves.toEqual({ id: "project" });
  expect(fetchMock).toHaveBeenCalledWith("/api/projects/project/source-video", {
    method: "POST",
    body,
  });
});
