ALTER TABLE `sites` ADD `introduction` text;--> statement-breakpoint
ALTER TABLE `sites` ADD `location` text;--> statement-breakpoint
ALTER TABLE `sites` ADD `profile_image_url` text;--> statement-breakpoint
ALTER TABLE `sites` ADD `profile_links` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `contact_label` text;--> statement-breakpoint
ALTER TABLE `sites` ADD `contact_url` text;
