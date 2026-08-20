CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`device_name` text,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`content_object_id` text,
	`storage_key` text NOT NULL,
	`original_filename` text,
	`mime_type` text,
	`width` integer,
	`height` integer,
	`variants` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_object_id`) REFERENCES `content_objects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_site_idx` ON `assets` (`site_id`);--> statement-breakpoint
CREATE TABLE `content_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`type` text NOT NULL,
	`slug` text NOT NULL,
	`title` text,
	`body` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_url` text,
	`metadata` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_objects_site_slug_idx` ON `content_objects` (`site_id`,`slug`);--> statement-breakpoint
CREATE INDEX `content_objects_site_type_published_idx` ON `content_objects` (`site_id`,`type`,`published_at`);--> statement-breakpoint
CREATE TABLE `magic_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `magic_tokens_token_hash_unique` ON `magic_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`subdomain` text NOT NULL,
	`custom_domain` text,
	`title` text NOT NULL,
	`tagline` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`theme` text DEFAULT 'classic' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_owner_user_id_unique` ON `sites` (`owner_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sites_subdomain_unique` ON `sites` (`subdomain`);--> statement-breakpoint
CREATE UNIQUE INDEX `sites_custom_domain_unique` ON `sites` (`custom_domain`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);