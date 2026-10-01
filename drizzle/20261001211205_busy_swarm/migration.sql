CREATE TABLE `group_settlements` (
	`group_id` text PRIMARY KEY,
	`snapshot` text NOT NULL,
	CONSTRAINT `fk_group_settlements_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `participant_payments` (
	`participant_id` text PRIMARY KEY,
	`access_token_hash` text NOT NULL UNIQUE,
	`ark_address` text,
	CONSTRAINT `fk_participant_payments_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE
);
