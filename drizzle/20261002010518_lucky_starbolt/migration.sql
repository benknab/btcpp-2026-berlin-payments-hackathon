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
CREATE UNIQUE INDEX `event_active_payout` ON `event_payouts` ("group_id","participant_id") WHERE "status" <> 'expired';