# Implementation plan: Person A + Person B

## Goal

A Kittysplit-style group expense app that settles actual Bitcoin through Bark on signet.
Participants contribute to a shared pot, record expenses they paid **out of pocket**, and receive their final balances
from the pot. This is a server-custodied hackathon prototype, not production custody or trustless escrow.

The user is **Person A**. The coworker is **Person B**.

## Current state

- **A: implemented** group creation, invitation links, participant selection, equal expense splitting, persisted split
  snapshots, expense creation/editing/deletion, and personalized balance overviews.
- **B: implemented independently** the Bark signet adapter, persisted net-debt pots, receipt reconciliation, guarded
  payouts, an offline test suite, and the standalone `/settle` interface. See [Bark pot documentation](dev/bark/POTS.md).
- **Merged:** both flows coexist; the home page links to the settlement workspace. Shared shadcn components and generated
  routes have been reconciled. Both sets of migrations are preserved.
- **Not connected yet:** a group has no linked Bark pot, confirmed contributions, verified payout destinations, or
  group-bound settlement action. The expense overview is accounting, not a payment authorization.

## First integration decision: the money model

The original shared-pot model and the current standalone settlement backend are **not yet the same model**:

| Model             | Funding                                                                                        | Payouts                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Our target        | Participants contribute before/during the event; contributions count toward their own balances | Contribution + out-of-pocket expenses paid − expense share, subject to agreed fee handling |
| Current `/settle` | Net debtors contribute the exact amount needed after expenses are finished                     | Net creditors receive the amount they are owed                                             |

**Do not silently substitute one model for the other.** A and B should agree on the bridge before implementing funding
UI. For the original goal, B needs to support contribution credits and refunding remaining participant funds, not just
netting debts. The existing backend deliberately leaves excess deposits in the pot; that is not the same as refunding
unused trip contributions.

Example, ignoring fees: Alice, Bob, and Carol contribute 10,000 sats each. Alice pays 12,000 sats for dinner. Each owes
a 4,000-sat share. The target payouts are Alice 18,000, Bob 6,000, Carol 6,000, totaling the 30,000-sat pot.
A negative final balance requires a top-up before settlement. Decide explicitly how the fee reserve is funded and
allocated before promising final payout amounts.

## V1 scope

- One organizer; shared-link bookkeeping; no mandatory account.
- Whole integer sats and equal splitting; deterministic rounding conserves every sat.
- Participant names and a mobile-first, single-column interface inspired by Kittysplit, not its branding.
- Expenses paid out of pocket, with their participant shares snapshotted at creation.
- Signet only, isolated pot wallet, confirmed deposits, and explicit organizer-authorized settlement.
- No fiat conversion, unequal splits, receipts, comments, production authentication, or mainnet funds.

Choosing a name is **personalization only**, not proof of identity. Invitation links must never authorize wallet
spending or changes to another participant's payout destination. The current operator access code in `/settle` is a
separate hackathon gate; the group organizer cookie does not replace it automatically.

## Ownership

### Person A: product, groups, expenses, accounting

- Group/participant schema, validated server functions, and creation/invitation/join flows.
- Expense schema, equal splitting, historical share snapshots, and accounting tests.
- Expense entry, list/detail, edit/delete, and personal/group balance screens.
- Group payment UI consuming B's authoritative funding and settlement data.
- Settlement preview, explicit confirmation, and readable payment progress/errors.

### Person B: wallet, funding, settlement execution

- Server-only Bark services/layers and isolated signet wallets.
- Deposit instructions, confirmed receipts, attribution, reconciliation, and contribution credits.
- Protected recipient setup, payment fees, readiness checks, and available funds.
- Group-bound pot persistence, settlement locking/snapshots, payout attempts, and references.
- Duplicate-send prevention, uncertain-outcome reconciliation, and deployment wallet configuration.

**A calculates balances. B executes payments.** B must independently verify persisted balances, authorization,
destinations, locking, funding, and fees before sending. Never accept browser-computed payout amounts as authority.

## Person A's semantic commits

| Order | Commit                                                               | Status / acceptance                                                                                                          |
| ----- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A1    | `feat(domain): add equal expense splitting and participant balances` | Done. Rounding, conservation, invalid inputs, multiple payers, top-ups, and historical shares tested.                        |
| A2    | `feat(groups): persist groups and participants with scoped access`   | Done. Hashed invitation/organizer capabilities, separate authorization, group isolation, generated migration.                |
| A3    | `feat(groups): add group creation and invitation flows`              | Done. Mobile creation, shared invitation, name selection, persistent view, and no organizer privilege from selecting a name. |
| A4    | `feat(expenses): persist expenses and their split snapshots`         | Done. Transactional CRUD, idempotent creates, versioned edits/deletes, membership checks, and settlement lock checks.        |
| A5    | `feat(expenses): add expense entry and management screens`           | Done. Payer/description/sats/date, repeated-entry feedback, readable list/detail, editing, and confirmed deletion.           |
| A6    | `feat(balances): add personalized group overview`                    | Done. Group spending, personal share/payment/expense balance, and everyone's balances; recalculation tested.                 |
| A7    | `feat(pot): display confirmed funding and expected payouts`          | Next, after money-model agreement and B's group funding API. Pending funds must never count as confirmed money.              |
| A8    | `feat(settlement): add preview and organizer confirmation`           | Next, after B's group-bound settlement API. Display blockers, locking, partial completion, and unknown outcomes.             |
| A9    | `test(e2e): cover group expense and settlement journeys`             | Pending. Automate the complete funded group journey, refresh recovery, and failure scenarios.                                |

