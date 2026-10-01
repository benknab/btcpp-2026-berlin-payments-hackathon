CREATE TABLE `groups` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`invite_token_hash` text NOT NULL UNIQUE,
	`organizer_token_hash` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "groups_status" CHECK("status" IN ('open', 'settling', 'settled'))
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `fk_participants_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participant_group_name` ON `participants` ("group_id","name_key");