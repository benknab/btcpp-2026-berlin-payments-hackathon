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

Install Bark and Barkd **0.7.1** using the [repository installation instructions](../../README.md#install-bark-and-barkd).
The TypeScript client is pinned to `@secondts/barkd@0.7.2`, which targets the daemon's 0.7.1 API.
Follow the [local signet wallet setup](README.md) for creation/funding using Second's signet guide.
The previously funded remote wallet is not included in a checkout; a fresh machine needs a newly funded wallet
or a coordinated migration of the complete wallet data.

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

Open **http://localhost:3100/settle** (also linked from the home page) for the pot list. Click **Start new pot** to
create a SQLite-backed pot and open `/settle/<id>`. Pots, users, and debt rows have auto-increment integer IDs.
The list marks pots **Unsettled** until Bark confirms all payouts, then **Settled**. Reopen any pot from the list.

For testing, the initial participants and each **Add participant** receive fresh `tark` payout addresses from the
shared developer signet wallet. Start its daemon on port 3031 using the command above; `BARK_FUNDING_DATADIR` and
`BARK_FUNDING_URL` select a different existing signet wallet. Address generation does not spend funds or create
personal wallets: **all default payouts return to the shared wallet**. The fields remain editable. If the daemon is
unavailable, enter personal signet addresses manually or start it and click **Retry address generation**.

Enter participants, distinct Bark signet payout addresses, and who owes whom in whole sats. The preview
nets reciprocal debts. Click **Save & lock debts** to persist the participant and debt rows atomically. This does
not connect to a wallet, start a daemon, or spend funds. Creating, listing, and reopening pots needs only SQLite.
Details cannot be changed once saved; start a new pot if they are wrong.

Click **Prepare deposits** when ready to fund the pot. The backend creates an exclusive signet wallet, runs its
authenticated daemon on a temporary loopback port, and retrieves its token internally. Install Barkd **0.7.1**
on the server (`barkd` on `PATH`, or optional `BARKD_BIN`). There is no `BARK_POT_TOKEN` or operator-code setup.
Wallets use Second's signet Ark and Esplora URLs from the [signet guide](https://second.tech/docs/getting-started/bark-cli/signet).
The daemon shuts down after each payment request; later requests reopen the same wallet data.

Wallets live under `~/.local/share/bark-settlement-pots/<database-namespace>/<pot-id>` by default. Optional
`BARK_POTS_DATADIR` overrides the root; keep it outside the repository. Preserve this directory and the app database
together. Never delete snapshots, reset the database, or move the wallet root to reuse a funded wallet.
The backend refuses to recreate a missing wallet for an existing payment snapshot. A wallet-directory lock rejects
concurrent payment requests. After a server crash, inspect wallet history and ensure its daemon is stopped before
manually removing only that pot's stale `<pot-id>.lock` directory. No automatic stale-lock recovery is performed.
Legacy CLI/demo snapshots in the original `pots` table remain untouched; the new list contains pots created through
this SQLite-backed workspace, not imported demo runs.

Run `pnpm db:migrate` and `pnpm dev` after updating. Bark credentials and database access stay server-only.
Send each debtor's required sats
to their displayed **pot deposit address**, then click **Check deposits / refresh**. Partial deposits are supported;
unrelated funds and another debtor's overpayment do not fill a missing contribution. If fees are needed, fund an
independent pot address as a reserve; that transfer does not count toward participant contributions.

The payout button stays disabled until every contribution is confirmed and the operator checks the address/amount
review box. The server independently rechecks funding; it never trusts browser amounts or editable destinations at
payout time. Click once to pay creditors, with receipt IDs shown as payouts are confirmed. No background payouts
or automatic polling occur. An interrupted payout requires a refresh, then **Reconcile / finish payouts** with the
same wallet/database; uncertain sends remain blocked for manual history investigation, never automatically resent.

Keep the app local. There is no application authentication or spending access code: anyone who can reach the app
can create a pot and trigger funded payouts. Do not expose this testing interface to an untrusted network.

## Boundaries

This is a **server-custodied hackathon prototype**, not trustless escrow or a production payment system. Keep each
pot wallet exclusive to this flow: no external sends, deletes, restores, or competing wallet copies. Payout history
matching assumes that exclusivity. Payouts are sequential, not an atomic batch. Excess deposits and leftover fee
reserves stay in the pot; refunds, fee allocation, per-user authentication, refresh scheduling, and emergency exits are not
implemented. Bark-confirmed Ark receipts are not new on-chain confirmations.

The UI uses unauthenticated POST TanStack Start server functions for local signet testing only.
Never expose daemon tokens or SDK implementations to the browser.
Keep Barkd authenticated and bound to loopback. **Never use this flow or the shared public seed for mainnet.**

## Verified live run

On 2026-10-01 in the remote development environment, the sample completed on Second's signet Ark with Alice's 5,000-sat and Dave's 4,000-sat receipts
confirmed, followed by confirmed 8,000-sat and 1,000-sat payouts. The pot reached `settled`; the source wallet
transferred 26,000 sats. Artifacts on that remote host: `~/.local/share/bark-pot-demos/run-2HToEM/`.
The source wallet's verified remaining spendable balance was 274,000 sats; this is a historical balance, not a live one.

Unit/integration tests run offline with `pnpm test` and cover debt validation, receipt attribution, underpayment,
overpayment, duplicate receipts, insufficient balance, wallet mismatch, stale writes, idempotent settlement,
lost-response reconciliation, and refusal to retry uncertain payouts.
