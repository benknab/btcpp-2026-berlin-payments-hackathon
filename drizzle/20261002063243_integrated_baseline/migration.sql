CREATE TABLE `event_invoices` (
	`payment_hash` text PRIMARY KEY,
	`group_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`invoice` text NOT NULL,
	`amount_sats` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`delivered_sats` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_event_invoices_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_event_invoices_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_payouts` (
	`payment_hash` text PRIMARY KEY,
	`group_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`invoice` text NOT NULL,
	`amount_sats` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	CONSTRAINT `fk_event_payouts_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_event_payouts_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_settlements` (
	`group_id` text PRIMARY KEY,
	`members` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_event_settlements_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
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
CREATE TABLE `group_settlements` (
	`group_id` text PRIMARY KEY,
	`snapshot` text NOT NULL,
	`wallet_fingerprint` text UNIQUE,
	CONSTRAINT `fk_group_settlements_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`ark_address` text,
	`invite_token_hash` text NOT NULL UNIQUE,
	`organizer_token_hash` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "groups_status" CHECK("status" IN ('open', 'settling', 'settled'))
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participant_payments` (
	`participant_id` text PRIMARY KEY,
	`access_token_hash` text NOT NULL UNIQUE,
	`ark_address` text,
	CONSTRAINT `fk_participant_payments_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`lnurl` text,
	`position` integer NOT NULL,
	CONSTRAINT `fk_participants_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `pots` (
	`id` text PRIMARY KEY,
	`wallet_fingerprint` text NOT NULL UNIQUE,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL
);
--> statement-breakpoint
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
CREATE INDEX `event_invoice_group` ON `event_invoices` ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX `event_active_payout` ON `event_payouts` ("group_id","participant_id") WHERE "status" <> 'expired';--> statement-breakpoint
CREATE UNIQUE INDEX `expense_participant_share` ON `expense_shares` ("expense_id","participant_id");--> statement-breakpoint
CREATE INDEX `expenses_group` ON `expenses` ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX `participant_group_name` ON `participants` ("group_id","name_key");--> statement-breakpoint
CREATE INDEX `settlement_debts_pot_idx` ON `settlement_debts` ("pot_id");--> statement-breakpoint
CREATE INDEX `settlement_users_pot_idx` ON `settlement_users` ("pot_id");