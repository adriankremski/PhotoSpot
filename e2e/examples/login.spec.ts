/**
 * Example E2E tests for Login Page using Page Object Model
 * This file demonstrates how to use the LoginPage POM
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';

test.describe('Login Form', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Validation', () => {
    // test('should show error when email is provided but password is empty', async () => {
    //   // Arrange & Act
    //   await loginPage.attemptLoginWithEmailOnly('user@example.com');

    //   // Assert
    //   await loginPage.expectSubmitButtonDisabled();
    //   await loginPage.expectPasswordError('Password is required');
    // });

    // test('should show error when password is provided but email is empty', async () => {
    //   // Arrange & Act
    //   await loginPage.attemptLoginWithPasswordOnly('password123');

    //   // Assert
    //   await loginPage.expectSubmitButtonDisabled();
    //   await loginPage.expectEmailError('Email is required');
    // });

    // test('should show error when email format is invalid', async () => {
    //   // Arrange & Act
    //   await loginPage.fillEmail('invalid-email');
    //   await loginPage.fillPassword('password123');

    //   // Assert
    //   await loginPage.expectSubmitButtonDisabled();
    //   await loginPage.expectEmailError('Invalid email address');
    // });

    test('should enable submit button when both fields are valid', async () => {
      // Arrange & Act
      await loginPage.fillEmail('user@example.com');
      await loginPage.fillPassword('validPassword123!');

      // Assert
      await loginPage.expectSubmitButtonEnabled();
    });
  });

  // test.describe('Password Visibility Toggle', () => {
  //   test('should toggle password visibility', async () => {
  //     // Arrange
  //     await loginPage.fillPassword('mySecretPassword');

  //     // Act - Show password
  //     await loginPage.togglePasswordVisibility();

  //     // Assert - Password is visible
  //     await loginPage.expectPasswordFieldType('text');

  //     // Act - Hide password
  //     await loginPage.togglePasswordVisibility();

  //     // Assert - Password is hidden
  //     await loginPage.expectPasswordFieldType('password');
  //   });
  // });

  test.describe('API Error Handling', () => {
    test('should display error banner on invalid credentials', async () => {
      // Arrange & Act
      await loginPage.login('wrong@example.com', 'wrongPassword123!');

      // Assert
      await loginPage.errorBanner.expectVisible();
      await loginPage.errorBanner.expectTitle('Authentication Failed');
      await loginPage.errorBanner.expectMessage('Invalid email or password');
    });

    test('should clear error banner when user starts typing', async () => {
      // Arrange - Trigger an error first
      await loginPage.login('wrong@example.com', 'wrongPassword123!');
      await loginPage.errorBanner.expectVisible();

      // Act - Start typing in email field
      await loginPage.fillEmail('newuser@example.com');

      // Assert - Error banner should disappear
      await loginPage.errorBanner.expectHidden();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to register page when clicking register link', async ({ page }) => {
      // Act
      await loginPage.clickRegisterLink();

      // Assert
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Form State', () => {
    // test('should preserve form values when validation fails', async () => {
    //   // Arrange & Act
    //   await loginPage.fillEmail('user@example.com');
    //   await loginPage.attemptLoginWithEmailOnly('user@example.com');

    //   // Assert - Email value is preserved
    //   const emailValue = await loginPage.getEmailValue();
    //   expect(emailValue).toBe('user@example.com');
    // });

    test('should clear form when clearForm is called', async () => {
      // Arrange
      await loginPage.fillEmail('user@example.com');
      await loginPage.fillPassword('password123');

      // Act
      await loginPage.clearForm();

      // Assert
      const emailValue = await loginPage.getEmailValue();
      const passwordValue = await loginPage.getPasswordValue();
      expect(emailValue).toBe('');
      expect(passwordValue).toBe('');
    });
  });

  // test.describe('Scenario: User tries to login with email only', () => {
  //   test('should prevent login submission when password is empty', async () => {
  //     // Arrange - Navigate to login page
  //     // (done in beforeEach)

  //     // Act - Fill only email field
  //     await loginPage.fillEmail('user');

  //     // Assert - Password field is empty
  //     const passwordValue = await loginPage.getPasswordValue();
  //     expect(passwordValue).toBe('');

  //     // Assert - Submit button is disabled
  //     await loginPage.expectSubmitButtonDisabled();

  //     // Assert - Validation error is shown for password
  //     await loginPage.expectPasswordError('Password is required');
  //   });
  // });
});
