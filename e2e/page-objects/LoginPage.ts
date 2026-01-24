/**
 * Page Object Model for Login Page
 * Encapsulates all interactions with the login form
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { ErrorBannerComponent } from './components/ErrorBannerComponent';

export class LoginPage {
  readonly page: Page;
  readonly errorBanner: ErrorBannerComponent;

  // Locators - Main Container
  private readonly formCard: Locator;
  private readonly form: Locator;

  // Locators - Email Field
  private readonly emailInput: Locator;
  private readonly emailErrorMessage: Locator;

  // Locators - Password Field
  private readonly passwordInput: Locator;
  private readonly passwordToggle: Locator;
  private readonly passwordErrorMessage: Locator;

  // Locators - Actions
  private readonly submitButton: Locator;
  private readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.errorBanner = new ErrorBannerComponent(page);

    // Initialize locators
    this.formCard = page.locator('[data-test-id="login-form-card"]');
    this.form = page.locator('[data-test-id="login-form"]');

    this.emailInput = page.locator('[data-test-id="login-email-input"]');
    this.emailErrorMessage = page.locator('[data-test-id="email-error-message"]');

    this.passwordInput = page.locator('[data-test-id="login-password-input"]');
    this.passwordToggle = page.locator('[data-test-id="login-password-toggle"]');
    this.passwordErrorMessage = page.locator('[data-test-id="password-error-message"]');

    this.submitButton = page.locator('[data-test-id="login-submit-button"]');
    this.registerLink = page.locator('[data-test-id="login-register-link"]');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the login form to be visible
   */
  async waitForPageLoad() {
    await this.formCard.waitFor({ state: 'visible' });
  }

  /**
   * Fill the email field
   * @param email - Email address to fill
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill the password field
   * @param password - Password to fill
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.passwordToggle.click();
  }

  /**
   * Click the submit button
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Click the register link
   */
  async clickRegisterLink() {
    await this.registerLink.click();
  }

  /**
   * Complete login flow with provided credentials
   * @param email - Email address
   * @param password - Password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Fill only email and attempt to submit (for validation testing)
   * @param email - Email address
   */
  async attemptLoginWithEmailOnly(email: string) {
    await this.fillEmail(email);
    // await this.clickSubmit();
  }

  /**
   * Fill only password and attempt to submit (for validation testing)
   * @param password - Password
   */
  async attemptLoginWithPasswordOnly(password: string) {
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  // === Validation Error Assertions ===

  /**
   * Check if email error message is visible
   */
  async isEmailErrorVisible(): Promise<boolean> {
    return await this.emailErrorMessage.isVisible();
  }

  /**
   * Check if password error message is visible
   */
  async isPasswordErrorVisible(): Promise<boolean> {
    return await this.passwordErrorMessage.isVisible();
  }

  /**
   * Get email validation error text
   */
  async getEmailErrorText(): Promise<string> {
    return await this.emailErrorMessage.textContent() || '';
  }

  /**
   * Get password validation error text
   */
  async getPasswordErrorText(): Promise<string> {
    return await this.passwordErrorMessage.textContent() || '';
  }

  /**
   * Assert email error message is visible with expected text
   * @param expectedText - Expected error message text
   */
  async expectEmailError(expectedText: string) {
    await expect(this.emailErrorMessage).toBeVisible();
    await expect(this.emailErrorMessage).toContainText(expectedText);
  }

  /**
   * Assert password error message is visible with expected text
   * @param expectedText - Expected error message text
   */
  async expectPasswordError(expectedText: string) {
    await expect(this.passwordErrorMessage).toBeVisible();
    await expect(this.passwordErrorMessage).toContainText(expectedText);
  }

  // === Submit Button State Assertions ===

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Assert submit button is disabled
   */
  async expectSubmitButtonDisabled() {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Assert submit button is enabled
   */
  async expectSubmitButtonEnabled() {
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Check if submit button shows loading state
   */
  async isSubmitting(): Promise<boolean> {
    const text = await this.submitButton.textContent();
    return text?.includes('Signing in...') || false;
  }

  // === Password Field State Assertions ===

  /**
   * Check if password is visible (not masked)
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }

  /**
   * Assert password field type
   * @param expectedType - Expected input type ('text' or 'password')
   */
  async expectPasswordFieldType(expectedType: 'text' | 'password') {
    await expect(this.passwordInput).toHaveAttribute('type', expectedType);
  }

  // === Form State Assertions ===

  /**
   * Assert form is visible
   */
  async expectFormVisible() {
    await expect(this.formCard).toBeVisible();
    await expect(this.form).toBeVisible();
  }

  /**
   * Get current email input value
   */
  async getEmailValue(): Promise<string> {
    return await this.emailInput.inputValue();
  }

  /**
   * Get current password input value
   */
  async getPasswordValue(): Promise<string> {
    return await this.passwordInput.inputValue();
  }

  /**
   * Clear all form fields
   */
  async clearForm() {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }
}
