# View Implementation Plan – Onboarding & Optional Profile Setup

## 1. Overview
The Onboarding view is a short, three-step wizard shown immediately after registration or first login. It introduces the core features of PhotoSpot and (optionally) lets the user create their public profile before landing on the main map. The flow must:
• Work on mobile & desktop (responsive).  
• Allow skipping at any time.  
• Persist "onboardingCompleted" flag so returning users go directly to the map.

Steps:
1. Welcome & Role confirmation  
2. Quick feature tour  
3. (a) For all users – final screen with “Let’s Go” OR  
   (b) If the user has **no profile yet** – embedded _Profile Setup Form_ for basic data.

## 2. View Routing
* Path: `/onboarding`  
* Guarded Route:  
  * If `!session` → redirect to `/login`.  
  * If `user_metadata.onboardingCompleted === true` → redirect to `/` (map).  
  * Otherwise render `<Onboarding />`.

## 3. Component Structure
```
OnboardingPage (route)
 ├─ OnboardingCarousel         // swipe / buttons navigation
 │   ├─ OnboardingSlide (x3)
 │   └─ CarouselDots
 ├─ SkipButton                 // fixed top-right
 └─ ConditionalFooter          // Next / Finish / ProfileSubmit
      └─ ProfileSetupForm (optional in step 3)
          ├─ AvatarPicker
          ├─ TextInput(display_name)
          ├─ TextArea(bio)
          ├─ PhotographerFields (role === photographer)
          │     ├─ TextInput(company_name)
          │     ├─ UrlInput(website_url)
          │     └─ SocialLinksRepeater
          └─ SubmitButton
```

## 4. Component Details
### 4.1. `OnboardingPage`
* **Purpose**: Top-level page; handles auth guard, fetches user session & role, tracks wizard state, persists completion.
* **Main elements**: `<OnboardingCarousel />`, global skip button.
* **Handled interactions**: Skip → set flag & redirect; Finish/ProfileSubmit success → set flag & redirect.
* **Validation**: none (delegated).
* **Types**: `OnboardingStep` enum, `Session` (from Supabase), `UserRole`.
* **Props**: none (route component).

### 4.2. `OnboardingCarousel`
* **Purpose**: Horizontally scrollable container for slides; maintains `currentStep`.
* **Elements**: `div` with `overflow-x-hidden`, transforms; children `OnboardingSlide`, `CarouselDots`.
* **Interactions**: `Next` / swipe gestures update `currentStep` via context.
* **Validation**: step bounds (0–2/3).
* **Types**: `{ currentStep: number; next(): void; prev(): void }` context value.
* **Props**: `children` slides.

### 4.3. `OnboardingSlide`
* **Purpose**: Present content (image + text). No logic.
* **Elements**: Illustration, heading, paragraph.
* **Interactions**: none.
* **Props**: `title: string`, `description: string`, `illustration: ReactNode`.

### 4.4. `CarouselDots`
* **Purpose**: Visual indicator of progress; click to jump.
* **Interactions**: `onClick(index)` sets step.
* **Props**: `activeIndex: number`, `count: number`.

### 4.5. `SkipButton`
* **Purpose**: Allows user to leave onboarding early.
* **Elements**: Shadcn `<Button variant="ghost" size="sm">Skip</Button>` fixed absolute.
* **Interactions**: `onClick` triggers `handleComplete()`.

### 4.6. `ConditionalFooter`
* **Purpose**: Bottom area changing per step.  
  * Steps 0-1: `NextButton`.  
  * Step 2: if profile exists → `FinishButton`; else renders `ProfileSetupForm`.
* **Props**: `step: number`, `isProfileMissing: boolean`, `onFinish()`.

### 4.7. `ProfileSetupForm`
* **Purpose**: Minimal form to create user profile using POST `/api/users/:id/profile`.
* **Main elements**:
  * `AvatarPicker` – optional file/url input.
  * `Input` display_name (required).
  * `Textarea` bio (optional, 500 max).
  * `PhotographerFields` (shown if role === 'photographer'):
    * company_name (100 max)
    * website_url (url)
    * `SocialLinksRepeater` – dynamic list of { label, url }.
* **Handled events**: `onSubmit`, input `onChange`.
* **Validation** (frontend mirror of Zod):
  * Required: display_name 1-100 chars.
  * URL fields: valid `https?://`.
  * Photographer-only fields blocked for enthusiasts.
