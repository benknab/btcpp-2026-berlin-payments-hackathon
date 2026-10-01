# Bark settlement pot (signet only)

`pnpm pot:demo` runs real Ark payments, not mocked payments. Only the expense/debt setup is simulated.
The input is [`pot.example.json`](pot.example.json). All amounts are **integer sats**, not BTC or fiat.

| Participant | Net payment into pot | Net payout from pot |
| ----------- | -------------------: | ------------------: |
| Alice       |                5,000 |                   0 |
| Bob         |                    0 |               8,000 |
| Carol       |                    0 |               1,000 |
| Dave        |                4,000 |                   0 |

The pot collects and pays out **9,000 sats**. Reciprocal debts are netted first, like Kittysplit.

## Run

Install Barkd **0.7.1** following [Second's install guide](https://second.tech/docs/barkd/install).
The TypeScript client is pinned to `@secondts/barkd@0.7.2`, which targets the daemon's 0.7.1 API.
Use the [signet guide](https://second.tech/docs/getting-started/bark-cli/signet) for wallet creation/funding.

Start the existing funded signet wallet in a separate terminal:

```sh
barkd --datadir "$HOME/.local/share/bark-hackathon-signet" --host 127.0.0.1 --port 3031 --no-logfile
```

Then, from this repository:

```sh
pnpm install --frozen-lockfile
pnpm pot:demo
```

`BARK_FUNDING_DATADIR` and `BARK_FUNDING_URL` override the source wallet directory and daemon URL.
The local CLI retrieves its token using `barkd secret show`; tokens and new mnemonics are never printed or committed.
Do not run the Bark CLI against a wallet database while its daemon is running.

Each invocation intentionally creates **fresh wallets and spends up to 26,000 signet sats** from the source:

- 12,000 sats each to Alice and Dave's personal test wallets.
- 2,000 sats to a separate pot address as a fee reserve, not credited to any participant.
- Alice and Dave send their exact net contributions to their assigned pot addresses.
- The backend confirms both receipts, then sends 8,000 sats to Bob and 1,000 sats to Carol.
- The demo also checks successful receipts in Bob and Carol's own wallet histories.

Wallets are created under `~/.local/share/bark-pot-demos/run-*`, with restricted permissions. The run directory is
printed before funding. It contains one wallet per participant, one pot wallet, `pots.db`, and a final `result.json`.
All participants' payout addresses and unique pot deposit addresses are printed **before any funding**.
Ports 3131–3135 must be free. Effect's scoped process service shuts down the new daemons when the demo finishes;
the funding daemon remains under your control. The SQLite database is migrated automatically for this isolated run.

The sample leaves 7,000 sats with Alice, 8,000 with Dave, and the 2,000-sat reserve with the pot (assuming no Ark fees).
Those are test funds, not lost funds: keep the wallet databases and mnemonics if you want to use them again.
**Do not rerun the demo to resume a failed run:** that starts a new pot and spends additional funds.

## Backend API and persistence

- `src/lib/pot.ts`: Effect Schemas and net debt calculation.
- `src/server/bark/sdk.ts`: typed Effect adapter for wallet creation, address generation, readiness, signet verification,
  balance, sync, history, and Ark sends. HTTP calls are cancellable and have a 30-second timeout.
- `src/server/pots/service.ts`: `createPot(input)`, `confirmPot(id)`, and `settlePot(id)` Effects.
- `src/server/pots/store.ts`: Drizzle/libSQL persistence, wallet isolation, and optimistic revision checks.

`createPot` takes an object like the fixture, with each user additionally supplying their **personal signet
`arkAddress`** for payouts. It assigns a fresh **pot-owned** deposit address per participant. Supply the `Bark` layer
for that pot's dedicated wallet and the `PotStoreLive` layer with a `Database` layer. One wallet is reserved for one
pot; wallet fingerprints cannot be reused in the same pot database.

`confirmPot` synchronizes Bark and reads successful incoming Ark movements addressed to each participant's deposit
address. It records receipt movement IDs and totals, supports partial deposits, and deduplicates movement IDs.
Unrelated transfers, the fee reserve, pending/failed receipts, and somebody else's overpayment do not satisfy a
participant's obligation. A deposit address identifies an obligation, **not the real-world identity of the sender**;
anyone may fund that obligation.

`settlePot` refuses to pay until every participant's own contribution is covered and enough spendable funds remain.
It records `sending` before each network call and records `paid` only after finding a successful outgoing Bark
movement for that recipient and exact amount. A settled pot is idempotent. Revision checks reject concurrent writers.
After a crash or lost response, call `settlePot` with the **same database and pot wallet** to reconcile a successful
attempt without sending twice. Pending, failed, or absent history stays blocked for manual investigation; there is
deliberately no automatic retry/reset of an uncertain monetary send.

## Final settlement UI

Open **http://localhost:5173/settle** (also linked from the home page). This is a final-step interface, not an
expense-tracking app: enter participants, personal Bark signet payout addresses, and who owes whom in whole sats.
The preview nets debts before creating the pot. Everyone supplies a distinct personal address, including debtors.

Before connecting:

1. Create a **dedicated signet wallet** following the [signet guide](https://second.tech/docs/getting-started/bark-cli/signet).
   Do not use the shared funding wallet as the pot wallet. Keep wallet data/recovery material outside the repository.
2. Start its authenticated daemon on loopback, e.g.:
   `barkd --datadir "$HOME/.local/share/bark-ui-pot" --host 127.0.0.1 --port 3135 --no-logfile`.
3. Obtain that daemon's token with `barkd --datadir "$HOME/.local/share/bark-ui-pot" secret show`. Set local `.env` values
   for `BARK_POT_URL=http://127.0.0.1:3135`, `BARK_POT_TOKEN`, and a **separate random** `POT_UI_ACCESS_CODE` of
   32–256 characters (e.g. generated with `openssl rand -hex 32`). Never commit these values or use a recovery phrase
   as the access code. Do not prefix them with `VITE_`.
4. Run `pnpm db:migrate` and `pnpm dev`. Restart the app after changing environment configuration.

Enter the operator access code to connect. The code stays in React memory, not browser storage; it is sent to
authorized POST server functions. Bark tokens and database access stay server-only. One daemon wallet supports one
saved pot in the configured database; reconnect after a browser reload to resume it, including completed pots.
To create another pot, configure a new dedicated wallet; never delete an existing snapshot to reuse a funded wallet.

After **Lock details & create pot**, debts and payout destinations are immutable. Send each debtor's required sats
to their displayed **pot deposit address**, then click **Check deposits / refresh**. Partial deposits are supported;
unrelated funds and another debtor's overpayment do not fill a missing contribution. If fees are needed, fund an
independent pot address as a reserve; that transfer does not count toward participant contributions.

The payout button stays disabled until every contribution is confirmed and the operator checks the address/amount
review box. The server independently rechecks funding; it never trusts browser amounts or editable destinations at
payout time. Click once to pay creditors, with receipt IDs shown as payouts are confirmed. No background payouts
or automatic polling occur. An interrupted payout requires a refresh, then **Reconcile / finish payouts** with the
same wallet/database; uncertain sends remain blocked for manual history investigation, never automatically resent.

Keep the app local or behind trusted access controls. Use HTTPS if accessing it over a network. The shared operator
code is a hackathon spending gate, not production user authentication, authorization roles, or rate limiting.

## Boundaries

This is a **server-custodied hackathon prototype**, not trustless escrow or a production payment system. Keep each
pot wallet exclusive to this flow: no external sends, deletes, restores, or competing wallet copies. Payout history
matching assumes that exclusivity. Payouts are sequential, not an atomic batch. Excess deposits and leftover fee
reserves stay in the pot; refunds, fee allocation, per-user authentication, refresh scheduling, and emergency exits are not
implemented. Bark-confirmed Ark receipts are not new on-chain confirmations.

The UI uses access-code-protected TanStack Start server functions; there are no unauthenticated spending endpoints.
Never expose daemon tokens or SDK implementations to the browser.
Keep Barkd authenticated and bound to loopback. **Never use this flow or the shared public seed for mainnet.**

## Verified live run

On 2026-10-01, the sample completed on Second's signet Ark with Alice's 5,000-sat and Dave's 4,000-sat receipts
confirmed, followed by confirmed 8,000-sat and 1,000-sat payouts. The pot reached `settled`; the source wallet
transferred 26,000 sats. Local artifacts: `~/.local/share/bark-pot-demos/run-2HToEM/`.
The source wallet's verified remaining spendable balance was 274,000 sats; this is a historical balance, not a live one.

Unit/integration tests run offline with `pnpm test` and cover debt validation, receipt attribution, underpayment,
overpayment, duplicate receipts, insufficient balance, wallet mismatch, stale writes, idempotent settlement,
lost-response reconciliation, and refusal to retry uncertain payouts.
