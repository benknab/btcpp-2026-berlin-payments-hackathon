# Project conventions

- Use pnpm for dependencies and scripts. Use Vite+ (`pnpm exec vp`) for development, builds, Oxlint, Oxfmt, and tests.
- Type-check with TSGo (`pnpm typecheck`), not `tsc`.
- Run `pnpm check`, `pnpm test`, and `pnpm build` before completing changes.
- Oxfmt uses 120 columns and double quotes. Run `pnpm fmt`; do not hand-maintain import order.
- Keep TypeScript strict. Do not introduce `any`, unsafe assertions, non-null assertions, ignored promises, or broad lint suppressions.
- Use Effect 4 services and layers for server-side logic, Effect Schema for validation, and Drizzle's native Effect/libSQL driver.
- Use `@effect/vitest` for backend and domain tests: prefer `it.effect`, `it.effect.each`, and `layer(...)` for shared service fixtures. Return Effects directly instead of calling `Effect.runPromise` in tests. Keep Vite+ as the runner; frontend tests may use `vite-plus/test`.
- Keep database access and credentials server-only. Import server implementations through TanStack Start server functions.
- Commit generated Drizzle migrations and `src/routeTree.gen.ts`; do not edit generated files manually.

## UI and styling

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
