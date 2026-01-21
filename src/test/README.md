# Testing Documentation

This directory contains test utilities, mocks, and documentation for the PhotoSpot test suite.

## Overview

The project uses **Vitest** as the testing framework, chosen for its:

- Native ESM support
- Fast execution with smart watch mode
- TypeScript support out of the box
- Compatibility with Astro projects
- Jest-compatible API

## Running Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI/production)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Test Files Location

All test files follow the pattern `*.test.ts` or `*.spec.ts` and are located next to the files they test:

```
src/
├── lib/
│   ├── validators/
│   │   ├── auth.ts
│   │   └── auth.test.ts          # Tests for validators
│   └── services/
│       ├── auth.ts
│       └── auth.test.ts          # Tests for services
├── pages/
│   └── api/
│       └── auth/
│           ├── register.ts
│           └── register.test.ts  # Integration tests for API endpoints
└── test/
    ├── setup.ts                  # Global test setup
    ├── mocks/                    # Mock implementations
    │   └── supabase.ts          # Supabase client mocks
    └── README.md                 # This file
```

## Test Categories

### 1. Validator Tests (`src/lib/validators/*.test.ts`)

Tests for Zod validation schemas that ensure input data integrity.

**Coverage:**

- Valid input scenarios
- Invalid input scenarios (email, password, role)
- Edge cases (missing fields, empty strings, special characters)
- Error message accuracy

**Example:**

```typescript
it("should validate correct registration data", () => {
  const input = {
    email: "test@example.com",
    password: "password123",
    role: "photographer",
  };
  const result = registerUserSchema.safeParse(input);
  expect(result.success).toBe(true);
});
```

### 2. Service Layer Tests (`src/lib/services/*.test.ts`)

Tests for business logic and Supabase integration with mocked dependencies.

**Coverage:**

- Successful operations
- Error handling for all Supabase error types
- Data transformation and mapping
- Edge cases and unexpected errors

**Example:**

```typescript
it("should register a photographer successfully", async () => {
  const mockClient = createMockSupabaseClient();
  const result = await registerUser(validPayload, mockClient);

  expect(result.user.email).toBe("test@example.com");
  expect(result.session.access_token).toBeDefined();
});
```

### 3. API Endpoint Tests (`src/pages/api/**/*.test.ts`)

Integration tests for API routes that test the complete request-response cycle.

**Coverage:**

- Successful requests with various input formats
- Validation error responses (400)
- Authentication error responses (401, 409, 429)
- Server error responses (500)
- Edge cases (malformed JSON, special characters)

**Example:**

```typescript
it("should register a user and return 200", async () => {
  const context = createMockContext(
    {
      email: "test@example.com",
      password: "password123",
      role: "photographer",
    },
    mockClient
  );

  const response = await POST(context);
  expect(response.status).toBe(200);
});
```

## Test Utilities

### Mock Supabase Client (`src/test/mocks/supabase.ts`)

Provides test doubles for Supabase operations:

```typescript
// Create a mock client with default successful responses
const mockClient = createMockSupabaseClient();

// Create a mock client with custom error response
const mockClient = createMockSupabaseClient({
  signUpResponse: createMockErrorResponse({
    message: "Email already registered",
    code: "user_already_exists",
    status: 409,
  }),
});

// Use predefined error responses
const mockClient = createMockSupabaseClient({
  signUpResponse: createMockErrorResponse(mockSupabaseErrors.userAlreadyExists),
});
```

### Available Mock Errors

- `userAlreadyExists` - 409 error for duplicate email
- `invalidEmail` - 400 error for invalid email format
- `weakPassword` - 400 error for weak password
- `invalidCredentials` - 401 error for login failure
- `rateLimitExceeded` - 429 error for rate limiting
- `genericError` - 500 error for unexpected issues

## Test Coverage Goals

We aim for the following coverage targets:

- **Validators:** 100% (pure functions, easy to test)
- **Services:** 90%+ (business logic with mocked dependencies)
- **API Endpoints:** 85%+ (integration tests with realistic scenarios)
- **Overall:** 85%+

## Writing New Tests

### Best Practices

1. **Follow the AAA Pattern:**

   ```typescript
   it('should do something', () => {
     // Arrange: Set up test data
     const input = { ... };

     // Act: Execute the code under test
     const result = functionUnderTest(input);

     // Assert: Verify the results
     expect(result).toBe(expected);
   });
   ```

2. **Use Descriptive Test Names:**
   - ✅ `should return 409 when email already exists`
   - ❌ `test registration error`

3. **Test One Thing Per Test:**
   - Each test should verify a single behavior
   - Makes failures easier to diagnose

4. **Use `describe` Blocks for Organization:**

   ```typescript
   describe('registerUser', () => {
     describe('successful registration', () => {
       it('should register a photographer', ...);
       it('should register an enthusiast', ...);
     });

     describe('error handling', () => {
       it('should throw 409 for duplicate email', ...);
     });
   });
   ```

5. **Clean Up After Tests:**

   ```typescript
   beforeEach(() => {
     vi.clearAllMocks(); // Reset mocks before each test
   });
   ```

6. **Test Error Scenarios:**
   - Always test both success and failure paths
   - Verify error messages and status codes
   - Test edge cases and boundary conditions

### Adding Tests for New Features

1. Create a test file next to the implementation file
2. Import necessary testing utilities and mocks
3. Write tests covering:
   - Happy path (successful operation)
   - Validation errors
   - Business logic errors
   - Edge cases
4. Run tests and ensure they pass
5. Check coverage and add tests for uncovered branches

## Continuous Integration

Tests run automatically on:

- Pre-commit (via husky + lint-staged)
- Pull requests
- Before deployment

## Troubleshooting

### Common Issues

**Issue:** Tests fail with "Cannot find module"
**Solution:** Check import paths and ensure TypeScript aliases are configured in `vitest.config.ts`

**Issue:** Supabase mock not working
**Solution:** Ensure you're using `createMockSupabaseClient()` and passing it via `locals.supabase`

**Issue:** Tests timeout
**Solution:** Check for unresolved promises or missing `await` keywords

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Zod Documentation](https://zod.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
