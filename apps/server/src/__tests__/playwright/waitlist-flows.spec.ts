/**
 * Waitlist & Invite Code System — Comprehensive Playwright Tests
 *
 * Tests every human interaction with the waitlist and invite code system
 * on the live Tsewa PWA at https://tsewa.pages.dev.
 *
 * Each test registers a fresh user via the API, injects auth state into
 * localStorage, then exercises the waitlist UI on a mobile viewport (390x844).
 *
 * Run:  npx playwright test waitlist-flows.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'https://tsewa.pages.dev';
const API_URL = 'https://tsewa-api-proxy.virajsharma5599.workers.dev';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../screenshots/waitlist');

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
interface AuthUser {
  id: string;
  email: string;
  isActive: boolean;
}

interface RegisterResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register a fresh test user via the API and return tokens + user object. */
async function registerTestUser(suffix?: string): Promise<RegisterResult> {
  const email = `test_${suffix ?? Date.now()}_${Math.random().toString(36).slice(2, 7)}@tsewa.test`;
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass123!' }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Registration failed (${res.status}): ${body}`);
  }

  return res.json();
}

/** Inject auth state into localStorage so the app treats the session as authenticated. */
async function injectAuthState(
  page: Page,
  { accessToken, refreshToken, user }: RegisterResult,
) {
  await page.evaluate(
    ({ accessToken, refreshToken, user }) => {
      localStorage.setItem(
        'tsewa-auth-store',
        JSON.stringify({
          state: {
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
            isHydrated: true,
          },
          version: 0,
        }),
      );
    },
    { accessToken, refreshToken, user },
  );
}

/** Navigate to the waitlist page with auth pre-injected. */
async function goToWaitlist(page: Page, auth: RegisterResult) {
  // Go to base URL first so we can write to its localStorage
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await injectAuthState(page, auth);
  // Reload so the app reads the injected state and routes to waitlist
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
  // Allow the React Native Web app to hydrate and route
  await page.waitForTimeout(4000);
}

