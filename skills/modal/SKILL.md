---
name: modal
description: Guidelines for managing modals and drawers using the standardized MyModal component and useModal hook.
---

# Modal Skill

This skill defines the standardized approach for managing modals (and drawers on mobile) within the application. It leverages a global state management system (Zustand) to decouple modal logic from structural hierarchy.

## Core Directives

- **Primary Hook**: Always use the `useModal` hook to interact with modals.
- **Global Component**: Modals are rendered by the `MyModal` component, which is typically placed at the application root. You should **not** manually include `MyModal` or `HeroUI` Modal components in your page/component.
- **No Direct Imports**: Never import modal-related components from `@heroui/react` directly in your business logic.
- **Mobile First**: The `useModal` hook automatically switches between a `Modal` (desktop) and a `Drawer` (mobile) based on the screen size.

## Implementation Pattern

### 1. Initialize the Hook
Import and initialize `useModal` in your component.

```typescript
import useModal from '@/hooks/useModal'

const MyComponent = () => {
  const { openModal, closeModal } = useModal()
  // ...
}
```

### 2. Opening a Modal
Call `openModal` with a configuration object containing a `title` and `children`.

```typescript
const handleOpen = () => {
  openModal({
    title: translate('common.edit'),
    children: (
      <MyForm 
        onSuccess={() => {
          closeModal()
          refetch()
        }} 
      />
    ),
  })
}
```

### 3. Closing a Modal
Use `closeModal` to close the currently active modal from within the parent component or pass it as a prop to the children.

```typescript
<MyButton onClick={() => closeModal()}>
  {translate('common.cancel')}
</MyButton>
```

## Example Usage (Reference)

Following the pattern in `app/(auth)/accounts/page.tsx`:

```tsx
'use client'

import React from 'react'
import useModal from '@/hooks/useModal'
import AccountForm from './Component/AccountForm'

const AccountsPage = () => {
  const { openModal, closeModal } = useModal()
  const { translate } = useLanguage()

  const handleEdit = (account) => {
    openModal({
      title: translate('accounts.editAccount'),
      children: (
        <AccountForm 
          account={account} 
          onSuccess={closeModal} // Pass closeModal to child for auto-close
        />
      ),
    })
  }

  return (
    <MyButton onClick={() => handleEdit(item)}>
      {translate('common.edit')}
    </MyButton>
  )
}
```

## Best Practices

1. **State Injection**: Pass necessary callbacks (like `closeModal` or `refetch`) into the modal's children as props.
2. **Translation**: Always use `translate()` for the modal title to support internationalization.
3. **Consistency**: Use the central logic provided by `useModal` to ensure consistent behavior across desktop and mobile.
4. **Clean Code**: Keep the page clean by not cluttering it with many `<Modal>` declarations.
