# Browser-owned event pots (mainnet)

The event organizer creates a wallet with `@secondts/bark/web`. Its public Ark address is stored in SQLite;
its mnemonic stays in localStorage and its wallet state stays in IndexedDB on the creating origin.

## Receiving daemon

Install Bark and Barkd 0.7.1 as described in [the wallet guide](README.md), then run:

```sh
pnpm db:migrate
pnpm dev
```

`pnpm dev` creates a fresh mainnet receiving wallet if needed, starts Barkd on `127.0.0.1:3042`, waits for its
authenticated mainnet health check, and supplies its token to Vite server-side. An existing healthy receiver is reused.
Its default wallet directory is `~/.local/share/bark-event-receiver-mainnet`; override it with `BARK_RECEIVER_DATADIR`.
The daemon log is `dev-barkd.log` inside that directory. `BARK_BIN` and `BARKD_BIN` can override executable paths.

Barkd deliberately keeps running after Vite stops or the owner's browser closes, so pending Lightning receipts can
still be delivered to the event's Ark address. The computer must remain awake and online. Restart `pnpm dev` to
reconnect; it does not start a second healthy receiver. To stop it explicitly, find the listener with
`lsof -nP -iTCP:3042 -sTCP:LISTEN` and run `kill -TERM <PID>` after pending receipts have finished.

### Independently managed receiver

For a separately managed Barkd, create a dedicated receiving wallet:

```sh
export BARK_DATADIR="$HOME/.local/share/bark-event-receiver-mainnet"
umask 077
bark create --mainnet --ark https://ark.second.tech --esplora https://mempool.second.tech/api
bark address
```

Use a new directory; do not overwrite an existing wallet. If the server requires an anti-DoS balance,
fund it over Lightning using `bark ln invoice "1000 sats"` before starting Barkd. Keep this daemon running,
including while the organizer is offline:

```sh
barkd --datadir "$BARK_DATADIR" --host 127.0.0.1 --port 3042 --no-logfile
```

In the app terminal:

```sh
export DATABASE_URL=file:mainnet.db
export BARK_RECEIVER_URL=http://127.0.0.1:3042
export BARK_RECEIVER_TOKEN="$(barkd --datadir "$HOME/.local/share/bark-event-receiver-mainnet" secret show)"
pnpm db:migrate
pnpm dev
```

Set both `BARK_RECEIVER_URL` and `BARK_RECEIVER_TOKEN` to use an independently managed receiver; automatic local startup
is then skipped, but mainnet readiness is still checked. The URL and token are server-only environment variables.
Never use `VITE_` for them. `pnpm dev` loads `.env`; restart the app after changing these settings.

## Demo

For a three-person, two-payout demo, create Alice (owner), Bob, and Charlie. Add **Lunch: 1,500 sats paid by Alice**
and **Coffee and snacks: 1,500 sats paid by Bob**, each split equally between all three. Alice and Bob each receive
500 sats; Charlie contributes 1,000 sats. Alice provides her destination at creation; Bob and Charlie open the invite,
select their own name, and save their destination before continuing. The LNURL services must accept
500-sat payments and support browser CORS. Net settlement does not require creditors to contribute too.

The owner must return in the browser profile and origin that created the event: the invitation link alone does not
transfer the organizer cookie or the browser-owned wallet.

1. Run `pnpm db:migrate` for the additive invoice-purpose migration (no reset). Open the app over localhost or HTTPS
   and create a new event with the owner's receiving destination. Each event gets a separate mainnet browser wallet.
2. For a small LNURL test, have Alice pay a 2,000-sat expense split equally with Bob: Bob owes Alice 1,000 sats.
   Save Alice's mainnet Lightning address or LNURL. The service must allow the exact 1,000-sat payout and browser CORS.
3. Invitees select their name and save their own receiving address. Select **Start settlement** to freeze net amounts.
   Each person can still edit their own destination until their payout starts; the owner's destination requires
   organizer access. Saving a replacement expires any prepared, unsent payout;
   sending or paid payouts retain their receiving address.
4. Select **Pay Bob's share**. The backend creates a mainnet Lightning invoice targeting the event's Ark address.
   Anyone with the invitation may pay it; choosing Bob does not authenticate the payer.
5. Scan the QR code or copy the invoice. The owner can close their browser while Barkd handles payment and delivery.
6. Select **Refresh contributions** to reconcile receipts. Paid but undelivered receipts do not count as funded.
   Unexpired invoices are reused; expired attempts remain stored and are checked for late payments.
