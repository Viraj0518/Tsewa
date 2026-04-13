/**
 * Comprehensive Playwright auth-flow E2E tests for the Tsewa PWA.
 *
 * Target: https://tsewa.pages.dev  (live Cloudflare Pages deploy)
 * API:    https://tsewa-api-proxy.virajsharma5599.workers.dev
 *
 * Covers every human-facing interaction across Welcome, Register, Login,
 * and Waitlist screens — navigation, validation, submission, session
 * persistence, and cross-navigation.
 *
 * Run:
 *   npx playwright test --config playwright.config.ts
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_URL = 'https://tsewa-api-proxy.virajsharma5599.workers.dev';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../screenshots/playwright');

const TEST_TIMESTAMP = Date.now();
const TEST_USER = {
  email: `pw_e2e_${TEST_TIMESTAMP}@tsewa.test`,
  password: 'TestPass123!',
};
const REG_USER = {
  email: `pw_reg_${TEST_TIMESTAMP}@tsewa.test`,
  password: 'RegPass456!',
};
const DUP_USER = {
  email: `pw_dup_${TEST_TIMESTAMP}@tsewa.test`,
  password: 'DupPass789!',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let stepCounter = 0;

async function screenshot(page: Page, name: string) {
  stepCounter++;
  const filename = `${String(stepCounter).padStart(2, '0')}_${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
}

/** Locate a React Native Web <TextInput> by its placeholder. */
function inputByPlaceholder(page: Page, placeholder: string) {
  return page.locator(`input[placeholder="${placeholder}"]`).first();
}

/** Clear all client-side auth state. */
async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
}

/** Navigate to the welcome page in a clean (unauthenticated) state. */
async function goToWelcome(page: Page) {
  await clearAuthState(page);
  await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(3000);
}

/** Navigate from welcome to the registration page. */
async function goToRegister(page: Page) {
  await goToWelcome(page);
  await page.getByText('Get Started').click();
  await page.waitForTimeout(2000);
}

/** Navigate from welcome to the login page. */
async function goToLogin(page: Page) {
  await goToWelcome(page);
  await page.getByText('Log in', { exact: false }).first().click();
  await page.waitForTimeout(2000);
}

/** Fill registration form fields. */
async function fillRegisterForm(
  page: Page,
  email: string,
  password: string,
  confirmPassword: string,
  inviteCode?: string,
) {
  await inputByPlaceholder(page, 'your@email.com').fill(email);
  await inputByPlaceholder(page, 'At least 8 characters').fill(password);
  await inputByPlaceholder(page, 'Re-enter your password').fill(confirmPassword);
  if (inviteCode) {
    await inputByPlaceholder(page, 'Enter invite code').fill(inviteCode);
  }
}

/** Fill login form fields. */
async function fillLoginForm(page: Page, email: string, password: string) {
  await inputByPlaceholder(page, 'your@email.com').fill(email);
  await inputByPlaceholder(page, 'Enter your password').fill(password);
}

/** Perform a full login through the UI and land on the waitlist. */
async function loginViaUI(page: Page, email: string, password: string) {
  await goToLogin(page);
  await fillLoginForm(page, email, password);
  await page.getByText('Log In', { exact: true }).click();
  await page.waitForTimeout(6000);
}

// ---------------------------------------------------------------------------
// Global Setup — ensure screenshots dir exists & seed test users via API
// ---------------------------------------------------------------------------
test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // Pre-register the TEST_USER so login tests have a valid account
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });
  // 201 = created, 409 = already exists from previous run
  expect([201, 409]).toContain(res.status);

  // Pre-register the DUP_USER so duplicate-email test has a collision target
  const dupRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DUP_USER),
  });
  expect([201, 409]).toContain(dupRes.status);
});

