# Getting Started with E2E Testing

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install Playwright and all required dependencies.

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Run Your First Test

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests (step-by-step)
npm run test:e2e:debug
```

## Your First Test - The Scenario

Here's an example test for your scenario: "User enters email but leaves password empty"

```typescript
import { test } from '@playwright/test';
import { LoginPage } from './page-objects';

test('user cannot login with email only', async ({ page }) => {
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

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run test:e2e:headed` | Run tests with visible browser |
| `npm run test:e2e:debug` | Debug tests step-by-step |
| `npm run test:e2e:report` | View HTML test report |
| `npm run test:e2e:codegen` | Generate tests using code generator |

> **Note:** This project uses port **3000** (not the default Astro port 4321). Make sure your dev server is running on port 3000.

## Project Structure

```
e2e/
├── page-objects/              # Page Object Models
│   ├── LoginPage.ts          # Main login page POM
│   ├── components/           # Reusable component POMs
│   │   └── ErrorBannerComponent.ts
│   └── index.ts              # Central exports
│
├── examples/                 # Example test files
│   └── login.spec.ts         # Login form test examples
│
├── GETTING_STARTED.md        # This file
└── README.md                 # Detailed documentation
```

## Writing Your Own Tests

### Step 1: Create a Test File

Create a new file in `e2e/` directory with `.spec.ts` extension:

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Your test here
  });
});
```

### Step 2: Use Page Objects

Always use Page Object Models instead of direct selectors:

```typescript
// ❌ Bad - Don't do this
await page.locator('[data-test-id="login-email-input"]').fill('user@example.com');

// ✅ Good - Use POM
const loginPage = new LoginPage(page);
await loginPage.fillEmail('user@example.com');
```

### Step 3: Follow AAA Pattern

Structure your tests with Arrange, Act, Assert:

```typescript
test('descriptive test name', async ({ page }) => {
  // Arrange - Set up test preconditions
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  // Act - Perform the action being tested
  await loginPage.fillEmail('user');
  
  // Assert - Verify the expected outcome
  await loginPage.expectSubmitButtonDisabled();
});
```

## Common Patterns

### Testing Form Validation

```typescript
test('shows validation error', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  await loginPage.fillEmail('invalid-email');
  
  await loginPage.expectEmailError('Invalid email address');
});
```

### Testing Error States

```typescript
test('shows error banner on failed login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  await loginPage.login('wrong@example.com', 'wrongpass');
  
  await loginPage.errorBanner.expectVisible();
  await loginPage.errorBanner.expectTitle('Authentication Failed');
});
```

### Testing User Interactions

```typescript
test('toggles password visibility', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  await loginPage.fillPassword('secret');
  await loginPage.togglePasswordVisibility();
  
  await loginPage.expectPasswordFieldType('text');
});
```

## Debugging Tips

### 1. Use UI Mode

The easiest way to debug tests:

```bash
npm run test:e2e:ui
```

### 2. Use Debug Mode

Step through tests line by line:

```bash
npm run test:e2e:debug
```

### 3. Add Screenshots

Take screenshots at any point:

```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### 4. Use Trace Viewer

After a test fails, view the trace:

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

## Best Practices

1. **One scenario per test** - Keep tests focused
2. **Use descriptive names** - Test name should describe what it tests
3. **Avoid hardcoded waits** - Use Playwright's auto-waiting
4. **Use POM methods** - Never use direct selectors in tests
5. **Keep tests independent** - Each test should run in isolation
6. **Clean up after tests** - Use beforeEach/afterEach hooks

## Next Steps

1. Read [README.md](./README.md) for detailed API documentation
2. Check [examples/login.spec.ts](./examples/login.spec.ts) for more examples
3. Explore [Playwright documentation](https://playwright.dev)
4. Run `npm run test:e2e:codegen` to generate tests interactively

## Troubleshooting

### Tests failing with timeout?

- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Use headed mode to see what's happening

### Can't find elements?

- Verify `data-test-id` attributes in components
- Use `await page.pause()` to inspect the page
- Check element visibility with devtools

### Tests are flaky?

- Avoid hardcoded waits (`page.waitForTimeout`)
- Use proper assertions that auto-wait
- Check for race conditions

## Need Help?

- Check [Playwright Discord](https://aka.ms/playwright/discord)
- Read [Playwright Docs](https://playwright.dev)
- Review example tests in `e2e/examples/`
