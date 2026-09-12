CREATE TABLE `daily_visit_counts` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`day` text NOT NULL,
	`content_object_id` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_visit_counts_dimensions_idx` ON `daily_visit_counts` (`site_id`,`day`,`content_object_id`,`source`);--> statement-breakpoint
CREATE INDEX `daily_visit_counts_site_day_idx` ON `daily_visit_counts` (`site_id`,`day`);