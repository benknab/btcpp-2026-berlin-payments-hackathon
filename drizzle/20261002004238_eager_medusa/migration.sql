CREATE TABLE `event_settlements` (
	`group_id` text PRIMARY KEY,
	`members` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_event_settlements_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);
