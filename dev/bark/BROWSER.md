# Browser-owned event pots (signet)

The event organizer creates a wallet with `@secondts/bark/web`. Its public Ark address is stored in SQLite;
its mnemonic stays in localStorage and its wallet state stays in IndexedDB on the creating origin.

## Receiving daemon

Install Bark and Barkd 0.7.1 as described in [the signet guide](README.md). Create a dedicated receiving wallet:

```sh
export BARK_DATADIR="$HOME/.local/share/bark-event-receiver"
umask 077
bark create --signet --ark https://ark.signet.2nd.dev --esplora https://esplora.signet.2nd.dev
bark address
```

Use a new directory; do not overwrite an existing wallet. Fund it from the signet faucet if the Ark server
requires an anti-DoS balance. Then keep this daemon running, including while the organizer is offline:

```sh
barkd --datadir "$BARK_DATADIR" --host 127.0.0.1 --port 3032 --no-logfile
```

In the app terminal:

```sh
export BARK_RECEIVER_URL=http://127.0.0.1:3032
export BARK_RECEIVER_TOKEN="$(barkd --datadir "$HOME/.local/share/bark-event-receiver" secret show)"
pnpm db:migrate
pnpm dev
```

The URL and token are server-only environment variables. Never use `VITE_` for them. Restart the app after changing them.

## Demo

1. Open the app over localhost or HTTPS and create an event. Each event gets a separate browser wallet.
2. Record expenses. The organizer can save receiving addresses for creditors, including themselves.
3. Select **Lock settlement** to freeze net amounts and payout destinations. Expenses and addresses become read-only.
4. Select **Pay Bob's share**. The backend creates a signet Lightning invoice targeting the event's Ark address.
   Anyone with the invitation may pay it; choosing Bob does not authenticate the payer.
5. Scan the QR code or copy the invoice. The owner can close their browser while Barkd handles payment and delivery.
6. Select **Refresh contributions** to reconcile receipts. Paid but undelivered receipts do not count as funded.
   Unexpired invoices are reused; expired attempts remain stored and are checked for late payments.
7. In the original browser, select **Sync wallet** to collect mailbox deliveries and inspect spendable sats.
8. Send a separate fee reserve to the displayed event Ark address. Contributions cover creditor entitlements;
   the organizer covers send fees. The browser estimates fees and checks spendable funds before sending.
9. Select **Pay creditors / reconcile**. The browser resolves each creditor's LNURL, checks the signet invoice's
   amount, expiry, and metadata hash, persists the attempt, and pays creditors sequentially.
10. The backend verifies each payment preimage and marks the event settled once all creditors are paid.
    Retrying reconciles an existing in-flight attempt without sending a second payment.

Lightning recipients must support signet. Ordinary mainnet Lightning addresses cannot receive signet payouts.
Do not clear the organizer's site data. Changing the app's origin (including port) changes which browser wallet storage it sees.

## Persistence

- `groups.ark_address`: public receiving address (nullable for pre-wallet events).
- `event_settlements`: immutable participant amounts and receiving destinations.
- `event_invoices`: every contribution invoice, payment hash, expiry, status, and delivered amount.
- `event_payouts`: creditor invoices and prepared/sending/paid/expired attempt states, with one active attempt per creditor.

The UI refreshes payment status on request. Barkd processes and delivers receipts independently of the UI.
Browser-storage encryption and complete wallet backup/import are still outstanding; use signet only.

## Verification and remaining limits

Manually verified in Chromium on signet: event wallet creation and SQLite address persistence, wallet reopen/sync,
expense locking, a 5,000-sat Lightning contribution delivered while the original browser origin was closed,
and a 5,000-sat browser Lightning payout followed by proof verification and settled status. The payout check used
a prepared BOLT11 invoice from the local signet daemon; automatic LNURL resolution still needs a compatible
signet service with browser CORS support for a complete UI-only demo.

An interrupted attempt that never reached Bark remains `sending` and requires manual investigation. The app does
not automatically replace uncertain payments. Excess contributions block completion; automated refunds are not yet
implemented. Unused fee reserves stay in the owner's wallet. Keep the receiving daemon and wallet data available
to reconcile late payments.

Reconciliation reopens a settled event when it discovers a late delivery. Displayed balances include delivered
contributions and proven payouts, so a completed event shows zero remaining obligations and an excess remains visible.
Browser sync and payout operations share a cross-tab wallet lock.