7. In the original browser, select **Sync wallet** to collect mailbox deliveries and inspect spendable sats.
8. In **Owner fee reserve**, select **Estimate fees / deposit**. Pay the generated QR/invoice, then select the same
   button again to reconcile delivery and recheck fees. Barkd delivers the deposit even while the browser is closed.
   Pending reserve invoices survive reloads and are reused. They do not credit anyone's expense contribution and
   do not trigger excess-contribution handling. The owner's net debt, if any, still needs its own contribution.
   The browser requires delivered reserve receipts covering the remaining estimated fees, then checks actual
   spendable funds again before sending. Once contributions are delivered, the reserve estimate also includes
   any wallet shortfall. Manual **Top-up amount (sats)** invoices use the same reserve ledger. Direct Ark transfers
   and historical untracked top-ups increase wallet funds but cannot establish an owner deposit receipt.
   Zero-fee payouts need no reserve; very small invoices may be below receiving-service minimums.
9. Select **Pay creditors / reconcile**. The browser resolves each creditor's LNURL, checks the mainnet invoice's
   network, amount, and expiry, persists the attempt, and pays creditors sequentially.
10. The backend verifies each payment preimage and marks the event settled once all creditors are paid.
    Retrying reconciles an existing in-flight attempt without sending a second payment.
11. In **Event wallet · mainnet**, set **Owner wallet**, then select **Withdraw max**. The organizer's receiving
    address is prefilled; Lightning addresses/LNURLs, BOLT12 offers, and mainnet Ark addresses are supported.
    The browser syncs and computes the maximum spendable amount after the current send fee. Settlement must be
    complete, with no unresolved or excess contributions. Receiver limits still apply.
    An interrupted withdrawal is persisted in this browser; **Reconcile withdrawal** checks that attempt instead
    of sending again. A matching terminal failed wallet movement with no pending Lightning checkpoints releases
    the attempt and restores **Withdraw max**. A BOLT12 request proven not to have started is also released for
    an explicit retry. Withdrawal state stays synchronized across tabs.

Lightning invoices must begin with `lnbc`; Ark destinations must begin with `ark1` on Second's mainnet server.
LNURL-pay follows the current [LUD-06](https://github.com/lnurl/luds/blob/luds/06.md): the invoice must match the
requested amount, but its description hash need not match the service's metadata. The former hash-binding requirement
was removed from the specification; requiring it blocked Primal's otherwise valid 333-sat invoice. Invoices are obtained
from the receiving service over HTTPS; amount, mainnet network, and expiry are checked before preparing a payment,
and Bark verifies the invoice signature when paying. Invalid service responses or invoices show specific fixed errors
without exposing response bodies, invoices, or secrets. Retrying invoice preparation does not bypass payout reconciliation.
Signet invoices and addresses are rejected. Existing signet events are not converted: `mainnet.db`,
`bark:mainnet:event-wallet:<uuid>` localStorage keys, and `bark-mainnet-event-<uuid>` IndexedDB databases are separate.
Do not clear the organizer's site data. Changing the app's origin (including port) changes which browser wallet storage it sees.

## Persistence

- `groups.ark_address`: public receiving address (nullable for pre-wallet events).
- `event_settlements`: immutable participant amounts; receiving destinations remain editable until payout starts.
- `event_invoices`: contribution and owner fee-reserve invoices, distinguished by `purpose`, with payment hash,
  expiry, status, and delivered amount. Reserves never count toward participant obligations or excess contributions.
- `event_payouts`: creditor invoices and prepared/sending/paid/expired attempt states, with one active attempt per creditor.
- `bark:mainnet:wallet-withdrawal:<ark-address>`: localStorage journal of the latest leftover withdrawal, persisted
  before sending and retained across reloads. Wallet history remains the source of truth for completed transfers.

The UI refreshes payment status on request. Barkd processes and delivers receipts independently of the UI.
Browser-storage encryption and complete wallet backup/import are still outstanding; keep this test to small amounts.

## Verification and remaining limits

Manually verified in Chromium on signet: event wallet creation and SQLite address persistence, wallet reopen/sync,
expense locking, a 5,000-sat Lightning contribution delivered while the original browser origin was closed,
and a 5,000-sat browser Lightning payout followed by proof verification and settled status. The payout check used
a prepared BOLT11 invoice from the local signet daemon. This is historical verification, not a verified mainnet payout.
Automatic LNURL resolution on mainnet still needs a funded rehearsal with a service supporting browser CORS.

An interrupted attempt that never reached Bark remains `sending` and requires manual investigation. The app does
not automatically replace uncertain payments. Excess contributions block completion; automated refunds are not yet
implemented. Unused fee reserves can be withdrawn after settlement. Keep the receiving daemon and wallet data available
to reconcile late payments.

Reconciliation reopens a settled event when it discovers a late contribution delivery, not a late reserve delivery.
In-flight payouts reconcile before new payouts are gated on deposits or balance. Displayed balances include delivered
contributions and proven payouts, so a completed event shows zero remaining obligations and an excess remains visible.
Browser sync and payout operations share a cross-tab wallet lock.
