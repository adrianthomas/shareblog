CREATE TABLE `ap_followers` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`actor_uri` text NOT NULL,
	`inbox_uri` text NOT NULL,
	`shared_inbox_uri` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ap_followers_site_actor_idx` ON `ap_followers` (`site_id`,`actor_uri`);--> statement-breakpoint
ALTER TABLE `sites` ADD `ap_keys` text;