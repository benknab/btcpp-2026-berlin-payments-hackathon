ALTER TABLE `event_payouts` ADD `method` text DEFAULT 'bolt11' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_payouts` ADD `history_start_id` integer;--> statement-breakpoint
ALTER TABLE `event_payouts` ADD `movement_id` integer;--> statement-breakpoint
ALTER TABLE `event_payouts` ADD `proof_payment_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `event_payout_movement` ON `event_payouts` ("group_id","movement_id");--> statement-breakpoint
CREATE UNIQUE INDEX `event_payout_proof` ON `event_payouts` ("proof_payment_hash");