Feature commits include their own tests. A9 adds cross-feature coverage; it is not permission to defer accounting or
payment-safety tests. Manual browser smoke checks have exercised the group and expense flows, but they are not yet
the committed, full payment end-to-end suite.

## Person B's semantic slices and remaining bridge

| Slice                                                                | Deliverable                                                              | Current state                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `feat(payments): add server-only Bark wallet service`                | Receive/send proof, signet verification, server-only credentials         | Present in the merged Bark adapter/demo.                                                                     |
| `feat(pot): track and reconcile confirmed contributions`             | Isolated pot, deposit addresses, attributed and deduplicated receipts    | Present for net-debt obligations; adapt for the agreed contribution-credit model.                            |
| `feat(payments): add protected recipient setup`                      | Recipient destinations verified under appropriate access                 | Existing standalone operator flow locks destinations; group/person ownership still needs a protected bridge. |
| `feat(settlement): persist settlement snapshots and payout attempts` | Immutable amounts/destinations, locking, durable states                  | Standalone pot snapshots exist; link to group ID and atomically freeze group expenses.                       |
| `feat(settlement): execute and reconcile Bark payouts`               | Confirmed payouts, no automatic resend of unknown attempts               | Present in the standalone service; preserve these safeguards during integration.                             |
| `chore(deploy): configure demo hosting and wallet environment`       | Trusted HTTPS access, authenticated loopback daemon, server-only secrets | Local configuration documented; agree on the shared demo environment.                                        |

These are ownership slices, not a request to rewrite B's existing commits or duplicate the standalone implementation.

## Shared API contract

Agree in code before A7/B's bridge work:

1. Link stable `groupId` and `participantId` to the pot and its participants. Invitation tokens are access capabilities,
   not database IDs; participant selection cookies are not authenticated payout ownership.
2. Expose per-participant confirmed contribution totals and deposit status. Include backend receipt/payment references.
3. Expose available/spendable pot funds separately from participant contributions and fee reserves.
4. Build previews from persisted expense share snapshots and confirmed contribution credits; define fee/top-up behavior.
5. Store an immutable settlement snapshot and transition `groups.status` from `open` to `settling` transactionally.
   Expense mutations already reject non-open groups. Do not call Bark before the lock/snapshot is persisted.
6. Distinguish pending, succeeded, failed, and unknown/reconciliation-required outcomes. Preserve existing `sending`
   attempts and reconcile them; never blindly retry a timeout.
7. Recheck organizer/operator authorization server-side. Scope every lookup/mutation to the linked group and wallet.

Relevant A modules: `src/domain/accounting.ts`, `src/db/group-schema.ts`, `src/db/expense-schema.ts`,
`src/db/balances.ts`, and `src/server/group-session.ts`.
Relevant B modules: `src/lib/pot.ts`, `src/server/pots/service.ts`, `src/server/pots/store.ts`, and
`src/server/pots/ui-service.ts`.

## Suggested 23-hour schedule

This is a budget from the start of the hackathon work, not a claim about elapsed time.

| Hours | Person A                                                                  | Person B                                               |
| ----- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| 0–2   | Accounting tests and group schema                                         | Prove Bark receive/send and confirm signet/environment |
| 2–7   | Group/expense backend and initial UI                                      | Funding, persistence, and receipt reconciliation       |
| 7–12  | Dashboard, expense management, and payment UI against agreed contract     | Group-pot bridge, recipients, fees, and settlement     |
| 12–15 | Together: first complete funded-group settlement                          | Together: verify destination-wallet receipts           |
| 15–19 | UX/accounting edge cases                                                  | Recovery, authorization, wallet isolation, deployment  |
| 19–23 | Together: feature freeze, tests, demo rehearsal, backup recording, buffer | No new features                                        |

If the money-model bridge is not ready, demo the existing expense and standalone signet flows **as separate flows**.
Do not describe them as an integrated funded trip or substitute simulated payment success.

## Integration and delivery rules

- Separate branches/worktrees; small semantic commits and frequent pulls.
- Designate one migration coordinator. Preserve both sides' committed migrations and let Drizzle reconcile snapshots;
  verify fresh databases and upgrading an existing database. Do not manually edit generated files.
- Let TanStack regenerate `src/routeTree.gen.ts` after route merges.
- Read `AGENTS.md` and the installed shadcn skill before UI changes. Use existing components and semantic Tailwind tokens.
- Run `pnpm fmt`, `pnpm check`, `pnpm test`, and `pnpm build` before merging/pushing. Advisory complexity warnings are
  not errors; improve focused modules without broad lint suppressions.
- Pair-review the balance formula, rounding, money-model adapter, authorization, and settlement recovery.
- Keep Barkd authenticated and on loopback; use trusted HTTPS access for the app. Never commit daemon tokens,
  operator codes, new wallet secrets, or mainnet recovery material. The existing shared public seed is signet-only.

## Final demo acceptance

- [ ] Create a group; join from another browser.
- [ ] Record and correct expenses; explain the personal/group balances.
- [ ] Fund that same group's isolated pot; verify attributed deposits.
- [ ] Preview refunds/reimbursements, fees, and required top-ups under the agreed model.
- [ ] Authorize settlement through protected organizer/operator access.
- [ ] Verify actual signet receipts in recipient wallets.
- [ ] Refresh without losing state or duplicating payouts; show partial/unknown outcomes honestly.
- [ ] Clearly label signet, custody, access-control, and refund limitations.
