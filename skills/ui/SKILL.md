# 📘 UI Development System

> **Skill Tag**: `ui` | **Version**: 3.0 | **Dependencies**: `language` skill for all text content | **Framework**: React + TypeScript + Tailwind CSS + HeroUI

---

## 1. Core Principles

- **Consistency first**: UI must look and behave uniform across the app
- **Reusable over duplicate**: Always reuse existing components
- **Separation of concerns**: UI ≠ business logic
- **Mobile-first design**
- **Premium & modern aesthetic**

## 1.1. Language Integration (MANDATORY)

All UI text MUST be retrieved using the `language` skill:

```tsx
import { useLanguage } from "@/hooks/useLanguage";

const { t } = useLanguage();

// ✅ CORRECT
<MyButton>{t('common.submit')}</MyButton>

// ❌ WRONG
<MyButton>Submit</MyButton>
```

See `language` skill for detailed rules.

---

## 2. Component Prioritization

Always follow this priority order:

1. **Local Components (REQUIRED FIRST)**
   - Located in `@/components/`
   - Examples:
     - `MyButton`
     - `MyInput`
     - `MyDropDown`
     - `MyModal`
     - `MyImage`
     - `MyCheckbox`
     - `...`

2. **Third-party Components (`@heroui/react`)**
   - Only allowed when:
     - No equivalent local component exists
     - Component is complex (e.g., DatePicker, Table)

   - If reused more than **2 times → MUST wrap into local component**

✅ Example:

```tsx
// ✅ DO
import MyButton from "@/components/MyButton";

// ❌ DON'T
import { Button } from "@heroui/react";
```

---

## 3. Import Mapping

| Element  | Local Component | Path                    |
| -------- | --------------- | ----------------------- |
| Button   | MyButton        | @/components/MyButton   |
| Input    | MyInput         | @/components/MyInput    |
| Dropdown | MyDropDown      | @/components/MyDropDown |
| Modal    | MyModal         | @/components/MyModal    |
| Image    | MyImage         | @/components/MyImage    |
| Checkbox | MyCheckbox      | @/components/MyCheckbox |

---

## 4. ClassName Handling (MANDATORY)

All conditional class names MUST use `cn` utility.

📍 Path: `@/utils/tailwind`

```tsx
import { cn } from "@/utils/tailwind";

<div
  className={cn(
    "base-class",
    isActive && "active-class",
    disabled ? "opacity-50" : "hover:opacity-80",
  )}
/>;
```

🚫 DO NOT:

- Use string concatenation
- Use inline ternary inside className without `cn`

---

## 5. Component Design Rules

All components MUST:

- Accept `className` and merge via `cn`
- Be reusable and generic
- Avoid business logic inside UI
- Support common states:
  - `disabled`
  - `loading`
  - `error` (if applicable)

---

## 6. State & Form Handling

- Prefer **controlled components**
- Do NOT handle validation logic inside UI components
- Keep logic in:
  - hooks
  - services
  - parent components

```tsx
// ✅ GOOD
<MyInput value={value} onChange={setValue} />

// ❌ BAD
<MyInput internallyHandlesState />
```

---

## 7. UI States (REQUIRED)

Every page/component MUST handle:

- Loading state
- Empty state
- Error state

```tsx
if (loading) return <Skeleton />;
if (!data) return <Empty />;
if (error) return <Error />;
```

---

## 8. Responsive Design (MANDATORY)

- **Requirement**: EVERY page and complex component MUST explicitly support both Desktop and Mobile views.
- **Approach**: Always use **mobile-first approach** for Tailwind utility classes.
- **Detection**: Use the `useMedia` hook for structural differences (e.g., Table vs Card layout).
- **Tailwind Breakpoints**:
  - `sm` (≥640px)
  - `md` (≥768px)
  - `lg` (≥1024px)
  - `xl` (≥1280px)

✅ Example (Styling):
```tsx
<div className="text-sm md:text-base lg:text-lg" />
```

✅ Example (Structural):
```tsx
const { isMobile } = useMedia()
return isMobile ? <MobileView /> : <DesktopView />
```

🚫 Avoid:
- Fixed widths (`w-[500px]`) unless absolutely necessary.
- Ignoring mobile layouts for admin or dashboard pages.
---

## 9. Design System (Premium UI Rules)

### Spacing

- Use consistent scale: `4, 8, 12, 16, 24, 32`

### Border Radius

- Prefer: `rounded-xl`, `rounded-2xl`

### Colors

- Limit color palette
- Avoid random colors
- Use semantic colors:
  - primary
  - secondary
  - danger
  - muted

### Shadows

- Use soft shadows:
  - `shadow-md`
  - `shadow-lg`

- Avoid harsh shadows

### Visual Feel

- Clean
- Soft
- Slight gradients allowed
- Avoid clutter

---

## 10. Folder Structure

```
/components
  /ui          → reusable base components
  /features    → feature-specific components

/pages
/hooks
/services
/utils
```

---

## 11. Code Quality Rules

- No inline styles unless necessary
- No duplicated UI logic
- Keep components small and focused
- Split large components when needed

---

## 12. When to Create New Component

Create a new component when:

- UI is reused ≥ 2 times
- Component becomes too large (>150 lines)
- Logic can be isolated

---

## 13. Performance Best Practices

- Avoid unnecessary re-renders
- Use `React.memo` when needed
- Lazy load heavy components

---

## 14. Example Component Standard

```tsx
import { cn } from "@/utils/tailwind";

type Props = {
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
};

export default function MyButton({ className, children, disabled }: Props) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl transition",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}
```

---

## 15. Dual-UI Pattern (MANDATORY)

For components displaying structured data (like tables or lists), you MUST implement two distinct rendering methods to ensure a premium experience on all devices.

### 🏛 Structural Rules

1. **Desktop View**: Use `MyTable`, complex grids, or multi-column layouts. Maximize screen real estate for efficiency.
2. **Mobile View**: Use **Card-based layouts**, expanded list items, or touch-friendly tiles. Avoid horizontal scrolling for primary data.

### 🛠 Implementation Template

```tsx
import useMedia from '@/hooks/useMedia'

const MyFeatureComponent = ({ data }) => {
  const { isMobile } = useMedia()

  const renderDesktop = () => (
    <MyTable data={data} columns={...} />
  )

  const renderMobile = () => (
    <div className="flex flex-col gap-4">
      {data.map(item => (
        <div key={item.id} className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
           {/* Mobile-optimized card content */}
        </div>
      ))}
    </div>
  )

  return (
    <section>
      {isMobile ? renderMobile() : renderDesktop()}
    </section>
  )
}
```

---

## ✅ Final Notes

- Always check `components/` before creating new UI.
- EVERY feature must be tested on both mobile and desktop resolutions.
- Keep UI clean, consistent, and scalable.
- Prioritize user experience and visual quality above all else.

---
