# View Implementation Plan – Landing / Login

## 1. Overview
The Landing / Login view is the public entry point to PhotoSpot.  
It introduces the brand, enables users to authenticate, and routes authenticated & onboarded users directly to the main **Map** view.  
Its primary responsibility is to:

1. Display marketing hero copy and CTA links (Register, PRD).
2. Render an accessible **LoginForm** with inline validation.
3. Handle authentication via `POST /api/auth/login`, show contextual error messages and rate-limit banners.
4. Redirect the user to `/map` (or to onboarding flow) on successful login.

## 2. View Routing
| Path | Behaviour |
|------|-----------|
| `/`  | • If **unauthenticated** → render Landing / Login components.  
|      | • If **authenticated & onboarded** → **302** client-side redirect to `/map`.  
|      | • If **authenticated & _not_ onboarded** → redirect to `/onboarding/step-1`.

Route is implemented as an **Astro page** (`src/pages/index.astro`).  Redirect logic uses an **edge guard** inside `src/middleware/index.ts` (already injects `locals.supabase`).

## 3. Component Structure
```
LandingPage (index.astro)
├── NavbarPublic (React island)
├── MainHero (Astro) – brand copy + register CTA
├── LoginForm (React island)
│   ├── EmailField  (input + error)
│   ├── PasswordField (input + error + show/hide)
│   ├── SubmitButton (shadcn/ui Button)
│   └── ErrorBanner (conditional)
└── Footer (Astro)
```

## 4. Component Details
### NavbarPublic
* **Purpose:** Minimal public navigation bar; shows logo, “Register” link, external PRD link.
* **Elements:** `<header>`, logo `<a>`, `<nav><ul><li>` links.
* **Events:** Click logo → refresh `/`.  Click register → `router.push('/register')`.
* **Validation:** n/a.
* **Types:** None.
* **Props:** `{}` (self-contained).

### MainHero
* **Purpose:** Marketing hero with tagline & short feature list.
* **Elements:** `<section>` with `<h1>`, `<p>`, optional illustration.
* **Events:** n/a.
* **Validation:** n/a.
* **Types / Props:** None (static content).

### LoginForm
* **Purpose:** Authenticate the user.
* **Elements:**
  * `<form>` with two `<Input>` (email, password) from `@/components/ui/input` (shadcn).
  * `<Button>` submit.
  * ErrorBanner `<Alert>` for API errors (401, 429, 400).
* **Events:**
  * `onSubmit` → `handleSubmit` (react-hook-form) → `login()` API call.
  * `onChange` → inline validation.
* **Validation:**
  1. Email must be a valid address (regex / Zod `.email()`).
  2. Password 8–128 chars (`.min(8).max(128)`).
* **Types:**
  * `LoginCommand` (from `src/types.ts`).
  * `AuthResponse` (success).
  * `ApiError` (error wrapper).
  * `LoginViewError` (new – union of `UNAUTHORIZED | VALIDATION_ERROR | RATE_LIMIT_EXCEEDED | INTERNAL_ERROR`).
* **Props:**
  ```ts
  interface LoginFormProps {
    onSuccess?: (resp: AuthResponse) => void; // default redirects
  }
  ```

### ErrorBanner
* **Purpose:** Show rate-limit or validation banner above the form.
* **Elements:** `<Alert variant="destructive">` with icon & message.
* **Events:** Close (optional) – sets local state `hideBanner`.
* **Validation / Types / Props:**
  ```ts
  interface ErrorBannerProps {
    error: LoginViewError | null;
  }
  ```

### Footer
* **Purpose:** Public footer with copyright & social links.
* **Elements:** `<footer>` text & links.
* **Events:** n/a.
* **Props:** `{}`.