* **Types**:
  * `ProfileFormValues` (see §5)
  * `ApiCreateProfileRequest`, `ApiCreateProfileResponse`.
* **Props**: `{ userId: string; role: UserRole; onSuccess(): void }`.

### 4.8. `AvatarPicker`
* **Purpose**: Upload avatar to Supabase Storage or accept external URL.
* **Interactions**: Handles file selection, calls `supabase.storage.from('avatars').upload()` then returns public URL.
* **Validation**: ≤5 MB, image extensions.
* **Props**: `{ value?: string; onChange(url: string): void }`.

### 4.9. `PhotographerFields`
* Conditionally rendered; internal validation same as backend.

## 5. Types
```typescript
// View-only
export type OnboardingStep = 0 | 1 | 2;

export interface ProfileFormValues {
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  company_name?: string | null;      // photographer only
  website_url?: string | null;       // photographer only
  social_links?: Record<string, string> | null; // photographer only
}

// API DTOs (mirror backend src/types.ts but scoped locally for hook)
export type ApiCreateProfileRequest = ProfileFormValues;

export interface ApiCreateProfileResponse {
  message: string;
  profile: UserProfileDto; // imported from shared `src/types.ts`
}
```

## 6. State Management
* **Local component state** via React hooks:  
  * `currentStep` (Carousel context).  
  * `formValues` (useForm hook from React Hook Form + Zod resolver).  
  * `loading` & `error` for API call.
* **Cross-session**: After successful finish or skip, set `onboardingCompleted` in `supabase.auth.updateUser({ data: { onboardingCompleted: true } })`.

Custom Hooks:
* `useOnboarding()` – encapsulates step navigation & completion logic.
* `useCreateProfile()` – wraps fetch POST call with optimistic state & error handling.

## 7. API Integration
* **Endpoint**: `POST /api/users/:userId/profile` (see §endpoint description).  
* **Hook**:
```typescript
const { mutateAsync, isLoading, error } = useMutation(
  (payload: ApiCreateProfileRequest) =>
    fetch(`/api/users/${userId}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()),
  { onSuccess: onSuccessCb }
);
```
* **Request Type**: `ApiCreateProfileRequest`  
* **Success Handling**: store profile in global cache (e.g. React Query), call `onSuccess`, mark onboarding complete.
* **Error Mapping**: 400 → show field errors; 409 → treat as success (profile exists) then finish; 401/403 → force logout.

## 8. User Interactions
1. Swipe / `Next` → advances slide.  
2. Click `Skip` → sets flag, redirect `/`.  
3. Submit Profile form → calls API, shows spinner; on success redirect `/`.  
4. Validation errors inline under fields.  
5. Upload avatar → preview thumbnail.

## 9. Conditions & Validation
| Condition | Component | UX Response |
|-----------|-----------|-------------|
| display_name empty | ProfileSetupForm | Disable Submit & show “Required.” |
| URL invalid | ProfileSetupForm | Field error “Invalid URL.” |
| Photographer fields visible only if role === photographer | PhotographerFields | Inputs hidden/disabled for enthusiasts |
| API 409 (profile exists) | useCreateProfile | Treat as success, proceed |
| currentStep > max | OnboardingCarousel | Clamp to last step |

## 10. Error Handling
* **Network / 5xx**: Toast “Something went wrong, please try again later.” Keep user on form.
* **401 / 403**: Logout & redirect `/login` with flash message.
* **Validation (400)**: Map `error.details.issues` to form fields.
* **Avatar upload fail**: Show inline error, allow retry or continue without avatar.

## 11. Implementation Steps
1. **Scaffold Route** `/src/pages/onboarding.tsx` (client-side only).  
2. Build **OnboardingCarousel** with swipe + buttons.  
3. Design slides content (illustrations in `/src/assets/onboarding/`).  
4. Implement **useOnboarding** context/provider.  
5. Create **ProfileSetupForm** using React Hook Form + Zod schema reused from backend.  
6. Add **AvatarPicker** with Supabase Storage upload helper.  
7. Implement **useCreateProfile** hook with React Query.  
8. Wire ConditionalFooter logic.  
9. Persist `onboardingCompleted` via `supabase.auth.updateUser`.  
10. Add Route Guard in middleware or layout to redirect completed users.  
11. Write **Jest/Vitest** tests for hooks & form validation.  
12. Run `npm run lint && npm run test`.

