# Frontend conventions (Next 16 + React 19 + @org/ui)

## Language and copy

- UI strings in Spanish (es-CO), code and identifiers in English. Labels for enums come from `@org/domain` (`categoryLabel`, `discountTypeLabels`, `verificationStatusLabels`, `subscriptionStatusLabels`, `redemptionReasonMessages`).
- Money via `formatCop` / `formatDiscount` from `@org/domain` (es-CO `Intl`).

## Components (`@org/ui`)

`Button` / `buttonClassName` (variants primary, secondary, ghost, danger; use `buttonClassName` on `next/link`), `InputField`, `TextareaField`, `SelectField`, `FormError`, `PageShell`, `TopBar` (left back link, title, right slot), `BackIcon`, `Brand`, `EmptyState`, `Toggle` (role=switch), `LoginForm`, `SignupForm`, `CouponCard`.

- **`CouponCard` is the single coupon rendering.** The merchant editor renders it with `preview` and the consumer app renders the same component; never fork it.
- `@org/ui` may import `@org/domain` but nothing from Next (`next/link`, `next/image`); pass `href`s and let apps wrap with `Link` where needed. Use plain `<img>` for user uploads (no Next lint rule applies inside the package).
- Add a `'use client'` directive only to components that use hooks or handlers.

## Forms

Two patterns, pick by complexity:

1. **Simple forms** (auth, onboarding): plain `<form action={serverAction}>` with `useActionState`. The action returns `AuthActionState` = `{ error?, fieldErrors?, values? }`. **Always echo `values` back on validation failure and set `defaultValue={state.values?.x}`**: React 19 resets uncontrolled inputs after any action, so without this a validation error wipes the form.
2. **Rich forms** (coupon editor): `react-hook-form` + `zodResolver(schema from @org/domain)` with `mode: 'onChange'`; `useWatch({ control })` feeds live previews; on submit build a `FormData` and call the server action inside `useTransition`. Numbers use `setValueAs: v => v === '' ? null : Number(v)`.

Server actions: validate again with the same zod schema, use `fieldErrorMap(error)` for per-field messages, write with the user-session client so RLS applies, `revalidatePath` then `redirect`. Map database errors to Spanish (`friendlyDbError` pattern; the `MIN_ACTIVE_COUPONS` trigger hint is already Spanish).

File uploads go through the server action (`serverActions.bodySizeLimit: '4mb'` in `next.config.js`); validate type/size against `LOGO_MIME_TYPES` / `LOGO_MAX_BYTES`; storage paths are `<business_id>/<file>` so the owner-folder storage policy applies.

## Next 16 specifics

- `searchParams` and `params` are Promises: `const p = await searchParams`.
- `src/proxy.ts` instead of middleware; matcher must be a literal.
- Call `cookies()` before anything that can throw during prerender (done inside `createServerSupabase`).
- Set `turbopack.root` to the monorepo root in `next.config.js` (avoids picking up the parent checkout's lockfile).
- `transpilePackages` must list every `@org/*` package the app imports.
- Client components cannot import from `@org/supabase/server` (it is `server-only`).

## Testing

- Domain: jest, pure functions, table tests (`it.each`).
- UI: `@testing-library/react` with plain assertions (`toBeTruthy`, `getAttribute`); no jest-dom installed.
- Apps: one smoke render per app; no Playwright yet (Phase 9).
- Database rules: pgTAP, see [database.md](database.md).

## Style tokens

Defined in `packages/ui/src/theme.css`. Brand (`brand-50..700`), surfaces (`surface`, `surface-muted`, `line`), text (`ink`, `ink-muted`), semantic (`success`, `danger`), radii (`rounded-card`, `rounded-pill`). Mobile-first: `PageShell` is a `max-w-md` column with safe-area padding.
