---
name: zustand
description: Guidelines for state management using Zustand
version: 1.0.0
tags: [state-management, zustand, frontend, typescript, performance]
---

# 🏪 Zustand Skill

This skill governs how global and feature-level state is created, persisted, and consumed using Zustand. AI Agents must strictly follow these guidelines when implementing or modifying state logic.

## 🎯 Objectives

- Maintain consistent, predictable, and type-safe state across the application.
- Prevent unnecessary re-renders through proper selector usage.
- Standardize store creation, persistence, and hook integration patterns.
- Ensure clean separation between state logic and UI components.

## 📜 Core Rules

1. **Follow `@/zustand/user.ts` Pattern**: All new stores must mirror the structure, export style, and action organization defined in `@/zustand/user.ts`.
2. **Persistence via `@/zustand/language.ts`**: If state must survive page reloads, implement `persist` middleware exactly as shown in `@/zustand/language.ts`. Include versioning/migration if the shape changes.
3. **Hook Integration Required**: After creating a store, export a corresponding typed hook in `@/hooks/` (e.g., `useUserStore`) to simplify imports and ensure consistent usage across components.
4. **No Direct State Mutation**: Always update state via explicit actions. Never mutate `state` directly outside the store creator.
5. **Middleware Order Matters**: When using multiple middlewares (e.g., `persist`, `devtools`, `immer`), apply them in the correct order. `devtools` should typically wrap the outermost layer.

## 📐 Store Architecture & Conventions

- **File Location**: `@/zustand/<feature-name>.ts` (kebab-case, lowercase)
- **Store Naming**: `<FeatureName>Store` (PascalCase)
- **State Shape**: Define a clear interface (`<FeatureName>State`) before implementation.
- **Actions**: Group related actions. Use descriptive names (`setLoading`, `fetchData`, `resetState`).
- **Exports**: Export the hook as default, and the raw store/type as named exports if needed.

### 💡 Usage Notes:

- The code examples assume modern Zustand (v4+). If your project uses `immer` or `redux` devtools, adjust the middleware order accordingly.
- All paths (`@/zustand/`, `@/hooks/`) match your original structure and are ready for immediate use.

## 📘 TypeScript & Type Safety

```ts
// ✅ CORRECT: Fully typed store
interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

```ts
// ✅ CORRECT: Persistence pattern (follows @/zustand/language.ts)
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "settings-storage", // unique key per store
      // Add version & migrate if state shape changes
    },
  ),
);
```

```tsx
// ❌ WRONG: Direct mutation outside store
const state = useStore();
state.user = { id: 1, name: 'Test' };

// ❌ WRONG: Subscribing to entire store
const state = useStore();
return <div>{state.user?.name}</div>; // Triggers re-renders on ANY state change

// ❌ WRONG: Missing TypeScript types
export const useStore = create((set) => ({ ... }));

// ❌ WRONG: Hardcoded storage keys without versioning
persist((set) => ({ ... }), { name: 'my-store' })
```
