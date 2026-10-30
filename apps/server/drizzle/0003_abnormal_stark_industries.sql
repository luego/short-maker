ALTER TABLE `render_jobs` ADD `voice_speed` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `render_jobs` ADD `caption_settings` text DEFAULT '{}' NOT NULL;