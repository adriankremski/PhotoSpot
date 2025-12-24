# View Implementation Plan – Register

## 1. Overview
The **Register** view enables a new visitor to create a PhotoSpot account with an e-mail, password and selected user role (Photographer or Enthusiast). A successful registration authenticates the user, stores the session returned by Supabase, and automatically redirects to the onboarding flow.

## 2. View Routing
* **Route path:** `/register`
* **File:** `src/pages/register.astro`
* **Guards:** Accessible only to unauthenticated visitors (redirect authenticated users to `/`).

## 3. Component Structure
```
RegisterPage (Astro page)
└── <RegisterForm /> (React)
    ├── <Input name="email" />
    ├── <PasswordInput name="password" />
    │     └── <PasswordRulesTooltip />
    ├── <RoleSelector />
    │     ├── <Radio value="photographer" />
    │     └── <Radio value="enthusiast" />
    ├── <ErrorBanner />
    └── <Button type="submit" />
```

## 4. Component Details
### RegisterForm
* **Purpose:** Collects credentials & role, performs validation, triggers registration.
* **Main elements:**
  * `Input` – e-mail
  * `PasswordInput` – password + visibility toggle ⚙️
  * `PasswordRulesTooltip` (hover / focus)
  * `RoleSelector` – two radio cards with icons
  * `Button` – submit, full-width, loading state
  * `ErrorBanner` – API/server errors
* **Handled interactions:** form field changes, tooltip show/hide, submit, keyboard `Enter`.
* **Validation:**
  1. E-mail – required, RFC5322 valid (`z.string().email()`)
  2. Password – required, ≥8 characters, at least 1 letter + 1 number (regex: `/^(?=.*[A-Za-z])(?=.*\d).{8,}$/`)
  3. Role – required, `photographer | enthusiast`
* **Types:** `RegisterFormValues`, `RegisterFormErrors`, `RegisterViewModel` (see §5)
* **Props:** none (self-contained)

### RoleSelector
* **Purpose:** Visually selectable role options.
* **Main elements:** `Card` components acting as radio buttons, each with icon + label.
* **Handled interactions:** click/select, keyboard arrow keys.
* **Validation:** required selection (propagated by parent).
* **Types:** `UserRole` (from `src/types.ts`)
* **Props:**
  * `value: UserRole | null`
  * `onChange(role: UserRole)`

### PasswordRulesTooltip
* **Purpose:** Displays password constraints on hover/focus of password field.
* **Main elements:** `Tooltip` component (shadcn/ui popover)
* **Handled interactions:** hover, focus
* **Validation:** none – informational only.
* **Types:** none
* **Props:** none (positioned by parent)

### ErrorBanner (already exists)
* Reused to surface client/API errors (400 / 409 / network).

## 5. Types
```ts
// Registration form internal state
export interface RegisterFormValues {
  email: string;
  password: string;
  role: UserRole | null;
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
  role?: string;
  form?: string; // API-level error summary
}

// Hook return value
export interface RegisterViewModel {
  values: RegisterFormValues;
  errors: RegisterFormErrors;
  loading: boolean;
  registered: boolean;
  handleChange: (field: keyof RegisterFormValues, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}
```
> DTOs `RegisterUserCommand` and `AuthResponse` already exist in `src/types.ts` and should be imported.

## 6. State Management
* **React Hook:** `useRegisterUser()` placed in `src/components/auth/useRegisterUser.ts`.
* **Responsibilities:**
  * Hold `values`, `errors`, `loading`, `registered` flags.
  * Provide `handleChange` & `handleSubmit`.
  * Run Zod validation on submit.
  * Call API (see §7) and map errors to `errors.form` or field-specific.
  * On success → store session via `supabase.auth.setSession()` and redirect (`navigate('/onboarding')`).
* **Global State:** None required; session is persisted by Supabase client.

## 7. API Integration
* **Endpoint:** `POST /api/auth/register`
* **Request body:** `RegisterUserCommand`
* **Success (200):** `AuthResponse` → store session via Supabase client.
* **Error mapping:**
  * `400` – map `error.details` if present to field errors, else generic.
  * `409` – set `errors.form = 'Email already registered'`.
* **Implementation:** Use `fetch()` with `json` headers (or wrapper `apiClient.post`).

## 8. User Interactions
| Interaction | Outcome |
|-------------|---------|
| Type in e-mail | State updated, inline validation on blur |
| Type in password | Ditto |
| Hover info icon | Tooltip shows password rules |
| Select role card | Role selected (radio behaviour) |
| Click **Register** / press **Enter** | Validation → API call → loading spinner |
| Success | Redirect to `/onboarding` |
| 400 validation error | Field error messages displayed |
| 409 conflict | ErrorBanner with duplicate e-mail message |
| Network error | ErrorBanner “Unable to connect, try again” |

## 9. Conditions and Validation
| Condition | Component | Handling |
|-----------|-----------|----------|
| Valid e-mail format | `RegisterForm` | Zod, `errors.email` |
| Password ≥8 chars, 1 letter + 1 number | `RegisterForm` | Zod, `errors.password` |
| Role selected | `RoleSelector` | `errors.role` |
| API returns 400/409 | `RegisterForm` → `ErrorBanner` | Show summary |

## 10. Error Handling
1. **Client validation errors** – displayed inline next to fields.
2. **API 400** – parse `details`; if password weak, highlight password field.
3. **API 409** – show banner with “Email already registered”; focus e-mail input.
4. **Network/fetch failure** – show banner, retry option.
5. **Unexpected 500** – generic banner + log to Sentry.

## 11. Implementation Steps
1. **Routing guard** – Update `src/middleware/index.ts` to redirect authenticated users away from `/register`.
2. **Create page file** `src/pages/register.astro` importing `<RegisterForm />` and wrapping in public layout.
3. **Add Zod schema** `registerUserSchema` to `src/lib/validators/auth.ts` (if not already).
4. **Implement `useRegisterUser` hook** with state, validation, API call, redirect.
5. **Build `RoleSelector` component** with accessible radio cards.
6. **Build `PasswordInput` with `PasswordRulesTooltip`** using shadcn/ui `input` and `hoverCard`.
7. **Assemble `RegisterForm`** using shadcn/ui primitives; wire to hook.
8. **Display `ErrorBanner`** on `errors.form`.
9. **Write unit tests** (Vitest + React Testing Lib):
   * validation rejects invalid inputs
   * hook sets loading & redirects on success
   * 409 conflict renders banner
10. **Add e2e test** (Playwright) covering happy path registration.
11. **Run ESLint & TypeScript** – ensure code quality.
12. **Update documentation** – add `/register` to README routes table.

