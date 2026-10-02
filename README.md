# Splitbark

Kittysplit + [Bark](https://second.tech).

Shared expenses with Bitcoin settlement, built for the
[bitcoin++ Berlin 2026 payments hackathon](https://btcpp.dev/berlin26/hackathon).

Splitbark is a shared-expense app built for trips, dinners, and events. Create an event, invite friends, and track
who paid and who owes what, with equal, exact, weighted, or percentage splits.

When it's time to settle, participants pay into a shared pot over Lightning. The event owner manages a
browser-based Bark wallet and pays recipients through Lightning addresses, Ark addresses, or BOLT12 offers.

Wallet keys stay in the owner's browser. Bark's receive-for-address flow lets contributions arrive even while
that browser is closed, and a recovery phrase can restore spendable Ark funds in another browser.

## How it works

1. **Create an event.** The owner gets a Bark wallet in their browser. Save its recovery phrase to restore funds later.
   Invite participants and have them choose their receiving destinations.
2. **Add expenses.** Record who paid and split costs equally, by exact amounts, by weights, or by percentages.
3. **Settle up.** Start settlement to lock the balances. Participants who owe money pay the owner via Lightning
   invoices. A server-side Barkd receiver uses Bark's receive-for-address flow to deliver contributions to the
   owner's event wallet, even while the owner's browser is closed.
4. **Pay participants.** The owner reopens the event, syncs their Bark wallet, funds any required payment fees,
   and sends payouts from their browser to Lightning addresses, LNURL-pay, BOLT12 offers, or mainnet Ark addresses.

The recovery phrase restores spendable Ark funds, not payment history or in-progress exits; it is not a complete
wallet-data backup. See [wallet recovery and trust boundaries](dev/bark/BROWSER.md#recovery-and-trust).

Created and joined events appear under **Your events** on the home page. This browser stores only their invitation
IDs in local storage; event names are fetched from the server. Clearing browser storage clears this list.

## Safety

**Mainnet hackathon prototype: use small amounts with trusted participants.** The owner holds the pot; wallet keys
are stored unencrypted in their browser. Keep invitation links private, save the recovery phrase, and reconcile
uncertain payments before retrying.
