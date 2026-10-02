CREATE TABLE `settlement_debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pot_id` integer NOT NULL,
	`from_user_id` integer NOT NULL,
	`to_user_id` integer NOT NULL,
	`amount_sat` integer NOT NULL,
	CONSTRAINT `fk_settlement_debts_pot_id_settlement_pots_id_fk` FOREIGN KEY (`pot_id`) REFERENCES `settlement_pots`(`id`),
	CONSTRAINT `fk_settlement_debts_from_user_id_settlement_users_id_fk` FOREIGN KEY (`from_user_id`) REFERENCES `settlement_users`(`id`),
	CONSTRAINT `fk_settlement_debts_to_user_id_settlement_users_id_fk` FOREIGN KEY (`to_user_id`) REFERENCES `settlement_users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `settlement_pots` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`locked` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settlement_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pot_id` integer NOT NULL,
	`name` text NOT NULL,
	`ark_address` text NOT NULL,
	CONSTRAINT `fk_settlement_users_pot_id_settlement_pots_id_fk` FOREIGN KEY (`pot_id`) REFERENCES `settlement_pots`(`id`)
);
--> statement-breakpoint
CREATE INDEX `settlement_debts_pot_idx` ON `settlement_debts` (`pot_id`);--> statement-breakpoint
CREATE INDEX `settlement_users_pot_idx` ON `settlement_users` (`pot_id`);