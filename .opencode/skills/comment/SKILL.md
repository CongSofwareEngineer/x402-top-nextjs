---
name: comment
description: Write comments in English only, keep them short, required for new logic functions
---

# Comment Skill

## Rules

- **Write all comments in English**
- Keep them **short and concise** — use abbreviations where clear
- Every new logic function **must** have a brief comment explaining its purpose
- Comments must be relevant, on-topic, and not verbose
- Do **not** add redundant comments that just restate the code

## Examples

```typescript
// Good — concise, explains intent
// Format date for display (DD/MM/YYYY)
const formatDate = (date: Date) => dayjs(date).format('DD/MM/YYYY')

// Good — explains non-obvious logic
// Re-fetch only if cache is stale (> 5min)
if (isStale) refetch()

// Bad — redundant, just repeats the code
// This function formats a date
const formatDate = (date: Date) => ...

// Bad — too verbose
// The following function takes a Date object as input and returns
// a formatted string representation of that date in the format
// of day/month/year which is commonly used in Vietnam.
const formatDate = (date: Date) => ...
```
