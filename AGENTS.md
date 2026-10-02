# Project context

SplitBark is a shared-expense app with browser-owned shared-pot settlement using Bark, built for the
[bitcoin++ Berlin 2026 payments hackathon](https://btcpp.dev/berlin26/hackathon).
See `README.md` for the project overview and `dev/bark/BROWSER.md` for the mainnet demo and trust boundaries.
Keep scope small and prioritize a working demo. The retired server-owned `/settle` workspace must not be restored.

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

## Development database resets

This is a non-production prototype. If migrations or database changes are hard to reconcile without data loss,
prefer a full development database reset and a freshly generated migration baseline over complex data-preservation
work. Resets are permitted during this phase. Document the reset command and any baseline change.

## Bark

- Use [Second's Bark mainnet guide](https://second.tech/docs/getting-started/bark-cli/mainnet) and [connection details](https://second.tech/docs/connection-details) as the source of truth for Bark-related work. The app uses mainnet with small real amounts; keep mainnet database and wallet storage separate from historical signet data.

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
