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
CREATE INDEX `event_invoice_group` ON `event_invoices` (`group_id`);