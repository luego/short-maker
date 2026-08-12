import { z } from "zod";

export const appName = "Short Maker";

export const projectIdSchema = z.uuid();

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
