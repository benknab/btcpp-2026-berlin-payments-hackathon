# Event settlement

Each event has an owner-controlled mainnet wallet in the owner's browser. A server-side Barkd receiver delivers
Lightning contributions to it while the owner is offline. Only the browser wallet executes payouts.

## Local receiver

After [installing Bark](README.md), follow [the app setup](../../README.md#run-locally).
`pnpm dev` starts or reuses Barkd on `127.0.0.1:3042`. Wallet data is stored outside the repository at
`~/.local/share/bark-event-receiver-mainnet`; override this with `BARK_RECEIVER_DATADIR`.
Use `BARK_BIN` and `BARKD_BIN` to override executable paths.

The receiver stays running after the app stops so pending payments can finish delivery.
Keep the computer awake and online. To stop it after pending receipts finish, find its process with
`lsof -nP -iTCP:3042 -sTCP:LISTEN`, then run `kill -TERM <PID>`.

For an independently managed receiver, set both `BARK_RECEIVER_URL` and `BARK_RECEIVER_TOKEN` in `.env`.
Automatic startup is then skipped, but mainnet readiness is still checked. Bind Barkd to loopback or a restricted
private network; never expose its token or use a `VITE_` variable for credentials.
See [Second's mainnet guide](https://second.tech/docs/getting-started/bark-cli/mainnet) for wallet creation and funding.
Do not run Bark CLI wallet commands while Barkd is using the same wallet database.

## Demo presets

Select the floating **Demo** button at the bottom right, then choose a preset to create and open a populated event:

| Preset         | Expenses                                                | Total    |
| -------------- | ------------------------------------------------------- | -------- |
| Coffee         | Ben pays for coffee                                     | 200 sats |
| Dinner         | Ben pays for dinner; Dingo pays for drinks              | 300 sats |
| Berlin weekend | Vini, Ben, Dingo, and MintMonkey each record an expense | 500 sats |

The three presets total **1,000 sats combined**, split equally between all four people. Vini is the owner.
Every preset includes the supplied receiving destinations: Ben (`bk@breez.tips`), Dingo (`denimdingo16@primal.net`),
MintMonkey (`mintmonkey6303@breez.tips`), and Vini's BOLT12 offer. Coffee has one creditor, Dinner has two, and Berlin
weekend pays Vini's BOLT12 destination.

The menu's **Saved events** commands reopen each preset's most recent event or copy its invitation link. Links and
wallets persist in this browser; shared links let other browsers select a participant. Creating a preset again creates
a fresh event and dedicated browser wallet, without resetting earlier events or wallets. Failed setup retries reuse
the pending wallet and idempotent server request. Opening a saved event never resets its expenses or settlement state;
an event removed by a database reset is reported unavailable, not recreated.

Setup only records expenses and receiving destinations: it does **not** lock settlement, create invoices, simulate
payments, or send sats. Start settlement and fund contributions manually. Mainnet payment fees and the owner's fee
reserve are separate from the preset expense totals. Keep wallet recovery phrases backed up as in the normal flow.

## Demo

Use localhost or HTTPS and small real amounts. For example, Alice pays a 2,000-sat expense split equally with Bob:
Bob owes Alice 1,000 sats. Lightning-address/LNURL services must accept the exact payout amount and support browser CORS.

1. Create the event with the owner's receiving destination. Save its **Recovery phrase** under
   **View settlement → Event wallet · mainnet**.
2. Share the invitation. Each participant selects their name and saves their receiving destination.
3. Record expenses, then select **Start settlement** under **View settlement** to lock net amounts.
4. Bob selects his share and pays the Lightning invoice. Anyone can pay it; choosing a name does not identify the payer.
   The owner can close their browser while the receiver delivers the contribution.
5. Reopen the event, select **Refresh contributions**, then **Sync wallet**. Paid but undelivered receipts do not count
   as funding.
6. In **Owner fee reserve**, select **Estimate fees / deposit**, pay any required invoice, and select it again to
   reconcile delivery and recheck fees. This deposit is separate from expense contributions.
7. Select **Pay creditors / reconcile**. Payouts are sequential; retrying reconciles existing attempts before new sends.
8. After settlement, use **Withdraw max** for the remainder. Use **Reconcile withdrawal** for an interrupted withdrawal.

Supported destinations are Lightning addresses/LNURL-pay, Ark addresses on Second's mainnet server, and compatible
BOLT12 offers. Participants can update their destination until their payout starts.

## Recovery and trust

- Wallet keys and state are stored unencrypted in localStorage and IndexedDB. Do not clear site data or change the
  app's origin (including its port) without a recovery plan. Server backups do not include browser wallets.
- To recover in another browser, open the same invitation, select your name, open **View settlement**, then select
  **I'm the owner** and enter the event wallet's recovery phrase. If owner access remains but the wallet is missing,
  use **Recovery phrase** to open the restore form. The phrase is not sent to the backend.
- Recovery requires the Ark server's cooperation. It restores spendable Ark funds, not payment history or in-progress
  exits. Complete wallet-data backup/import is not implemented.
- Owner access recovery is self-declared: anyone with the invitation can claim app owner permissions and invalidate
  earlier owner cookies. Spending the original wallet still requires its keys. Recovery does not verify that the
  phrase belongs to the event's address.
- Participants trust the owner with the pot and the backend to deliver contributions. The browser wallet trusts
  app-served JavaScript. Ark and BOLT12 payout reconciliation relies on owner-reported wallet history; Lightning
  payouts require a matching preimage.

## Limits

Reconcile uncertain payouts rather than resending them. Recovery without payment history is not evidence that a
payment failed. Excess contributions block completion; automatic refunds are not implemented. Keep the receiver
and wallet data available for late payments, and monitor Bark wallet expiry/refresh requirements.
Local tests do not establish live mainnet payment reliability; verify recipient receipts during a funded rehearsal.
Use small amounts with trusted participants.
