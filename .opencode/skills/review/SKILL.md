---
name: review
description: Always review your own code after completing a task, fix bugs immediately
---

# Review Skill

## Rules

- **Always review your own code** after finishing a task
- If you find a bug, **fix it immediately** — do not wait for instructions
- Verify code quality by running:

```bash
npm run lint
npm run build
```

## Checklist

- [ ] No hardcoded UI strings (use `translate()`)
- [ ] Icons imported from `components/Icons/`, not recreated
- [ ] Components reused from `components/` where possible
- [ ] `useModalDrawer` used for modals/drawers
- [ ] New text keys added to both `vn.json` and `en.json`
- [ ] New logic functions have brief English comments
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
