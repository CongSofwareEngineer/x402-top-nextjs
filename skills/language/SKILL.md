---
name: language
description: Guidelines for localization and multilingual support in the project
version: 1.0.0
tags: [i18n, localization, frontend, hooks, ui]
---

# 🌐 Language Skill

This skill governs how text, translations, and multilingual support are handled throughout the project. AI Agents must strictly follow these guidelines when working with UI components, notifications, or dynamic content.

## 🎯 Objectives

- Ensure 100% of UI-displayed text is managed through language files.
- Maintain consistency, maintainability, and synchronization across all supported languages.
- Prevent hardcoded strings, duplicate keys, or missing translations.

## 📜 Core Rules

1. **Text Source**: All visible UI text MUST come from `useLanguage().translate()` or its alias `t()`. Never hardcode strings in JSX/TSX. Never import JSON files directly in components.

2. **Key Resolution**: Before creating a new key, check `@/public/assets/language/en.json`. If a semantically equivalent key exists, reuse it. If not, create a new key following the naming convention.

3. **Auto-Key Creation**: When a needed key doesn't exist:
   - Create it in `en.json` with appropriate English text
   - Add the exact same key to ALL other locale files (`vn.json`, `ja.json`, etc.)
   - Use English text as temporary value in non-English files with comment `// TODO: Translate`
   - Follow naming convention: `module.section.element[.state]` (lowercase, dot-separated)

4. **Parameter Handling**: Dynamic values MUST be passed via params object: `t('key', { name: value })`. Never concatenate strings manually. Keep sentence structure flexible for reordering per language.

5. **Hook Usage**: Only use the existing `useLanguage` hook. Never create new hooks, contexts, or utilities for language management.

6. **Sync Requirement**: Every key in `en.json` MUST exist in all other locale files. Missing translations temporarily use English text.

## 📝 Key Naming Conventions

- Format: `module.section.element[.state]`
- Modules: `auth`, `dashboard`, `product`, `user`, `settings`, `common`, `error`, `validation`, `notification`, `cart`, `order`
- Sections: `login`, `register`, `list`, `detail`, `form`, `modal`, `header`, `footer`, `emptyState`, `successState`
- Elements: `title`, `subtitle`, `label`, `placeholder`, `button`, `link`, `tooltip`, `error`, `success`, `ariaLabel`
- States (optional suffix): `.loading`, `.disabled`, `.error`, `.success`

✅ Valid: `auth.login.submitButton`, `product.list.emptyState.title`, `common.greeting`, `validation.email.invalid`
❌ Invalid: `loginBtn`, `text1`, `auth_submit`, `button`, `Page1.Label2`

## 🔤 Handling Dynamic Text & Parameters

- When text contains variables (e.g., `Hello, {name}`), pass parameters via an object: `translate('key', { name: userName })`.
- Never manually concatenate strings in components (`"Hello, " + user.name + "!"`).
- Keep sentence structure natural per language. Avoid hardcoding variable positions within sentences.

## ✅ Pre-Submission Checklist (Agent Self-Validation)

- [ ] No hardcoded strings in JSX/TSX/templates
- [ ] All new keys added to `en.json` and all other language files in the directory
- [ ] Keys follow the naming convention (`module.section.element`)
- [ ] Dynamic values are passed via parameters, not manually concatenated
- [ ] No new hooks/contexts/utilities created for language management

## 🚫 Anti-Patterns (Strictly Avoid)

```tsx
// ❌ WRONG: Direct hardcoding
<button>Login</button>

// ❌ WRONG: Direct JSON import
import en from '@/public/assets/language/en.json'
<span>{en.dashboard.title}</span>

// ❌ WRONG: Manual string concatenation
<p>Hello, {user.name}!</p>

// ✅ CORRECT: Use hook + proper key + parameter passing
const { translate } = useLanguage()
<button>{translate('auth.login.submitButton')}</button>
<p>{translate('common.greeting', { name: user.name })}</p>
```
