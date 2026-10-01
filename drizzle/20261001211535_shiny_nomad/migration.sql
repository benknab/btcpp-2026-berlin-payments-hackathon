ALTER TABLE `group_settlements` ADD `wallet_fingerprint` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_group_settlements` (
	`group_id` text PRIMARY KEY,
	`snapshot` text NOT NULL,
	`wallet_fingerprint` text UNIQUE,
	CONSTRAINT `fk_group_settlements_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_group_settlements`(`group_id`, `snapshot`) SELECT `group_id`, `snapshot` FROM `group_settlements`;--> statement-breakpoint
DROP TABLE `group_settlements`;--> statement-breakpoint
ALTER TABLE `__new_group_settlements` RENAME TO `group_settlements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;