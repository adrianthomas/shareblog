ALTER TABLE `sites` ADD `profile_name` text;--> statement-breakpoint
ALTER TABLE `sites` ADD `contact_links` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `sites` SET `profile_name` = `title` WHERE `profile_name` IS NULL;
