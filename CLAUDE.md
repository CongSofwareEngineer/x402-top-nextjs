# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Project Rules (MANDATORY)

These rules apply to every task and override default behavior. They work together with the project skills: `language`, `component`, `create-page`, `icon-image`, `modal-drawer`, `comment`, `review`.

## 1. Never hardcode text in the UI

- Every user-facing string (labels, buttons, titles, placeholders, toasts, errors, empty states, `alt`, `aria-label`, metadata) MUST come from `translate()` of `useLanguage` (`@/hooks/useLanguage`).
- Add each key to BOTH `public/assets/language/vn.json` and `public/assets/language/en.json` (see skill `language`).
- Images come from `config/images.ts`, icons from `components/Icons/` (see skill `icon-image`).

```tsx
// ❌ Bad
<MyButton>Lưu</MyButton>
toast.error('Có lỗi xảy ra')

// ✅ Good
const { translate } = useLanguage()
<MyButton>{translate('common.save')}</MyButton>
toast.error(translate('common.error'))
```

## 2. Never hardcode names/values — always go through constants

- Do NOT write raw string/number literals for keys, names, or config values directly in components, hooks, or services. Define them in `constants/` (or `config/` for site/API/image config) and import them.
- This covers: React Query keys, cookie/localStorage keys, status/enum values, routes/paths, API endpoints, tool/agent names, limits/sizes/page sizes, colors, external URLs, regex patterns, timeouts.
- Reuse existing constants first:
  - `constants/reactQuery.ts` — `QUERY_KEYS`, `PAGE_SIZE`
  - `constants/cookies.ts` — `COOKIES_KEY`
  - `constants/app.ts` — `SITE_CONFIG`, `INFO_CONTACT`, `COLORS`, `ORDER_STATUS`, limits (`MAX_*`)
  - `constants/tools.ts` — `TOOL_NAME`, agent names
  - `config/` — `baseApi.ts`, `images.ts`, `seo.ts`, `firebase.ts`
- If no suitable constant exists, add it to the matching file in `constants/` (ask first — see rule 4).

```ts
// ❌ Bad
useQuery({ queryKey: ['getListBlogs', page] })
if (order.status === 'PENDING') { ... }
Cookies.get('accessToken')

// ✅ Good
useQuery({ queryKey: [QUERY_KEYS.getListBlogs, page] })
if (order.status === ORDER_STATUS.PENDING) { ... }
Cookies.get(COOKIES_KEY.accessToken)
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
- Path: `docs/<feature>/<YYYY-MM-DD>-<short-slug>.md` (e.g. `docs/blog/2026-09-30-blocknote-editor.md`). Create the `<feature>` folder if missing.
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
- `QUERY_KEYS.xxx`, `common.xxx`

## Lưu ý
<Edge case, giới hạn, việc cần làm tiếp>
```

- Update the existing log instead of creating a duplicate when continuing the same change on the same day.

## Done checklist

Before reporting a task as done, verify:

- [ ] No hardcoded UI text — all via `translate()`, keys in both `vn.json` and `en.json`
- [ ] No raw keys/names/values — all via `constants/` or `config/`
- [ ] Nothing committed or pushed
- [ ] Every add/delete was confirmed by the user
- [ ] Log file written in `docs/`
- [ ] `npm run lint` and `npm run build` pass (skill `review`)
