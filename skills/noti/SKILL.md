---
name: noti
description: Standardized system for handling notifications, toasts, and user feedback across the application.
---

# 🔔 Notification System (Noti)

Guidelines for displaying notifications, toasts, and alerts in a consistent, user-friendly, and non-intrusive way.

---

## 1. Core Principles

- **Clarity over noise**: Notifications must be meaningful, not spammy
- **Right context**: Show feedback at the correct moment
- **Non-blocking UX**: Prefer toast over modal when possible
- **Consistency**: Use unified styles and behavior across the app

---

## 2. Mandatory Usage

### ✅ ALWAYS use:

`@/utils/notification.ts`

### 🚫 NEVER:

- Use custom toast libraries directly
- Create ad-hoc alert logic
- Bypass the notification utility

---

## 3. Available Functions

Use the correct function based on context:

| Type    | Function                              |
| ------- | ------------------------------------- |
| Success | `showNotificationSuccess`             |
| Error   | `showNotificationError`               |
| Loading | `showNotificationLoading` (if exists) |
| Info    | `showNotificationInfo` (if exists)    |

---

## 4. Usage Rules

### ✅ Success Notification

Use when:

- Action completed successfully
- User needs confirmation

```ts
showNotificationSuccess("Transaction completed successfully");
```
