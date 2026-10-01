# Implementation plan: Person A + Person B

## Agreed V1: settle net debts at the end

Person A owns the group/expense experience; **Ben (Person B)** owns the Bark payment engine.
We now align with Ben's existing net-debt pot. This **replaces the earlier pre-funded trip-pot/refund proposal**.

1. Create a group, invite participants, and record expenses paid **out of pocket**.
2. Calculate each person's net balance like Kittysplit: **paid − expense share**.
3. Each participant supplies their own Bark signet receive address using a private personal link—no account/password.
4. The organizer reviews and closes the group. Expenses and destinations become immutable.
5. Net debtors get a QR for their assigned pot address and their exact amount owed.
6. The organizer checks deposits. Every debtor must complete their own payment; pending transfers do not count.
7. Once funded, the organizer explicitly authorizes payouts to net creditors.

Example: Alice paid 9,000 sats, Bob 6,000, Carol zero. Each owes a 5,000-sat share. Carol deposits 5,000 sats;
Alice receives 4,000 and Bob 1,000. Deposits settle these debts; they are **not** additional accounting credits.

The QR encodes the raw `tark1…` Bark address, not an invoice or an invented URI. The wallet user must enter the
displayed remaining amount. V1 is signet Ark only, not a Lightning/on-chain QR flow.

## Current state

- **A1–A6 complete:** group creation, invitations, participant selection, equal splitting with deterministic rounding,
  persistent expense share snapshots, transactional expense CRUD, and personalized balance overviews.
- **A7–A8 implemented:** private address setup, group-bound previews, close/resume confirmation, personal deposit QR,
  confirmed funding progress, payout confirmation, and receipt/reconciliation status.
- **B's engine reused:** `createPot`, `confirmPot`, `settlePot`, persistent optimistic revisions, receipt attribution,
  and durable payout intents. Wallet credentials and SDK calls remain server-only.
- **A9 backend/domain coverage implemented:** private-link isolation/revocation, address locking, stale previews,
  immutable expense locking, wallet reservation, initialization recovery, partial/pending deposits, unauthorized
  payouts, and lost-response recovery without duplicate sends. UI changes are verified manually per `AGENTS.md`.
- **Remaining acceptance gate:** rehearse the integrated group flow with a configured real Bark signet daemon and
  independently verify destination-wallet receipts. Offline fixture tests are not evidence of live payments.

## Ownership

### Person A: product and integration

- Groups, participants, invitations, expense persistence, and accounting.
- Private participant capabilities and personal address-entry UI.
- Server-side adapter from persisted expense balances to Ben's immutable debt setup.
- Group closure, authorization, wallet reservation, and payment/readiness screens.
- Backend/domain integration coverage, manual mobile verification, and demo documentation.

### Ben / Person B: Bark engine and demo environment

- Authenticated, isolated signet daemon/wallet setup and server-only SDK services.
- Confirmed receipt attribution, deduplication, spendable balance checks, and exact payouts.
- Persist-before-send safeguards, movement references, and uncertain-send reconciliation.
- Verify fee/reserve behavior and real recipient receipts with A during the integrated rehearsal.
- Keep the configured wallet exclusive: no external sends, competing copies, restores, or snapshot resets.

No new contribution-credit/refund backend is required. See [Bark pot documentation](dev/bark/POTS.md).

## Person A roadmap and semantic slices

| Slice | Deliverable                                                                 | Status                                                 |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| A1    | Equal expense splitting and participant balances                            | Done                                                   |
| A2    | Persisted groups and participants with scoped access                        | Done                                                   |
| A3    | Group creation and invitation flows                                         | Done                                                   |
| A4    | Expenses and historical split snapshots                                     | Done                                                   |
| A5    | Expense entry and management screens                                        | Done                                                   |
| A6    | Personalized group overview                                                 | Done                                                   |
| A7    | Private personal destinations, debt QR, confirmed funding progress          | Implemented; live rehearsal pending                    |
| A8    | Group review, immutable closing, organizer payout confirmation and recovery | Implemented; live rehearsal pending                    |
| A9    | Backend/domain integration coverage and manual UI/demo acceptance           | Offline coverage done; live payment acceptance pending |

Integration commits separate accounting/destinations, backend freezing/execution, atomic wallet isolation, payment UI,
and documentation. Do not add UI/component/browser test suites; keep tests in backend/domain modules.

## Access model

