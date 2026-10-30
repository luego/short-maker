import { expect, it } from "vitest";
import { createRenderSchema } from "./index.js";

const base = {
  projectId: "00000000-0000-4000-8000-000000000000",
  script: "Hello",
  startSeconds: 0,
  voiceId: "em_alex",
  templateId: "roblox-rant",
};

it.each([
  { voiceSpeed: 0 },
  { voiceSpeed: 10 },
  { voiceSpeed: Number.NaN },
  { captionSettings: { fontFamily: "../../font.ttf" } },
  { captionSettings: { fontSize: 500 } },
  { captionSettings: { color: "white,override" } },
  { captionSettings: { position: "arbitrary" } },
])("rejects unsafe or unsupported render styling: %j", (settings) => {
  expect(createRenderSchema.safeParse({ ...base, ...settings }).success).toBe(
    false,
  );
});
