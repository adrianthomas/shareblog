CREATE TABLE `site_actor_keys` (
	`site_id` text PRIMARY KEY NOT NULL,
	`keys` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `sites` DROP COLUMN `ap_keys`;