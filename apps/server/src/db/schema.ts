import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
};

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sourceVideoPath: text("source_video_path"),
  sourceFilename: text("source_filename"),
  sourceDuration: real("source_duration"),
  sourceWidth: integer("source_width"),
  sourceHeight: integer("source_height"),
  sourceFps: real("source_fps"),
  templateId: text("template_id").notNull().default("roblox-rant"),
  ...timestamps,
});

export const renderJobs = sqliteTable("render_jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  script: text("script").notNull(),
  startSeconds: real("start_seconds").notNull(),
  narrationAudioPath: text("narration_audio_path"),
  narrationDuration: real("narration_duration"),
  voiceId: text("voice_id").notNull(),
  templateId: text("template_id").notNull(),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  outputPath: text("output_path"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  ...timestamps,
});
