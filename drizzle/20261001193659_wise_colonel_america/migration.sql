CREATE TABLE `pots` (
	`id` text PRIMARY KEY,
	`wallet_fingerprint` text NOT NULL UNIQUE,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL
);