## 5. Types
```ts
// Already exist
import type { LoginCommand, AuthResponse, ApiError } from '@/types';

// New – view-internal
export type LoginViewError =
  | { code: 'UNAUTHORIZED'; message: string }
  | { code: 'VALIDATION_ERROR'; message: string; details?: Record<string, unknown> }
  | { code: 'RATE_LIMIT_EXCEEDED'; message: string }
  | { code: 'INTERNAL_ERROR'; message: string };

export interface LoginFormState {
  isSubmitting: boolean;
  error: LoginViewError | null;
}
```

## 6. State Management
* Use **React** (`island`) + **react-hook-form** for form state & input validation.
* Local component state (`useState`) handles API error banner.
* A **`useAuth`** context already exists in the codebase (assumed); else create simple context with `login()` method and `user` object.
* No global store needed – upon success, `useRouter().replace(nextRoute)`.

## 7. API Integration
* **Endpoint:** `POST /api/auth/login` (edge route).
* **Request:** `LoginCommand` JSON.
* **Response 200:** `AuthResponse` `{ user, session }`.
* **Response 400:** `ApiError.INVALID_INPUT`.
* **Response 401:** `ApiError.INVALID_CREDENTIALS`.
* **Response 429:** `ApiError.RATE_LIMIT_EXCEEDED`.
* **Response 500:** `ApiError.INTERNAL_ERROR`.

Implementation:
```ts
async function login(cmd: LoginCommand): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) {
    const error: ApiError = await res.json();
    throw error;
  }
  return (await res.json()) as AuthResponse;
}
```
Errors are mapped to `LoginViewError` inside the component.

## 8. User Interactions
| Interaction | Outcome |
|-------------|---------|
| User types email/password | Inline validation updates; submit enabled when valid |
| Click **Login** | Shows loading spinner; calls API |
| Wrong data (401) | ErrorBanner with message "Invalid email or password" |
| Validation error (400) | Inline field errors + banner if general |
| Rate-limit (429) | Sticky red banner “Too many attempts, try again later” |
| Success (200) | Save auth (via `useAuth`), redirect:  
&emsp;• If `user.user_metadata.onboarded === true` → `/map`  
&emsp;• else → `/onboarding/step-1` |

## 9. Conditions and Validation
* **Email field**: required, valid email format.
* **Password field**: required, 8-128 chars.
* **Form submit**: disabled until both fields valid & not submitting.
* **API error**: show after submit, clears on field change.
* **Accessibility**: inputs use `aria-invalid`, `aria-describedby`; ErrorBanner has `role="alert"`.

## 10. Error Handling
* **Network Fail / 500** → Toast “Unexpected error, please try again”.
* **Validation (400)** → map `details` to field errors.
* **Unauthorized (401)** → banner + focus on email field.
* **Rate-limit (429)** → sticky banner, disable submit for 1 minute (`setTimeout`).
* **Unknown** → console.error + generic banner.

## 11. Implementation Steps
1. **Routing Guard**: extend `src/middleware/index.ts` to redirect authenticated users.
2. **Page Skeleton**: create `src/pages/index.astro` using default layout.
3. **NavbarPublic & Footer**: copy from Design System (`src/components/…`) or create minimal versions.
4. **MainHero**: static Astro section with Tailwind styling.
5. **LoginForm** (React):
   1. Scaffold component in `src/components/LoginForm.tsx`.
   2. Setup `react-hook-form` with Zod resolver using `loginSchema`.
   3. Implement inline validation & disabled submit.
   4. Call `login()` helper; map errors.
   5. On success → call `onSuccess` or default redirect.
6. **ErrorBanner**: generic Alert component under `src/components/ErrorBanner.tsx`.
7. **Styling**: use Tailwind & shadcn/ui classes for cohesive UI.
8. **Accessibility**: ensure proper labels, `aria-*`, focus management.
9. **Tests** (Vitest + React Testing Library):
   * happy path redirects,
   * 401 shows banner,
   * rate-limit disables submit.
10. **QA Checklist**: keyboard nav, screen reader labels, password managers.
11. **Docs**: update `/docs/api/auth.md` and Storybook (if used).
12. **Review & Merge** via PR.