- The shared group invitation allows bookkeeping and choosing a name. **Name selection is not authentication.**
- An HTTP-only, group-scoped organizer cookie authorizes private-link issuance, closing, deposit reconciliation, and
  payouts. Selecting the organizer's name or possessing another group's organizer cookie grants nothing.
- The organizer generates a random private link per participant, including themselves, and sends it privately.
  Only its hash is persisted. The raw link is shown once; replacing it revokes the old link but preserves the address.
- That bearer capability authorizes only its person's address. Anyone holding it can act as that person, including
  the trusted organizer who distributed it. It is lightweight capability access, not identity verification or
  proof of wallet ownership. Do not publish these links.
- Private pages disable caching/referrers/indexing and later show that person's own QR or payout status. Participants
  can refresh saved status; only the organizer calls the daemon to check deposits or spend.
- Losing organizer cookies loses organizer access; recovery is not implemented. Keep the original browser.
- `/settle` remains Ben's **unauthenticated local-only** standalone workspace. It cannot operate on reserved or linked
  group pots. It is not safe to expose the whole application publicly without additional perimeter/access controls.

## Backend contract and recovery

- Stable `groupId` is the linked pot ID; stable `participantId` maps to each pot user. Never use names as payment IDs.
- Ben's current schema requires a unique personal address for **every** participant when money moves, including
  debtors. All-square groups need neither addresses nor a wallet and can close without moving money.
- Previews are computed server-side from persisted split snapshots. Closing requires a fingerprint of the reviewed
  expense versions and destination setup; a changed preview must be refreshed and reviewed again.
- One transaction stores the immutable setup and unique wallet reservation and changes `open → settling` before
  generating deposit instructions. Existing expense and address mutations reject closed groups.
- If pot initialization fails, the lock/reservation remains. **Resume pot setup** recovers the same immutable setup;
  there is no reopening or editing after closing, even if no deposits have arrived.
- Pot insertion rechecks wallet reservations transactionally. A standalone/group race cannot steal a reserved wallet.
- One configured daemon wallet supports one saved pot, including completed pots. For another group, configure a
  new isolated wallet; keep the original wallet/database available for any pending settlement.
- Backend payout checks require every debtor's attributed receipts and enough spendable funds. Browser amounts,
  selected names, stale readiness, unrelated deposits, and another person's overpayment never authorize payouts.
- Failed/timeout requests refresh persisted state. A `sending` payout may already have moved money: explicit
  **Reconcile and finish payouts** checks history rather than blindly resending the attempt.
- Group status becomes `settled` only after Ben's pot is settled, or when everyone's balance is zero.

Key modules: `src/domain/group-settlement.ts`, `src/db/participant-payments.ts`, `src/db/group-settlements.ts`,
`src/db/group-payment-access.ts`, `src/server/pots/group-service.ts`, and `src/server/pots/service.ts`.

## Boundaries and next joint work

This is a server-custodied signet hackathon demo, not trustless escrow or production custody. Equal integer-sat splits
only. No advance contributions, automatic refunds, fee allocation, background polling, or destination ownership
verification. Excess deposits and leftover reserves stay in the pot. If fees/spendability block payouts, inspect and
fund an independent reserve as documented by Ben; do not change locked balances or simulate success.

Run `pnpm fmt`, `pnpm check`, `pnpm test`, and `pnpm build`. Commit generated Drizzle migrations and generated routes.
Use Second's [signet guide](https://second.tech/docs/getting-started/bark-cli/signet) for wallet setup. Never expose
daemon tokens, add new wallet secrets to Git, or use the public development seed on mainnet.

## Integrated demo acceptance

- [x] Create/join from separate browsers and record/correct expenses (manually exercised).
- [x] Enter and persist a personal address through its private capability; reject invalid signet format.
- [x] Shared name selection does not expose organizer actions (manually exercised).
- [x] Confirm/cancel closing; close an all-square group without a wallet (manually exercised).
- [x] Offline backend coverage for locking, stale review, wallet isolation, funding, and payout recovery.
- [ ] Configure a fresh isolated signet wallet; repeat with valid personal wallet addresses.
- [ ] Close a nonzero group and scan the debtor QR; enter the displayed remaining sats.
- [ ] Check real attributed deposits, authorize payouts, and verify recipient-wallet movement references.
- [ ] Refresh throughout the live flow without changing the snapshot or duplicating payouts.
- [ ] Record the demo, document fee/reserve behavior, and retain recovery artifacts outside Git.
