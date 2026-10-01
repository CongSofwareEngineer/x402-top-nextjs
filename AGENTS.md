<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules (MANDATORY)

These rules apply to every task and override default behavior. They work together with the project skills in `skills/<name>/SKILL.md`: `ui`, `form`, `language`, `noti`, `modal`, `zustand`, `tailwind-design-system`.

## 1. Never hardcode text in the UI

- Every user-facing string (labels, buttons, titles, placeholders, notifications, errors, empty states, `alt`, `aria-label`, metadata) MUST come from `translate()` of `useLanguage` (`@/hooks/useLanguage`).
- Add each key to BOTH `public/assets/language/vn.json` and `public/assets/language/en.json` (see skill `language`).
- Notifications go through `@/utils/notification.ts` (see skill `noti`).
- The i18n setup (`hooks/useLanguage.ts`, `public/assets/language/`) and `utils/notification.ts` do not exist yet — set them up first (ask first — see rule 4) instead of hardcoding text.
- Do not hardcode image/icon paths inline in components — centralize them in `config/` / `component/` (ask first before creating a new file — see rule 4).

```tsx
// ❌ Bad
<button>Claim all</button>

// ✅ Good
const { translate } = useLanguage()
<button>{translate('polymarket.positions.claimAll')}</button>
```

## 2. Never hardcode names/values — always go through constants

- Do NOT write raw string/number literals for keys, names, or config values directly in components, hooks, or services. Define them in `constants/` (or `config/` for app/chain/payment config) and import them.
- This covers: React Query keys, localStorage keys, status/enum values, routes/paths, API endpoints, chain IDs, contract/wallet addresses, prices, limits/sizes/page sizes, colors, external URLs, regex patterns, timeouts.
- Reuse existing constants first:
  - `constants/reactQuery.ts` — `REACT_QUERY_POLY_MARKET` (React Query keys)
  - `constants/polymarket.ts` — `POLYMARKET_ROUTES`, `POLYMARKET_CATEGORIES`, `MARKET_SORT_PRESETS`, `MARKETS_PAGE_SIZE`, `EXPLORERS`, `BRIDGE_CHAIN_EXPLORERS`
  - `constants/token.ts` — `USDC_BY_CHAIN`
  - `constants/keyringPro.ts` — `KEYRING_PRO_*`
  - `config/` — `app.ts` (`DOMAIN_REF`), `appkit.ts` (`CHAIN_APP`, `DEFAULT_NETWORK`, `CHAIN_SUPPORT`, wagmi config), `x402.ts` (`NETWORK`, `PAY_TO`, `PRICES_USD`, `DESCRIPTIONS`), `argon2.ts`
  - `services/polymarket/constants.ts` — Polymarket protocol constants (`API_POLYMARKET`, `CONTRACTS`, `ORDER_SIDE`, `TOKEN_DECIMALS`, …)
- `services/polymarket/` is a framework-agnostic SDK: no React, no React Query, no `@/` imports. Its constants stay in `services/polymarket/constants.ts`; UI constants go in `constants/polymarket.ts`.
- If no suitable constant exists, add it to the matching file in `constants/` (ask first — see rule 4).

```ts
// ❌ Bad
useQuery({ queryKey: ['polymarket_positions', wallet] })
if (order.side === 'BUY') { ... }
fetch('/api/polymarket/deploy')

// ✅ Good
useQuery({ queryKey: [REACT_QUERY_POLY_MARKET.POSITIONS, wallet] })
if (order.side === ORDER_SIDE.BUY) { ... }
fetch(POLYMARKET_ROUTES.DEPLOY)
```

## 3. Never commit or push on your own

- Do NOT run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git stash`, or any command that changes git history or the remote.
- Only do so when the user explicitly asks for that specific action in the current message. Leave all changes uncommitted for the user to review.

## 4. Always ask before adding or deleting

- Before creating a new file/folder/component/hook/constant/translation namespace, installing a package, or deleting/renaming any file, code block, key, or dependency: describe what will be added/removed and wait for the user's confirmation.
- Editing existing code within the scope of the requested task does not need extra confirmation, but removing existing logic does.
- When in doubt, ask.

## 5. Every logic change must have a log file in `docs/`

- For every new or changed piece of logic (feature, hook, API call, business rule, bug fix), write a Markdown log file in `docs/` so the team can understand it.
- Path: `docs/<feature>/<YYYY-MM-DD>-<short-slug>.md` (e.g. `docs/polymarket/2026-10-01-redeem-positions.md`). Create the `docs/` and `<feature>` folders if missing.
- Write the log in Vietnamese, short and clear, using this template:

```md
# <Tên thay đổi>

- Ngày: YYYY-MM-DD
- Phạm vi: <feature / module>

## Mục đích
<Vì sao cần thay đổi này, giải quyết vấn đề gì>

## Luồng xử lý
1. <Bước 1>
2. <Bước 2>

## File liên quan
- `path/to/file.ts` — <vai trò>

## Constants / Translation keys mới
- `REACT_QUERY_POLY_MARKET.XXX`, `polymarket.xxx`

## Lưu ý
<Edge case, giới hạn, việc cần làm tiếp>
```

- Update the existing log instead of creating a duplicate when continuing the same change on the same day.

## Done checklist

Before reporting a task as done, verify:

- [ ] No hardcoded UI text — all via `translate()`, keys in both `vn.json` and `en.json`
- [ ] No raw keys/names/values — all via `constants/`, `config/` or `services/polymarket/constants.ts`
- [ ] Nothing committed or pushed
- [ ] Every add/delete was confirmed by the user
- [ ] Log file written in `docs/`
- [ ] `yarn lint` and `yarn build` pass
