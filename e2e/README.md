# E2E Testing with Playwright

This directory contains end-to-end tests using Playwright and the Page Object Model (POM) pattern.

## Structure

```
e2e/
├── page-objects/           # Page Object Models
│   ├── LoginPage.ts       # Login page POM
│   ├── components/        # Reusable component POMs
│   │   └── ErrorBannerComponent.ts
│   └── index.ts           # Central export
├── examples/              # Example test files
│   └── login.spec.ts      # Login form tests
└── README.md              # This file
```

## Page Object Model (POM)

The Page Object Model is a design pattern that creates an object repository for web UI elements. Each page or component is represented by a class that encapsulates:

- **Locators**: All selectors using `data-test-id` attributes
- **Actions**: Methods to interact with elements (click, fill, etc.)
- **Assertions**: Methods to verify element states and content

### Benefits

- **Maintainability**: Changes to UI only require updates in one place
- **Readability**: Tests read like user actions, not technical steps
- **Reusability**: Common actions can be shared across tests
- **Type Safety**: TypeScript provides autocomplete and type checking

## Using Page Objects

### Basic Usage

```typescript
import { test } from '@playwright/test';
import { LoginPage } from './page-objects';

test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  // Navigate to page
  await loginPage.goto();
  
  // Perform actions
  await loginPage.login('user@example.com', 'password123');
  
  // Make assertions
  await loginPage.expectSubmitButtonEnabled();
});
```

### Working with Components

```typescript
import { test } from '@playwright/test';
import { LoginPage } from './page-objects';

test('error banner shows on invalid login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('wrong@example.com', 'wrongpass');
  
  // Access nested component
  await loginPage.errorBanner.expectVisible();
  await loginPage.errorBanner.expectTitle('Authentication Failed');
});
```

## LoginPage API

### Navigation

- `goto()` - Navigate to the login page
- `waitForPageLoad()` - Wait for form to be visible

### Form Actions

- `fillEmail(email: string)` - Fill email field
- `fillPassword(password: string)` - Fill password field
- `togglePasswordVisibility()` - Toggle show/hide password
- `clickSubmit()` - Click submit button
- `clickRegisterLink()` - Navigate to register page

### Compound Actions

- `login(email: string, password: string)` - Complete login flow
- `attemptLoginWithEmailOnly(email: string)` - Fill only email and submit
- `attemptLoginWithPasswordOnly(password: string)` - Fill only password and submit
- `clearForm()` - Clear all form fields

### Validation Assertions

- `expectEmailError(text: string)` - Assert email error message
- `expectPasswordError(text: string)` - Assert password error message
- `isEmailErrorVisible()` - Check if email error is shown
- `isPasswordErrorVisible()` - Check if password error is shown

### Button State Assertions

- `expectSubmitButtonEnabled()` - Assert button is enabled
- `expectSubmitButtonDisabled()` - Assert button is disabled
- `isSubmitting()` - Check if form is submitting

### Form State

- `getEmailValue()` - Get current email value
- `getPasswordValue()` - Get current password value
- `isPasswordVisible()` - Check if password is unmasked
- `expectPasswordFieldType(type)` - Assert password field type

## ErrorBannerComponent API

### Visibility

- `isVisible()` - Check if banner is visible
- `isHidden()` - Check if banner is hidden
- `expectVisible()` - Assert banner is visible
- `expectHidden()` - Assert banner is hidden

### Content

- `getTitleText()` - Get banner title
- `getMessageText()` - Get banner message
- `expectTitle(text: string)` - Assert banner title
- `expectMessage(text: string)` - Assert banner message
- `expectError(type: string, message: string)` - Assert complete error

### Waiting

- `waitForVisible(timeout?)` - Wait for banner to appear
- `waitForHidden(timeout?)` - Wait for banner to disappear

## Test Scenarios

### Example: Your Scenario

```typescript
test('login validation - email without password', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  // Act
  await loginPage.fillEmail('user');
  // Password field remains empty
  
  // Assert
  await loginPage.expectSubmitButtonDisabled();
  await loginPage.expectPasswordError('Password is required');
});
```

## Best Practices

1. **Use descriptive method names** that express intent, not implementation
2. **Keep tests focused** - one scenario per test
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Use compound methods** for common flows (like `login()`)
5. **Make assertions explicit** - use expect methods from POM
6. **Avoid direct locators in tests** - always use POM methods

## Adding New Page Objects

When creating new POMs:

1. Create a new file in `page-objects/`
2. Follow the naming convention: `[PageName]Page.ts`
3. Include all locators as private properties
4. Provide public methods for actions and assertions
5. Export from `page-objects/index.ts`
6. Add documentation comments for all public methods

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/examples/login.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
