/**
 * Page Object Model for Error Banner Component
 * Encapsulates interactions with error banners displayed on forms
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class ErrorBannerComponent {
  readonly page: Page;

  // Locators
  private readonly banner: Locator;
  private readonly title: Locator;
  private readonly message: Locator;

  constructor(page: Page, testId: string = 'login-error-banner') {
    this.page = page;
    this.banner = page.locator(`[data-test-id="${testId}"]`);
    this.title = page.locator(`[data-test-id="${testId}-title"]`);
    this.message = page.locator(`[data-test-id="${testId}-message"]`);
  }

  /**
   * Check if error banner is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.banner.isVisible();
  }

  /**
   * Check if error banner is hidden
   */
  async isHidden(): Promise<boolean> {
    return await this.banner.isHidden();
  }

  /**
   * Get error banner title text
   */
  async getTitleText(): Promise<string> {
    return await this.title.textContent() || '';
  }

  /**
   * Get error banner message text
   */
  async getMessageText(): Promise<string> {
    return await this.message.textContent() || '';
  }

  /**
   * Assert error banner is visible
   */
  async expectVisible() {
    await expect(this.banner).toBeVisible();
  }

  /**
   * Assert error banner is hidden
   */
  async expectHidden() {
    await expect(this.banner).toBeHidden();
  }

  /**
   * Assert error banner has specific title
   * @param expectedTitle - Expected title text
   */
  async expectTitle(expectedTitle: string) {
    await expect(this.title).toBeVisible();
    await expect(this.title).toContainText(expectedTitle);
  }

  /**
   * Assert error banner has specific message
   * @param expectedMessage - Expected message text
   */
  async expectMessage(expectedMessage: string) {
    await expect(this.message).toBeVisible();
    await expect(this.message).toContainText(expectedMessage);
  }

  /**
   * Assert error banner displays specific error type
   * @param errorType - Type of error (e.g., 'Authentication Failed', 'Invalid Input')
   * @param message - Expected error message
   */
  async expectError(errorType: string, message: string) {
    await this.expectVisible();
    await this.expectTitle(errorType);
    await this.expectMessage(message);
  }

  /**
   * Wait for error banner to appear
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForVisible(timeout?: number) {
    await this.banner.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for error banner to disappear
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForHidden(timeout?: number) {
    await this.banner.waitFor({ state: 'hidden', timeout });
  }
}
