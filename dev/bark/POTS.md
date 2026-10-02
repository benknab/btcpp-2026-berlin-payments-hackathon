# Retired server-owned pot demo

The standalone `/settle` workspace, its server actions and wallet engine, test-address generation, and `pnpm pot:demo`
have been removed. Use [browser-owned event pots](BROWSER.md) instead: Barkd delivers Lightning receipts to the owner's
Ark address while the owner is offline; only the owner's browser wallet executes payouts.

The app no longer creates or spends from standalone server-owned pot wallets. Their historical database tables and
wallet directories remain intact for recovery; no migration or reset is needed for this removal. Do not fund their
old addresses or delete their wallet data. If recovering an old funded pot, preserve its complete wallet directory
and matching application database, check payment history, and use the previous implementation only in an isolated,
local environment. Never retry an uncertain historical payout without reconciling it first.
