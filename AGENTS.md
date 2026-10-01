# Project context

This repository is for a project entering the **bitcoin++ Berlin 2026 payments hackathon**, “money in movement” (October 1–3, 2026). The project is a shared-expense app with shared-pot settlement using Bark. See `README.md` for the project direction and stack, and `dev/bark/POTS.md` for the backend signet demo.

Prioritize a working, demoable Bitcoin project within the roughly 24-hour hacking window. Keep scope small and document setup, the demo flow, and any challenge eligibility requirements as the project takes shape.

Official sources (checked October 1, 2026): [hackathon](https://btcpp.dev/berlin26/hackathon), [prizes/challenges](https://btcpp.dev/berlin26/hackathon#awards), [schedule](https://btcpp.dev/berlin26/hackathon/schedule). Recheck these for changes; this file is a brief context snapshot, not the official rules.

## Participation and submission

- Anything Bitcoin is eligible for the open competition. Teams have **up to 4 builders**; each person belongs to one project team.
- Sponsor challenges are **optional and stackable** on top of the main competition, subject to eligibility.
- Sign in with a bitcoin++ profile and [create a project](https://btcpp.dev/berlin26/hackathon/projects/new). Add teammates from their profiles and select applicable challenges.
- Submit the **pitch, team, repository, demo, and supporting links** before submissions close. The public page does **not specify an exact submission deadline**; confirm it in the platform or with organizers. Prepare a working demo for the expo.

## Timeline

All times are **Europe/Berlin (CEST, UTC+2)** in 2026.

| Date      | Event                          | Time        | Venue       |
| --------- | ------------------------------ | ----------- | ----------- |
| Thu Oct 1 | Kickoff                        | 15:30–16:00 | Main Stage  |
| Thu Oct 1 | Hacking time (scheduled block) | 16:00–20:00 | Main Stage  |
| Fri Oct 2 | Project expo                   | 15:30–17:00 | Talks Stage |
| Fri Oct 2 | Judges meeting                 | 17:00–17:30 | Talks Stage |
| Sat Oct 3 | Finals                         | 14:15–15:15 | Main Stage  |
| Sat Oct 3 | Awards                         | 16:15–17:00 | Main Stage  |

## Prizes and challenges

Advertised total prize value: **37.15M sats**, including tickets, subscriptions, and credits—not all cash.

### Open competition

| Award                                                                                | Prize                                    |
| ------------------------------------------------------------------------------------ | ---------------------------------------- |
| [First place](https://btcpp.dev/berlin26/hackathon/awards/first-place)               | 2.5M sats + tickets valued at 1.6M sats  |
| [Second place](https://btcpp.dev/berlin26/hackathon/awards/second-place)             | 1.75M sats + tickets valued at 1.6M sats |
| [Third place](https://btcpp.dev/berlin26/hackathon/awards/third-place)               | 750k sats + tickets valued at 1.6M sats  |
| [Honorable mentions](https://btcpp.dev/berlin26/hackathon/awards/honorable-mentions) | Tickets valued at 1.6M sats              |

### Stackable sponsor challenges

| Challenge                                                                                                                    | What to build                                                                                                                                                                           | Prize                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Ain’t nobody got time for that — Mempool.space](https://btcpp.dev/berlin26/hackathon/awards/ain-t-nobody-got-time-for-that) | Creatively integrate mempool’s public transaction accelerator API for stuck onchain transactions.                                                                                       | Enterprise Silver subscription + 500k sats accelerator credit; advertised value 21M sats |
| [Best use of Bark — Second](https://btcpp.dev/berlin26/hackathon/awards/best-use-of-bark)                                    | Move Bitcoin using Bark (Ark): wallets, payment flows, merchant tools, payouts, P2P, or infrastructure. CLI, REST API, Rust library, or FFI all qualify.                                | 1.5M sats per winner                                                                     |
| [Most useful Electrum plugin](https://btcpp.dev/berlin26/hackathon/awards/most-useful-electrum-plugin)                       | Useful everyday [Electrum plugin](https://plugins.electrum.org) for desktop, Android, or daemon.                                                                                        | 1M sats per winner; BOLT11/BOLT12 payout                                                 |
| [See the Future — Glimpse Markets](https://btcpp.dev/berlin26/hackathon/awards/see-the-future)                               | Readable Bitcoin price forecasts using Glimpse prediction-market data via its [API](https://docs.glimpse.markets/index) or [Python package](https://pypi.org/project/glimpse-markets/). | 1M sats per winner                                                                       |
| [Trustless Bets — Glimpse Markets](https://btcpp.dev/berlin26/hackathon/awards/trustless-bets)                               | Non-custodial betting/gaming using P2P, self-custodial Bitcoin infrastructure (e.g. Arkade/Bark). **Must run in production with real sats; testnet/signet are ineligible.**             | 750k sats per winner; Lightning payout                                                   |
| [Most Based Payment Protocol — Base58](https://btcpp.dev/berlin26/hackathon/awards/most-based-payment-protocol)              | Proposal improving Bitcoin payment protocols; think big, idempotent, and peer-to-peer.                                                                                                  | 500k sats                                                                                |

# Project conventions

- Use pnpm for dependencies and scripts. Use Vite+ (`pnpm exec vp`) for development, builds, Oxlint, Oxfmt, and tests.
- Type-check with TSGo (`pnpm typecheck`), not `tsc`.
- Run `pnpm check`, `pnpm test`, and `pnpm build` before completing changes.
- Oxfmt uses 120 columns and double quotes. Run `pnpm fmt`; do not hand-maintain import order.
- Keep TypeScript strict. Do not introduce `any`, unsafe assertions, non-null assertions, ignored promises, or broad lint suppressions.
- Use Effect 4 services and layers for server-side logic, Effect Schema for validation, and Drizzle's native Effect/libSQL driver.
- Use `@effect/vitest` for backend and domain tests: prefer `it.effect`, `it.effect.each`, and `layer(...)` for shared service fixtures. Return Effects directly instead of calling `Effect.runPromise` in tests. Keep Vite+ as the runner.
- Do not add UI, component, or browser tests. Test backend and domain logic only; verify UI changes manually.
- Keep database access and credentials server-only. Import server implementations through TanStack Start server functions.
- Commit generated Drizzle migrations and `src/routeTree.gen.ts`; do not edit generated files manually.

## Bark

- Use [Second's Bark signet guide](https://second.tech/docs/getting-started/bark-cli/signet) as the source of truth for Bark-related work.

## UI and styling

- Keep UI copy minimal and functional: labels, actions, and necessary state or error messages only. Do not add cute
  messages, slogans, marketing copy, redundant helper text, or prototype commentary to the interface.
- Use **event** in user-facing creation copy (for example, **Create event**), not **group**.
- Use Tailwind utility classes for all styling. **Never write custom CSS classes/selectors or CSS modules.**
- Keep `src/styles.css` limited to Tailwind imports, shadcn theme tokens, and the standard base layer.
- Use shadcn/ui components from `@/components/ui` instead of rebuilding buttons, inputs, cards, alerts, or form controls.
- Read the installed `.agents/skills/shadcn/SKILL.md` before UI work and follow its composition and accessibility rules.
- Use the pinned shadcn CLI (`pnpm exec shadcn docs ...`, `pnpm exec shadcn add ...`) to inspect and install components.
- Prefer component variants and semantic theme utilities (`bg-background`, `text-muted-foreground`) over custom colors.

## Size and complexity guidelines

Oxlint enables its default maximum function length, file length, statement count, parameter count, cyclomatic complexity, nesting depth,
and nested callback count as **warnings**. Agents should try to adhere to these defaults where possible: extract focused
functions and modules rather than suppressing warnings. These are advisory limits, not reasons to contort otherwise
clear code. Tests have scoped overrides disabling these limits so setup and assertions can remain together. Do not
extend test-only overrides to application code.