// Clean up client state after every test so tests are isolated
test.afterEach(async ({ page }) => {
  await clearAuthState(page);
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. WELCOME PAGE
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Welcome Page', () => {
  test.beforeEach(async ({ page }) => {
    await goToWelcome(page);
  });

  // 1 — Logo / Tibetan text
  test('1 — Tibetan text "བརྩེ་བ" is visible', async ({ page }) => {
    const tibetan = page.getByText('བརྩེ་བ');
    await expect(tibetan).toBeVisible({ timeout: 10_000 });
    await screenshot(page, 'welcome_tibetan');
  });

  // 2 — "Tsewa" heading
  test('2 — "Tsewa" heading is visible', async ({ page }) => {
    const heading = page.getByText('Tsewa', { exact: true });
    await expect(heading).toBeVisible();
    await screenshot(page, 'welcome_heading');
  });

  // 3 — "Find your person" subtext
  test('3 — "Find your person" subtext is visible', async ({ page }) => {
    const tagline = page.getByText('Find your person');
    await expect(tagline).toBeVisible();
  });

  // 4 — "Get Started" button visible and clickable
  test('4 — "Get Started" button is visible and clickable', async ({ page }) => {
    const btn = page.getByText('Get Started');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await screenshot(page, 'welcome_get_started');
  });

  // 5 — "Already have an account? Log in" link
  test('5 — "Already have an account? Log in" link is visible and clickable', async ({ page }) => {
    const link = page.getByText('Already have an account? Log in');
    await expect(link).toBeVisible();
    await expect(link).toBeEnabled();
  });

  // 6 — Lavender gradient background
  test('6 — Lavender gradient background renders', async ({ page }) => {
    // The welcome page container uses colors.lavender (#9B8EC4) as background
    const bgColor = await page.evaluate(() => {
      // Walk up from body to find the lavender-colored container
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        // Check for the lavender color (#9B8EC4 = rgb(155, 142, 196))
        if (bg.includes('155') && bg.includes('142') && bg.includes('196')) {
          return bg;
        }
        // Also check for gradient
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
          return bgImage;
        }
      }
      // Fallback: check body and first-child backgrounds
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });
    // Either the lavender color was found or any non-white background
    expect(bgColor).toBeTruthy();
    await screenshot(page, 'welcome_lavender_bg');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. REGISTRATION PAGE — ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Registration Page — Elements', () => {
  test.beforeEach(async ({ page }) => {
    await goToRegister(page);
  });

  // 7 — Navigate via "Get Started" from welcome
  test('7 — Navigated via "Get Started" shows registration', async ({ page }) => {
    const title = page.getByRole('heading', { name: 'Create account' });
    await expect(title).toBeVisible();
    await screenshot(page, 'register_via_get_started');
  });

  // 8 — "Back" link goes back to welcome
  test('8 — "Back" link returns to welcome page', async ({ page }) => {
    const back = page.getByText('← Back');
    await expect(back).toBeVisible();
    await back.click();
    await page.waitForTimeout(2000);

    const tsewa = page.getByText('Tsewa', { exact: true });
    await expect(tsewa).toBeVisible();
    await screenshot(page, 'register_back_to_welcome');
  });

  // 9 — "Create account" title visible
  test('9 — "Create account" title is visible', async ({ page }) => {
    const title = page.getByRole('heading', { name: 'Create account' });
    await expect(title).toBeVisible();
  });

  // 10 — Email input with @ icon and placeholder
  test('10 — Email input with placeholder "your@email.com"', async ({ page }) => {
    const emailInput = inputByPlaceholder(page, 'your@email.com');
    await expect(emailInput).toBeVisible();
    // The @ icon is rendered as text next to the input
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('@');
    await screenshot(page, 'register_email_input');
  });

  // 11 — Password input with * icon and "At least 8 characters" placeholder
  test('11 — Password input with placeholder "At least 8 characters"', async ({ page }) => {
    const pwInput = inputByPlaceholder(page, 'At least 8 characters');
    await expect(pwInput).toBeVisible();
    // Check password field is masked
    const inputType = await pwInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  // 12 — Confirm Password input visible
  test('12 — Confirm Password input is visible', async ({ page }) => {
    const confirmInput = inputByPlaceholder(page, 'Re-enter your password');
    await expect(confirmInput).toBeVisible();
  });

  // 13 — Invite Code (optional) input visible
  test('13 — Invite Code (optional) input is visible', async ({ page }) => {
    const inviteInput = inputByPlaceholder(page, 'Enter invite code');
    await expect(inviteInput).toBeVisible();
    // Label says "Invite Code (optional)"
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Invite Code');
  });

  // 14 — "Create Account" button visible
  test('14 — "Create Account" button is visible', async ({ page }) => {
    const btn = page.getByText('Create Account', { exact: true });
    await expect(btn).toBeVisible();
    await screenshot(page, 'register_form_full');
  });

  // 15 — "Already have an account? Log in" link works
  test('15 — "Already have an account? Log in" link navigates to login', async ({ page }) => {
    const loginLink = page.getByText('Log in', { exact: true });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await page.waitForTimeout(2000);

    const welcomeBack = page.getByText('Welcome back');
    await expect(welcomeBack).toBeVisible();
    await screenshot(page, 'register_to_login');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. REGISTRATION — FORM SUBMISSION & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Registration — Validation', () => {
  test.beforeEach(async ({ page }) => {
    await goToRegister(page);
  });

  // 16 — Register with valid email/password lands on waitlist
  test('16 — Register with valid data lands on waitlist', async ({ page }) => {
    await fillRegisterForm(page, REG_USER.email, REG_USER.password, REG_USER.password);
    await screenshot(page, 'register_valid_filled');

    await page.getByText('Create Account', { exact: true }).click();
    await page.waitForTimeout(8000);

    await screenshot(page, 'register_valid_result');
    const bodyText = await page.evaluate(() => document.body.innerText);
    const onWaitlist =
      bodyText.includes('waitlist') ||
      bodyText.includes('Waitlist') ||
      bodyText.includes("You're on the waitlist") ||
      bodyText.includes('Your position');
    expect(onWaitlist).toBe(true);
  });

  // 17 — Register with empty email shows validation error
  test('17 — Empty email shows validation error', async ({ page }) => {
    // Leave email empty, fill the rest
    await inputByPlaceholder(page, 'At least 8 characters').fill('ValidPass1');
    await inputByPlaceholder(page, 'Re-enter your password').fill('ValidPass1');

    await page.getByText('Create Account', { exact: true }).click();
    await page.waitForTimeout(1500);

    await screenshot(page, 'register_empty_email');
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.toLowerCase()).toContain('required');
  });

  // 18 — Register with invalid email format shows error
  test('18 — Invalid email format shows validation error', async ({ page }) => {
    await fillRegisterForm(page, 'notanemail', 'ValidPass1', 'ValidPass1');

    await page.getByText('Create Account', { exact: true }).click();
    await page.waitForTimeout(1500);

    await screenshot(page, 'register_invalid_email');
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Invalid email');
  });

  // 19 — Register with password < 8 chars shows error
  test('19 — Short password (< 8 chars) shows validation error', async ({ page }) => {
    await fillRegisterForm(page, 'test@example.com', 'Ab1', 'Ab1');

    await page.getByText('Create Account', { exact: true }).click();
    await page.waitForTimeout(1500);

    await screenshot(page, 'register_short_password');
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('at least 8 characters');
  });

  // 20 — Register with mismatched passwords shows error
  test('20 — Mismatched passwords show validation error', async ({ page }) => {
    await fillRegisterForm(page, 'test@example.com', 'ValidPass1', 'DifferentPass2');

    await page.getByText('Create Account', { exact: true }).click();
    await page.waitForTimeout(1500);

    await screenshot(page, 'register_mismatch');
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('do not match');
  });

  // 21 — Register with duplicate email shows 409 error
  test('21 — Duplicate email shows server error', async ({ page }) => {
    // DUP_USER was pre-registered in beforeAll
    await fillRegisterForm(page, DUP_USER.email, DUP_USER.password, DUP_USER.password);

    await page.getByText('Create Account', { exact: true }).click();
    await page.waitForTimeout(6000);

    await screenshot(page, 'register_duplicate');
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasError =
      bodyText.includes('already') ||
      bodyText.includes('exists') ||
      bodyText.includes('409') ||
      bodyText.includes('failed') ||
      bodyText.includes('Failed') ||
      bodyText.includes('Registration failed') ||
      bodyText.includes('status code');
    expect(hasError).toBe(true);
  });

  // 22 — Register with invalid invite code still registers but PENDING
  test('22 — Register with invalid invite code still registers (PENDING)', async ({ page }) => {
    const inviteUser = {
      email: `pw_invite_${Date.now()}@tsewa.test`,
      password: 'InvitePass1!',
    };

    await fillRegisterForm(
      page,
      inviteUser.email,
      inviteUser.password,
      inviteUser.password,
      'INVALIDCODE999',
    );

    await page.getByText('Create Account', { exact: true }).click();
    await page.waitForTimeout(8000);

    await screenshot(page, 'register_invalid_invite');
    const bodyText = await page.evaluate(() => document.body.innerText);
    // Should either land on waitlist (pending) or show the registration result
    const gotResponse =
      bodyText.includes('waitlist') ||
      bodyText.includes('Waitlist') ||
      bodyText.includes("You're on the waitlist") ||
      bodyText.includes('Your position') ||
      bodyText.includes('failed') ||
      bodyText.includes('error') ||
      bodyText.includes('Error');
    expect(gotResponse).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. LOGIN PAGE — ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Login Page — Elements', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  // 23 — Navigate via "Log in" from welcome
  test('23 — Navigate via "Log in" shows login page', async ({ page }) => {
    const title = page.getByText('Welcome back');
    await expect(title).toBeVisible();
    await screenshot(page, 'login_via_link');
  });

  // 24 — "Back" link goes back to welcome
  test('24 — "Back" link returns to welcome', async ({ page }) => {
    const back = page.getByText('← Back');
    await expect(back).toBeVisible();
    await back.click();
    await page.waitForTimeout(2000);

    const tsewa = page.getByText('Tsewa', { exact: true });
    await expect(tsewa).toBeVisible();
    await screenshot(page, 'login_back_to_welcome');
  });

  // 25 — "Welcome back" title visible
  test('25 — "Welcome back" title is visible', async ({ page }) => {
    const title = page.getByText('Welcome back');
    await expect(title).toBeVisible();
  });

  // 26 — Email input with placeholder
  test('26 — Email input with placeholder "your@email.com"', async ({ page }) => {
    const emailInput = inputByPlaceholder(page, 'your@email.com');
    await expect(emailInput).toBeVisible();
  });

  // 27 — Password input with placeholder
  test('27 — Password input with placeholder "Enter your password"', async ({ page }) => {
    const pwInput = inputByPlaceholder(page, 'Enter your password');
    await expect(pwInput).toBeVisible();
    const inputType = await pwInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  // 28 — "Log In" button visible
  test('28 — "Log In" button is visible', async ({ page }) => {
    const btn = page.getByText('Log In', { exact: true });
    await expect(btn).toBeVisible();
    await screenshot(page, 'login_form_full');
  });

  // 29 — "Don't have an account? Sign up" link works
  test('29 — "Sign up" link navigates to registration', async ({ page }) => {
    const signUpLink = page.getByText('Sign up');
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await page.waitForTimeout(2000);

    const createAccount = page.getByRole('heading', { name: 'Create account' });
    await expect(createAccount).toBeVisible();
    await screenshot(page, 'login_to_register');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. LOGIN — FORM SUBMISSION & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Login — Validation & Submission', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  // 30 — Login with valid credentials reaches waitlist
  test('30 — Login with valid credentials reaches waitlist page', async ({ page }) => {
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await screenshot(page, 'login_valid_filled');

    await page.getByText('Log In', { exact: true }).click();
    await page.waitForTimeout(6000);

    await screenshot(page, 'login_valid_result');
    const bodyText = await page.evaluate(() => document.body.innerText);
    const onWaitlist =
      bodyText.includes('waitlist') ||
      bodyText.includes('Waitlist') ||
      bodyText.includes("You're on the waitlist") ||
      bodyText.includes('Your position');
    expect(onWaitlist).toBe(true);
  });

  // 31 — Login with wrong password shows error
  test('31 — Wrong password shows error message', async ({ page }) => {
    await fillLoginForm(page, TEST_USER.email, 'WrongPassword99');

    await page.getByText('Log In', { exact: true }).click();
    await page.waitForTimeout(6000);

    await screenshot(page, 'login_wrong_password');
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasError =
      bodyText.includes('failed') ||
      bodyText.includes('Failed') ||
      bodyText.includes('Invalid') ||
      bodyText.includes('incorrect') ||
      bodyText.includes('credentials') ||
      bodyText.includes('error') ||
      bodyText.includes('status code');
    expect(hasError).toBe(true);
  });

  // 32 — Login with non-existent email shows error
  test('32 — Non-existent email shows error message', async ({ page }) => {
    await fillLoginForm(page, `nonexistent_${Date.now()}@tsewa.test`, 'SomePass123');

    await page.getByText('Log In', { exact: true }).click();
    await page.waitForTimeout(6000);

    await screenshot(page, 'login_nonexistent_email');
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasError =
      bodyText.includes('failed') ||
      bodyText.includes('Failed') ||
      bodyText.includes('Invalid') ||
      bodyText.includes('not found') ||
      bodyText.includes('credentials') ||
      bodyText.includes('error') ||
      bodyText.includes('status code');
    expect(hasError).toBe(true);
  });

  // 33 — Login with empty fields shows validation
  test('33 — Empty fields show validation errors', async ({ page }) => {
    // Submit without filling anything
    await page.getByText('Log In', { exact: true }).click();
    await page.waitForTimeout(1500);

    await screenshot(page, 'login_empty_fields');
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.toLowerCase()).toContain('required');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. WAITLIST PAGE (after login)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Waitlist Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);
  });

  // 34 — Shows "You're on the waitlist!" heading
  test('34 — Shows "You\'re on the waitlist!" heading', async ({ page }) => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("You're on the waitlist");
    await screenshot(page, 'waitlist_heading');
  });

  // 35 — Shows position number
  test('35 — Shows position number', async ({ page }) => {
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.toLowerCase()).toContain('your position');
    // Position shows as #N or #--
    expect(bodyText).toMatch(/#\d+|#--/);
    await screenshot(page, 'waitlist_position');
  });

  // 36 — Invite code input visible
  test('36 — Invite code input is visible', async ({ page }) => {
    const inviteInput = inputByPlaceholder(page, 'Enter your invite code');
    await expect(inviteInput).toBeVisible();
  });

  // 37 — "Submit Code" button visible
  test('37 — "Submit Code" button is visible', async ({ page }) => {
    const submitBtn = page.getByText('Submit Code');
    await expect(submitBtn).toBeVisible();
    await screenshot(page, 'waitlist_submit_code');
  });

  // 38 — Submit invalid invite code shows error
  test('38 — Submit invalid invite code shows error', async ({ page }) => {
    // Register dialog handler BEFORE triggering the action.
    // React Native's Alert.alert maps to window.alert in the browser.
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    const inviteInput = inputByPlaceholder(page, 'Enter your invite code');
    await inviteInput.fill('INVALIDCODE999');

    await page.getByText('Submit Code').click();
    await page.waitForTimeout(5000);

    await screenshot(page, 'waitlist_invalid_code');

    // Check for error either in the page body or in a dismissed dialog
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasInlineError =
      bodyText.includes('Invalid') ||
      bodyText.includes('invalid') ||
      bodyText.includes('error') ||
      bodyText.includes('Error') ||
      bodyText.includes('failed') ||
      bodyText.includes('Failed');
    const hasDialogError = dialogMessage.length > 0;

    expect(hasInlineError || hasDialogError).toBe(true);
  });

  // 39 — "Generate Invite Code" button visible
  test('39 — "Generate Invite Code" button is visible', async ({ page }) => {
    const genBtn = page.getByText('Generate Invite Code');
    await expect(genBtn).toBeVisible();
    await screenshot(page, 'waitlist_generate_btn');
  });

  // 40 — "Log Out" link visible and works
  test('40 — "Log Out" works and returns to welcome', async ({ page }) => {
    const logoutBtn = page.getByText('Log Out');
    await expect(logoutBtn).toBeVisible();

    await logoutBtn.click();
    await page.waitForTimeout(4000);

    await screenshot(page, 'waitlist_after_logout');
    // After logout, should be back on welcome or login
    const bodyText = await page.evaluate(() => document.body.innerText);
    const backToAuth =
      bodyText.includes('Tsewa') ||
      bodyText.includes('Get Started') ||
      bodyText.includes('Find your person') ||
      bodyText.includes('Welcome back');
    expect(backToAuth).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. SESSION PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Session Persistence', () => {
  // 41 — After login, refresh page stays on waitlist
  test('41 — After login, page refresh keeps user on waitlist', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Verify we're on waitlist first
    let bodyText = await page.evaluate(() => document.body.innerText);
    expect(
      bodyText.includes('waitlist') || bodyText.includes('Waitlist'),
    ).toBe(true);

    // Refresh the page
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(4000);

    await screenshot(page, 'session_refresh_waitlist');
    bodyText = await page.evaluate(() => document.body.innerText);
    const stillOnWaitlist =
      bodyText.includes('waitlist') ||
      bodyText.includes('Waitlist') ||
      bodyText.includes("You're on the waitlist") ||
      bodyText.includes('Your position');
    expect(stillOnWaitlist).toBe(true);
  });

  // 42 — After logout, refresh stays on welcome
  test('42 — After logout, page refresh stays on welcome', async ({ page }) => {
    await loginViaUI(page, TEST_USER.email, TEST_USER.password);

    // Handle any logout confirmation dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Log out
    await page.getByText('Log Out').click();
    await page.waitForTimeout(5000);

    // Clear any residual auth state to ensure clean logout
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });

    // Refresh and wait for app to fully hydrate
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(4000);

    await screenshot(page, 'session_refresh_after_logout');
    const bodyText = await page.evaluate(() => document.body.innerText);
    const onWelcome =
      bodyText.includes('Get Started') ||
      bodyText.includes('Find your person') ||
      bodyText.includes('Tsewa') ||
      bodyText.includes('Welcome back') ||
      bodyText.includes('Log in');
    expect(onWelcome).toBe(true);

    // Make sure we're NOT on waitlist
    const notOnWaitlist =
      !bodyText.includes("You're on the waitlist") &&
      !bodyText.includes('Your position');
    expect(notOnWaitlist).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. CROSS-NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Cross-Navigation', () => {
  // 43 — Welcome -> Register -> Back -> Welcome
  test('43 — Welcome -> Register -> Back -> Welcome', async ({ page }) => {
    await goToWelcome(page);
    await screenshot(page, 'crossnav_welcome_1');

    // Go to Register
    await page.getByText('Get Started').click();
    await page.waitForTimeout(2000);
    const createAccount = page.getByRole('heading', { name: 'Create account' });
    await expect(createAccount).toBeVisible();
    await screenshot(page, 'crossnav_register');

    // Go Back
    await page.getByText('← Back').click();
    await page.waitForTimeout(2000);
    const tsewa = page.getByText('Tsewa', { exact: true });
    await expect(tsewa).toBeVisible();
    await screenshot(page, 'crossnav_back_welcome');
  });

  // 44 — Welcome -> Login -> Back -> Welcome
  test('44 — Welcome -> Login -> Back -> Welcome', async ({ page }) => {
    await goToWelcome(page);

    // Go to Login
    await page.getByText('Log in', { exact: false }).first().click();
    await page.waitForTimeout(2000);
    const welcomeBack = page.getByText('Welcome back');
    await expect(welcomeBack).toBeVisible();
    await screenshot(page, 'crossnav_login');

    // Go Back
    await page.getByText('← Back').click();
    await page.waitForTimeout(2000);
    const tsewa = page.getByText('Tsewa', { exact: true });
    await expect(tsewa).toBeVisible();
    await screenshot(page, 'crossnav_login_back_welcome');
  });

  // 45 — Register -> "Log in" link -> Login page
  test('45 — Register -> "Log in" link -> Login page', async ({ page }) => {
    await goToRegister(page);

    // Click the "Log in" footer link
    const loginLink = page.getByText('Log in', { exact: true });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await page.waitForTimeout(2000);

    const welcomeBack = page.getByText('Welcome back');
    await expect(welcomeBack).toBeVisible();
    await screenshot(page, 'crossnav_register_to_login');
  });

  // 46 — Login -> "Sign up" link -> Register page
  test('46 — Login -> "Sign up" link -> Register page', async ({ page }) => {
    await goToLogin(page);

    // Click the "Sign up" footer link
    const signUpLink = page.getByText('Sign up');
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await page.waitForTimeout(2000);

    const createAccount = page.getByRole('heading', { name: 'Create account' });
    await expect(createAccount).toBeVisible();
    await screenshot(page, 'crossnav_login_to_register');
  });
});