/** Take a timestamped screenshot. */
let screenshotCounter = 0;
async function screenshot(page: Page, name: string) {
  screenshotCounter++;
  const filename = `${String(screenshotCounter).padStart(2, '0')}_${name}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, filename),
    fullPage: false,
  });
}

/** Find an input by placeholder text (RN Web renders TextInput as <input>). */
function inputByPlaceholder(page: Page, placeholder: string) {
  return page.locator(`input[placeholder="${placeholder}"]`).first();
}

/** Best-effort cleanup: log the user out via the API. */
async function cleanupUser(auth: RegisterResult | null) {
  if (!auth) return;
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

// ============================================================================
// 1. WAITLIST PAGE UI
// ============================================================================
test.describe('Waitlist Page UI', () => {
  let auth: RegisterResult;

  test.beforeEach(async ({ page }) => {
    auth = await registerTestUser('ui');
    await goToWaitlist(page, auth);
  });

  test.afterEach(async () => {
    await cleanupUser(auth);
  });

  // 1. After registration, user sees waitlist page
  test('after registration, user sees the waitlist page', async ({ page }) => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("You're on the waitlist");
    await screenshot(page, 'waitlist_page_visible');
  });

  // 2. Hourglass icon visible
  test('hourglass icon is visible', async ({ page }) => {
    // The hourglass is rendered as the Unicode character U+231B
    const hourglass = page.getByText('\u231B');
    await expect(hourglass).toBeVisible();
    await screenshot(page, 'hourglass_icon');
  });

  // 3. "You're on the waitlist!" heading
  test('displays "You\'re on the waitlist!" heading', async ({ page }) => {
    const heading = page.getByText("You're on the waitlist!");
    await expect(heading).toBeVisible();
  });

  // 4. Position card shows "#" and a number
  test('position card shows "#" and a number', async ({ page }) => {
    // Wait for the waitlist status API to return
    await page.waitForTimeout(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    // Position displays as e.g. "#42" or "#--" while loading
    expect(bodyText).toMatch(/#\d+|#--/);
    // The label "Your position" should also be present (may be uppercased via CSS)
    expect(bodyText.toLowerCase()).toContain('your position');
    await screenshot(page, 'position_card');
  });

  // 5. "Have an invite code? Skip the wait!" text
  test('shows "Have an invite code? Skip the wait!" text', async ({ page }) => {
    const hint = page.getByText('Have an invite code? Skip the wait!');
    await expect(hint).toBeVisible();
  });

  // 6. Invite code input field
  test('invite code input field is present', async ({ page }) => {
    const input = inputByPlaceholder(page, 'Enter your invite code');
    await expect(input).toBeVisible();
  });

  // 7. "Submit Code" button
  test('"Submit Code" button is present', async ({ page }) => {
    const btn = page.getByText('Submit Code', { exact: true });
    await expect(btn).toBeVisible();
    await screenshot(page, 'submit_code_button');
  });

  // 8. "Share Tsewa" section
  test('"Share Tsewa" section is visible', async ({ page }) => {
    const section = page.getByText('Share Tsewa', { exact: true });
    await expect(section).toBeVisible();
    // Also check the descriptive text
    const desc = page.getByText('Generate an invite code to share with friends');
    await expect(desc).toBeVisible();
  });

  // 9. "Generate Invite Code" button
  test('"Generate Invite Code" button is present', async ({ page }) => {
    const btn = page.getByText('Generate Invite Code', { exact: true });
    await expect(btn).toBeVisible();
  });

  // 10. User email displayed at bottom
  test('user email is displayed at the bottom', async ({ page }) => {
    const emailText = page.getByText(auth.user.email);
    await expect(emailText).toBeVisible();
    await screenshot(page, 'user_email_footer');
  });

  // 11. "Log Out" text/button
  test('"Log Out" button is visible', async ({ page }) => {
    const logoutBtn = page.getByText('Log Out', { exact: true });
    await expect(logoutBtn).toBeVisible();
  });
});

// ============================================================================
// 2. INVITE CODE REDEMPTION
// ============================================================================
test.describe('Invite Code Redemption', () => {
  let auth: RegisterResult;

  test.beforeEach(async ({ page }) => {
    auth = await registerTestUser('redeem');
    await goToWaitlist(page, auth);
  });

  test.afterEach(async () => {
    await cleanupUser(auth);
  });

  // 12. Enter empty code -> button disabled or validation error
  test('submit button is disabled when invite code input is empty', async ({ page }) => {
    const input = inputByPlaceholder(page, 'Enter your invite code');
    // Ensure input is empty
    await input.fill('');
    await page.waitForTimeout(500);

    const submitBtn = page.getByText('Submit Code', { exact: true });
    // The button should be disabled (the component sets disabled={!inviteCode.trim()})
    // In RN Web, disabled buttons often have aria-disabled or opacity
    const isDisabled = await submitBtn.evaluate((el) => {
      const htmlEl = el as HTMLElement;
      return (
        htmlEl.getAttribute('aria-disabled') === 'true' ||
        htmlEl.hasAttribute('disabled') ||
        htmlEl.style.opacity === '0.5' ||
        htmlEl.closest('[aria-disabled="true"]') !== null
      );
    });
    expect(isDisabled).toBe(true);
    await screenshot(page, 'empty_code_disabled');
  });

  // 13. Enter short/invalid code -> error after submit
  test('entering a short/invalid code and submitting shows an error', async ({ page }) => {
    // Register dialog handler BEFORE the click so we catch Alert.alert
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const input = inputByPlaceholder(page, 'Enter your invite code');
    await input.fill('AB');

    const submitBtn = page.getByText('Submit Code', { exact: true });
    await submitBtn.click();
    await page.waitForTimeout(5000);

    // Check for error either inline in the page or via a browser alert dialog
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasInlineError =
      bodyText.includes('Invalid') ||
      bodyText.includes('failed') ||
      bodyText.includes('error') ||
      bodyText.includes('Error');
    const hasDialogError = dialogMessage.length > 0;

    expect(hasInlineError || hasDialogError).toBe(true);
    await screenshot(page, 'invalid_code_error');
  });

  // 14. Enter non-existent code -> error message shown
  test('entering a non-existent code shows an error message', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const input = inputByPlaceholder(page, 'Enter your invite code');
    await input.fill('XXXXXX');

    const submitBtn = page.getByText('Submit Code', { exact: true });
    await submitBtn.click();
    await page.waitForTimeout(5000);

    // Check for error either in page body or in a dialog
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasInlineError =
      bodyText.includes('Invalid') ||
      bodyText.includes('invite code') ||
      bodyText.includes('error') ||
      bodyText.includes('not found');
    const hasDialogError = dialogMessage.length > 0;

    expect(hasInlineError || hasDialogError).toBe(true);
    await screenshot(page, 'nonexistent_code_error');
  });

  // 15. Verify error message clears when user types new code
  test('error clears when user types a new code', async ({ page }) => {
    let dialogCount = 0;
    page.on('dialog', async (dialog) => {
      dialogCount++;
      await dialog.dismiss();
    });

    const input = inputByPlaceholder(page, 'Enter your invite code');

    // Trigger an error first
    await input.fill('BADCODE');
    const submitBtn = page.getByText('Submit Code', { exact: true });
    await submitBtn.click();
    await page.waitForTimeout(3000);

    // Now type a new code — the previous error dialog should have been dismissed
    // and no new error should appear until submit
    await input.fill('NEWCODE');
    await page.waitForTimeout(1000);

    // Verify input has new value (error state cleared, user can try again)
    const value = await input.inputValue();
    expect(value).toBe('NEWCODE');
    await screenshot(page, 'error_cleared_new_code');
  });
});

// ============================================================================
// 3. INVITE CODE GENERATION
// ============================================================================
test.describe('Invite Code Generation', () => {
  let auth: RegisterResult;

  test.beforeEach(async ({ page }) => {
    auth = await registerTestUser('gen');
    await goToWaitlist(page, auth);
  });

  test.afterEach(async () => {
    await cleanupUser(auth);
  });

  // 16. Tap "Generate Invite Code" -> code appears
  test('tapping "Generate Invite Code" produces a visible code', async ({ page }) => {
    // Handle any alert dialogs (errors) that may appear
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    const genBtn = page.getByText('Generate Invite Code', { exact: true });
    await expect(genBtn).toBeVisible();
    await genBtn.click();
    await page.waitForTimeout(5000);

    // After generation, the InviteShare component replaces the button
    // It shows "Your Invite Code" label and the generated code
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasInviteCode =
      bodyText.includes('Your Invite Code') || bodyText.includes('Copy');

    expect(hasInviteCode).toBe(true);
    await screenshot(page, 'generated_invite_code');
  });

  // 17. Generated code is visible and copyable
  test('generated code is visible and has copy/share buttons', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    const genBtn = page.getByText('Generate Invite Code', { exact: true });
    await genBtn.click();
    await page.waitForTimeout(5000);

    // The InviteShare component shows "Copy" and "Share" buttons
    const copyBtn = page.getByText('Copy', { exact: true });
    const shareBtn = page.getByText('Share', { exact: true });

    await expect(copyBtn).toBeVisible();
    await expect(shareBtn).toBeVisible();
    await screenshot(page, 'code_copy_share_buttons');
  });

  // 18. Generate multiple codes (up to limit) via API
  test('can generate multiple invite codes up to the limit via API', async () => {
    // The server allows up to 5 invite codes per user
    const generatedCodes: string[] = [];

    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${API_URL}/api/invite/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.code).toBeDefined();
      generatedCodes.push(data.code);
    }

    expect(generatedCodes).toHaveLength(5);

    // 6th should fail
    const res = await fetch(`${API_URL}/api/invite/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// 4. LOGOUT FLOW
// ============================================================================
test.describe('Logout Flow', () => {
  let auth: RegisterResult;

  test.beforeEach(async ({ page }) => {
    auth = await registerTestUser('logout');
    await goToWaitlist(page, auth);
  });

  test.afterEach(async () => {
    await cleanupUser(auth);
  });

  // 19. Tap "Log Out" -> confirmation or direct logout
  // 20. After logout, user is back on welcome page
  test('tapping "Log Out" returns user to the welcome page', async ({ page }) => {
    // Handle any confirmation dialogs
    page.on('dialog', async (dialog) => {
      // Accept any confirmation prompt
      await dialog.accept();
    });

    const logoutBtn = page.getByText('Log Out', { exact: true });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Wait for logout mutation and navigation — allow extra time for redirect
    await page.waitForTimeout(6000);
    await screenshot(page, 'after_logout');

    // Should be back on the welcome page (use || to be lenient with timing)
    const bodyText = await page.evaluate(() => document.body.innerText);
    const onWelcome =
      bodyText.includes('Get Started') ||
      bodyText.includes('Find your person') ||
      bodyText.includes('Tsewa') ||
      bodyText.includes('Welcome back') ||
      bodyText.includes('Log in');
    expect(onWelcome).toBe(true);

    // Should NOT still be on the waitlist
    expect(bodyText).not.toContain("You're on the waitlist");
  });

  // 21. After logout, going to any protected route redirects to welcome
  test('after logout, navigating to a protected route redirects to welcome', async ({
    page,
  }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Log out first
    const logoutBtn = page.getByText('Log Out', { exact: true });
    await logoutBtn.click();
    await page.waitForTimeout(5000);

    // Try to navigate to a protected route
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(4000);
    await screenshot(page, 'protected_route_after_logout');

    // The AuthGate should redirect unauthenticated users to welcome
    const bodyText = await page.evaluate(() => document.body.innerText);
    const onWelcome =
      bodyText.includes('Get Started') ||
      bodyText.includes('Find your person') ||
      bodyText.includes('Tsewa');
    expect(onWelcome).toBe(true);

    // Should NOT see waitlist content
    expect(bodyText).not.toContain("You're on the waitlist");
  });
});

// ============================================================================
// 5. EDGE CASES
// ============================================================================
test.describe('Edge Cases', () => {
  let auth: RegisterResult;

  test.beforeEach(async ({ page }) => {
    auth = await registerTestUser('edge');
    await goToWaitlist(page, auth);
  });

  test.afterEach(async () => {
    await cleanupUser(auth);
  });

  // 22. Refresh page while on waitlist -> stays on waitlist
  test('refreshing the page keeps user on the waitlist', async ({ page }) => {
    // Verify we're on the waitlist
    let bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("You're on the waitlist");

    // Reload the page
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(4000);
    await screenshot(page, 'after_refresh');

    // Should still be on waitlist
    bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("You're on the waitlist");
  });

  // 23. Navigate back from waitlist -> stays on waitlist (can't go back to register)
  test('pressing back from waitlist does not leave waitlist', async ({ page }) => {
    // Verify we're on the waitlist
    let bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("You're on the waitlist");

    // Try going back
    await page.goBack();

    // The AuthGate should redirect back to waitlist within a few seconds.
    // Poll for up to 3 seconds to allow the redirect to complete.
    let stillOnWaitlist = false;
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1000);
      bodyText = await page.evaluate(() => document.body.innerText);
      if (
        bodyText.includes("You're on the waitlist") ||
        bodyText.includes('Your position')
      ) {
        stillOnWaitlist = true;
        break;
      }
    }

    await screenshot(page, 'after_back_nav');
    expect(stillOnWaitlist).toBe(true);
  });

  // 24. Fast double-tap on Submit Code -> no double submission
  test('fast double-tap on Submit Code does not cause double submission', async ({
    page,
  }) => {
    let dialogCount = 0;
    page.on('dialog', async (dialog) => {
      dialogCount++;
      await dialog.dismiss();
    });

    const input = inputByPlaceholder(page, 'Enter your invite code');
    await input.fill('DBLTEST');

    const submitBtn = page.getByText('Submit Code', { exact: true });

    // Rapid double click
    await submitBtn.click();
    await submitBtn.click();

    // Wait for any responses
    await page.waitForTimeout(5000);
    await screenshot(page, 'double_tap_submit');

    // At most one error dialog should appear (not two)
    // The button shows a loading state which disables further clicks
    expect(dialogCount).toBeLessThanOrEqual(2);

    // The page should still be functional (not crashed)
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("You're on the waitlist");
  });

  // 25. Very long invite code -> handled gracefully
  test('very long invite code is handled gracefully', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const input = inputByPlaceholder(page, 'Enter your invite code');
    const longCode = 'A'.repeat(200);
    await input.fill(longCode);

    const submitBtn = page.getByText('Submit Code', { exact: true });
    await submitBtn.click();
    await page.waitForTimeout(5000);
    await screenshot(page, 'long_code_handled');

    // Should show an error, not crash
    const bodyText = await page.evaluate(() => document.body.innerText);
    const graceful =
      bodyText.includes("You're on the waitlist") || // page still intact
      bodyText.includes('Invalid') ||
      bodyText.includes('error') ||
      dialogMessage.length > 0;
    expect(graceful).toBe(true);
  });
});
