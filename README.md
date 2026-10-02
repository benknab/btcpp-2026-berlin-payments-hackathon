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

1. **Create an event.** The browser uses `@secondts/bark/web` to generate a recovery phrase with `generateMnemonic()`,
   create the owner's wallet with `Wallet.open()`, and get its Ark address with `newAddress()`. Keys stay in the
   browser. Save the recovery phrase, invite participants, and choose receiving destinations.
2. **Add expenses.** Record who paid and split costs equally, by exact amounts, by weights, or by percentages.
   Splitbark calculates everyone's balance; no payments happen yet.
3. **Collect contributions.** Start settlement to lock the balances. The server uses `@secondts/barkd`'s
   `LightningApi.generateInvoiceForAddress()` to create Lightning invoices targeting the owner's Ark address.
   Participants who owe money pay their invoices. Barkd delivers the funds even while the owner's browser is closed;
   `getReceiveStatus()` tracks delivery.
4. **Pay participants.** The owner reopens the event and calls `sync()` on their browser wallet. Splitbark estimates
   fees with `estimateLightningSendFee()` or `estimateArkoorPaymentFee()` and requests any required fee deposit.
   The wallet pays Lightning addresses/LNURL-pay via `payLightningInvoice()` after resolving an invoice,
   BOLT12 offers via `payLightningOffer()`, and Ark addresses via `sendArkoorPayment()`.

Created and joined events appear under **Your events** on the home page. This browser stores only their invitation
IDs in local storage; event names are fetched from the server. Clearing browser storage clears this list.

## Safety

**Mainnet hackathon prototype: use small amounts with trusted participants.** The owner holds the pot; wallet keys
are stored unencrypted in their browser. Keep invitation links private, save the recovery phrase, and reconcile
uncertain payments before retrying.
