import { z } from "zod";

export const appName = "Short Maker";

export const projectIdSchema = z.uuid();

export function parseTimestampToSeconds(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a start time.");
  }

  const parts = trimmed.split(":");
  if (parts.length !== 2 && parts.length !== 3) {
    throw new Error("Use MM:SS or HH:MM:SS.");
  }

  if (!parts.every((part) => /^\d{2}$/.test(part))) {
    throw new Error("Use MM:SS or HH:MM:SS.");
  }

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] =
    numbers.length === 2
      ? [0, numbers[0] as number, numbers[1] as number]
      : (numbers as [number, number, number]);

  if (minutes > 59) {
    throw new Error("Minutes must be between 00 and 59.");
  }

  if (seconds > 59) {
    throw new Error("Seconds must be between 00 and 59.");
  }

  return hours * 3600 + minutes * 60 + seconds;
}

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  templateId: z.string().trim().min(1).max(100).default("roblox-rant"),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createRenderSchema = z.object({
  projectId: projectIdSchema,
  script: z.string().trim().min(1).max(5000),
  startSeconds: z.number().finite().min(0),
  voiceId: z.string().trim().min(1).max(100),
  templateId: z.string().trim().min(1).max(100),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateRenderInput = z.infer<typeof createRenderSchema>;
