CREATE TABLE `expense_shares` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`expense_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`amount_sats` integer NOT NULL,
	CONSTRAINT `fk_expense_shares_expense_id_expenses_id_fk` FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expense_shares_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`),
	CONSTRAINT "share_nonnegative_amount" CHECK("amount_sats" >= 0 AND "amount_sats" <= 2100000000000000)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY,
	`group_id` text NOT NULL,
	`payer_id` text NOT NULL,
	`description` text NOT NULL,
	`amount_sats` integer NOT NULL,
	`date` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_expenses_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expenses_payer_id_participants_id_fk` FOREIGN KEY (`payer_id`) REFERENCES `participants`(`id`),
	CONSTRAINT "expense_positive_amount" CHECK("amount_sats" > 0 AND "amount_sats" <= 2100000000000000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_participant_share` ON `expense_shares` ("expense_id","participant_id");--> statement-breakpoint
CREATE INDEX `expenses_group` ON `expenses` ("group_id");