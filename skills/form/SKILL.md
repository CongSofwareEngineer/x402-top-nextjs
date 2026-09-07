---
name: form
description: Guidelines for building forms using the standardized MyForm and InputForm components, with integrated validation and state management.
---

# Form Skill

This skill defines the standardized approach for creating and managing forms within the application, following the pattern established in the login page.

## Core Directives

- **Component Usage**: Always use `MyForm` as the wrapper and `InputForm` (or specialized inputs like `InputArea`, `InputNumber`) for fields.
- **State Management**: Always use two separate states for form data and form errors:
  ```typescript
  const [form, setForm] = useState<Form>({});
  const [formError, setFormError] = useState<Form>({});
  ```
- **Validation**: Use the `useCheckForm` hook for validation logic.
- **Change Handling**: Use a centralized `onChangeForm` function that performs validation checks as the user types and updates the `formError` state.

## Implementation Pattern

### 1. Define the Form Type

Always define a TypeScript type for the form fields.

```typescript
type Form = {
  phone?: string;
  password?: string;
  // add other fields as needed
};
```

### 2. Initialize Hooks and State

```typescript
const [form, setForm] = useState<Form>({});
const [formError, setFormError] = useState<Form>({});

const { checkIsNumber, checkEmail, checkPassword } = useCheckForm();
```

### 3. Implement `onChangeForm`

The `onChangeForm` function should update the form state and validate the specific field being changed.

```typescript
const onChangeForm = (data: Form) => {
  // Validate specific fields when they change
  if (typeof data.phone !== "undefined") {
    const errorPhone = checkIsNumber(data.phone);
    setFormError({ ...formError, phone: errorPhone });
  }

  // Update cumulative form state
  setForm({ ...form, ...data });
};
```

### 4. Build the UI

Wrap your inputs in `MyForm` and use `InputForm` for the fields.

```tsx
import MyForm from "@/components/MyForm";
import InputForm from "@/components/MyForm/Input";

// ... inside component return
<MyForm
  className="w-full flex flex-col gap-3 max-w-md p-8"
  onSubmit={handleLogin}
>
  <InputForm
    label={translate("register.phone")}
    placeholder={translate("placeholder.enterNumberPhone")}
    isRequired
    validate={checkIsNumber}
    errorMessage={() => formError.phone} // Pass the validation function
    onChange={(e) => onChangeForm({ phone: e })}
  />

  <InputForm
    label={translate("login.password")}
    placeholder={translate("placeholder.enterPassWord")}
    isRequired
    type="password"
    onChange={(e) => onChangeForm({ password: e })}
  />

  <MyButton type="submit" isLoading={isLoading}>
    {translate("login.login")}
  </MyButton>
</MyForm>;
```

## Best Practices

1. **Import Paths**:
   - `MyForm`: `@/components/MyForm`
   - `InputForm`: `@/components/MyForm/Input`
   - `useCheckForm`: `@/hooks/useCheckForm`
2. **State Names**: Stick to `form`, `setForm`, `formError`, `setFormError`, and `onChangeForm` for consistency.
3. **Immediate Validation**: Always perform validation inside `onChangeForm` to provide real-time updates to `formError`.
4. **Form Wrapper**: Use `MyForm`'s `onSubmit` prop to handle the final form submission logic.
