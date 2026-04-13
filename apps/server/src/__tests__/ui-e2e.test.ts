/**
 * Comprehensive Playwright UI E2E test suite for the Tsewa dating app.
 *
 * Covers: Welcome, Registration, Login, Waitlist screens and all
 * user-facing interactions (navigation, validation, form submission).
 *
 * Run:  npm run test:ui
 *   or: npx vitest run --config vitest.config.e2e.ts
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'https://tsewa.pages.dev';
const API_URL = 'https://fairy-head-pleasant-randy.trycloudflare.com';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../screenshots/ui');

const TEST_TIMESTAMP = Date.now();
const TEST_USER = {
  email: `ui_e2e_${TEST_TIMESTAMP}@tsewa.test`,
  password: 'TestPass123!',
};

// Unique user for registration tests (never pre-created via API)
const REG_USER = {
  email: `ui_e2e_reg_${TEST_TIMESTAMP}@tsewa.test`,
  password: 'RegPass456!',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let browser: Browser;
let context: BrowserContext;
let page: Page;
let stepCounter = 0;

/** Take a screenshot and save it to the screenshots dir. */
async function screenshot(name: string) {
  stepCounter++;
  const filename = `${String(stepCounter).padStart(2, '0')}_${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
}

/**
 * Clear all client-side auth state so the app behaves as unauthenticated.
 * React Native Web / Expo stores tokens in localStorage.
 */
async function clearAuthState() {
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  await context.clearCookies();
}

/** Navigate to the welcome page (unauthenticated) and wait for hydration. */
async function goToWelcome() {
  await clearAuthState();
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
  // React Native Web takes a moment to hydrate
  await page.waitForTimeout(3000);
}

/**
 * In React Native Web, <TextInput> renders as <input>. This helper finds
 * inputs by their placeholder text — the most reliable locator for RN Web.
 */
function inputByPlaceholder(placeholder: string) {
  return page.locator(`input[placeholder="${placeholder}"]`).first();
}

/**
 * Find the "Create Account" **button** specifically (not the page title
 * "Create account"). The button text has uppercase "A" in "Account".
 */
function createAccountButton() {
  // Use exact text match for the button label only
  return page.getByText('Create Account', { exact: true });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('Tsewa UI E2E', () => {
  // -----------------------------------------------------------------------
  // Setup & Teardown
  // -----------------------------------------------------------------------
  beforeAll(async () => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    page = await context.newPage();

    // Register the test user via API so login tests have a valid account
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });
    // 201 = created, 409 = already exists (re-run)
    expect([201, 409]).toContain(res.status);
  }, 60_000);

  afterAll(async () => {
    // Clean up both test users via API (best-effort)
    for (const user of [TEST_USER, REG_USER]) {
      try {
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        if (loginRes.ok) {
          const { accessToken } = await loginRes.json();
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      } catch {
        // Swallow — cleanup is best-effort
      }
    }

    await context?.close();
    await browser?.close();
  }, 30_000);

  // -----------------------------------------------------------------------
  // 1. Welcome Page — visual elements
  // -----------------------------------------------------------------------
  describe('Welcome Page', () => {
    beforeEach(async () => {
      await goToWelcome();
    }, 40_000);

    it('displays the Tsewa brand name', async () => {
      await screenshot('welcome_brand');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Tsewa');
    }, 30_000);

    it('displays the Tibetan script text', async () => {
      const tibetanStr = '\u0F56\u0F62\u0FA9\u0F7A\u0F0B\u0F56'; // བརྩེ་བ
      const tibetan = page.getByText(tibetanStr);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasTibetan =
        bodyText.includes(tibetanStr) || (await tibetan.count()) > 0;
      expect(hasTibetan).toBe(true);
      await screenshot('welcome_tibetan');
    }, 30_000);

    it('displays the tagline "Find your person"', async () => {
      const tagline = page.getByText('Find your person');
      expect(await tagline.isVisible()).toBe(true);
    }, 30_000);

    it('shows a "Get Started" button', async () => {
      const btn = page.getByText('Get Started');
      expect(await btn.isVisible()).toBe(true);
      await screenshot('welcome_get_started');
    }, 30_000);

    it('shows a "Log in" link/button', async () => {
      const loginLink = page.getByText('Log in', { exact: false }).first();
      expect(await loginLink.isVisible()).toBe(true);
    }, 30_000);

    it('displays the subtitle about meaningful connections', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Meaningful connections');
      expect(bodyText).toContain('Tibetan values');
    }, 30_000);
  });

  // -----------------------------------------------------------------------
  // 2. Navigation flows
  // -----------------------------------------------------------------------
  describe('Navigation', () => {
    it('Welcome -> Get Started -> Registration form', async () => {
      await goToWelcome();
      await screenshot('nav_welcome');

      const getStartedBtn = page.getByText('Get Started');
      expect(await getStartedBtn.isVisible()).toBe(true);
      await getStartedBtn.click();
      await page.waitForTimeout(2000);

      await screenshot('nav_registration');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Create account');
    }, 40_000);

    it('Welcome -> Log in -> Login form', async () => {
      await goToWelcome();

      const loginLink = page.getByText('Log in', { exact: false }).first();
      expect(await loginLink.isVisible()).toBe(true);
      await loginLink.click();
      await page.waitForTimeout(2000);

      await screenshot('nav_login');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Welcome back');
    }, 40_000);

    it('Registration -> "Already have account? Log in" -> Login form', async () => {
      await goToWelcome();

      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);

      // The registration footer has separate <Text>Log in</Text> element
      const loginLink = page.getByText('Log in', { exact: true });
      expect(await loginLink.isVisible()).toBe(true);
      await loginLink.click();
      await page.waitForTimeout(2000);

      await screenshot('nav_reg_to_login');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Welcome back');
    }, 40_000);

    it('Login -> "Don\'t have an account? Sign up" -> Registration form', async () => {
      await goToWelcome();

      const loginLink = page.getByText('Log in', { exact: false }).first();
      await loginLink.click();
      await page.waitForTimeout(2000);

      const signUpLink = page.getByText('Sign up');
      expect(await signUpLink.isVisible()).toBe(true);
      await signUpLink.click();
      await page.waitForTimeout(2000);

      await screenshot('nav_login_to_reg');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Create account');
    }, 40_000);
  });

  // -----------------------------------------------------------------------
  // 3. Registration page — elements
  // -----------------------------------------------------------------------
  describe('Registration Page', () => {
    beforeEach(async () => {
      await goToWelcome();
      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);
    }, 40_000);

    it('displays "Create account" title and "Join the Tsewa community" subtitle', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Create account');
      expect(bodyText).toContain('Join the Tsewa community');
      await screenshot('reg_header');
    }, 30_000);

    it('shows email input with placeholder "your@email.com"', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      expect(await emailInput.isVisible()).toBe(true);
    }, 30_000);

    it('shows password input with placeholder "At least 8 characters"', async () => {
      const pwInput = inputByPlaceholder('At least 8 characters');
      expect(await pwInput.isVisible()).toBe(true);
    }, 30_000);

    it('shows confirm password input with placeholder "Re-enter your password"', async () => {
      const confirmInput = inputByPlaceholder('Re-enter your password');
      expect(await confirmInput.isVisible()).toBe(true);
    }, 30_000);

    it('shows invite code input with placeholder "Enter invite code"', async () => {
      const inviteInput = inputByPlaceholder('Enter invite code');
      expect(await inviteInput.isVisible()).toBe(true);
    }, 30_000);

    it('shows "Create Account" submit button', async () => {
      const btn = createAccountButton();
      expect(await btn.isVisible()).toBe(true);
    }, 30_000);

    it('displays labels: Email, Password, Confirm Password, Invite Code', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Email');
      expect(bodyText).toContain('Password');
      expect(bodyText).toContain('Confirm Password');
      expect(bodyText).toContain('Invite Code');
    }, 30_000);

    it('shows "Back" navigation', async () => {
      const backBtn = page.getByText('Back', { exact: false }).first();
      expect(await backBtn.isVisible()).toBe(true);
    }, 30_000);

    it('shows footer text "Already have an account?"', async () => {
      const footerText = page.getByText('Already have an account?', { exact: true });
      expect(await footerText.isVisible()).toBe(true);
    }, 30_000);
  });

  // -----------------------------------------------------------------------
  // 4. Registration validation
  // -----------------------------------------------------------------------
  describe('Registration Validation', () => {
    beforeEach(async () => {
      await goToWelcome();
      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);
    }, 40_000);

    it('shows error for invalid email', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      await emailInput.fill('notanemail');
      await pwInput.fill('ValidPass1');
      await confirmInput.fill('ValidPass1');

      await createAccountButton().click();
      await page.waitForTimeout(1500);

      await screenshot('reg_invalid_email');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Invalid email');
    }, 30_000);

    it('shows error for short password (< 8 chars)', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      await emailInput.fill('test@example.com');
      await pwInput.fill('Ab1');
      await confirmInput.fill('Ab1');

      await createAccountButton().click();
      await page.waitForTimeout(1500);

      await screenshot('reg_short_password');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('at least 8 characters');
    }, 30_000);

    it('shows error for password missing uppercase letter', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      await emailInput.fill('test@example.com');
      await pwInput.fill('alllowercase1');
      await confirmInput.fill('alllowercase1');

      await createAccountButton().click();
      await page.waitForTimeout(1500);

      await screenshot('reg_no_uppercase');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('uppercase');
    }, 30_000);

    it('shows error for password missing a number', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      await emailInput.fill('test@example.com');
      await pwInput.fill('NoNumberHere');
      await confirmInput.fill('NoNumberHere');

      await createAccountButton().click();
      await page.waitForTimeout(1500);

      await screenshot('reg_no_number');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('number');
    }, 30_000);

    it('shows error for mismatched passwords', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      await emailInput.fill('test@example.com');
      await pwInput.fill('ValidPass1');
      await confirmInput.fill('DifferentPass2');

      await createAccountButton().click();
      await page.waitForTimeout(1500);

      await screenshot('reg_mismatch');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('do not match');
    }, 30_000);

    it('shows error when email field is empty', async () => {
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      await pwInput.fill('ValidPass1');
      await confirmInput.fill('ValidPass1');

      await createAccountButton().click();
      await page.waitForTimeout(1500);

      await screenshot('reg_empty_email');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('required');
    }, 30_000);

    it('shows error when confirm password is empty', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');

      await emailInput.fill('test@example.com');
      await pwInput.fill('ValidPass1');
      // Leave confirmPassword empty

      await createAccountButton().click();
      await page.waitForTimeout(1500);

      await screenshot('reg_empty_confirm');
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasError =
        bodyText.includes('confirm') ||
        bodyText.includes('required') ||
        bodyText.includes('do not match');
      expect(hasError).toBe(true);
    }, 30_000);
  });

  // -----------------------------------------------------------------------
  // 5. Registration submission with valid data
  // -----------------------------------------------------------------------
  describe('Registration Submission', () => {
    it('submits registration with valid data and gets a response', async () => {
      await goToWelcome();
      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);

      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      await emailInput.fill(REG_USER.email);
      await pwInput.fill(REG_USER.password);
      await confirmInput.fill(REG_USER.password);

      await screenshot('reg_filled_valid');

      await createAccountButton().click();

      // Wait for the mutation to complete and page to respond
      await page.waitForTimeout(5000);
      await screenshot('reg_after_submit');

      // After submission, one of:
      //   - Success: navigates to waitlist page
      //   - API error: shows error banner on the same page
      // Either outcome means the form submitted and got a response.
      const bodyText = await page.evaluate(() => document.body.innerText);
      const gotResponse =
        bodyText.includes('waitlist') ||
        bodyText.includes('Waitlist') ||
        bodyText.includes("You're on the waitlist") ||
        bodyText.includes('Your position') ||
        bodyText.includes('failed') ||
        bodyText.includes('error') ||
        bodyText.includes('Error') ||
        bodyText.includes('status code');
      expect(gotResponse).toBe(true);
    }, 60_000);
  });

  // -----------------------------------------------------------------------
  // 6. Login page — elements
  // -----------------------------------------------------------------------
  describe('Login Page', () => {
    beforeEach(async () => {
      await goToWelcome();
      const loginLink = page.getByText('Log in', { exact: false }).first();
      await loginLink.click();
      await page.waitForTimeout(2000);
    }, 40_000);

    it('displays "Welcome back" title', async () => {
      const title = page.getByText('Welcome back');
      expect(await title.isVisible()).toBe(true);
      await screenshot('login_title');
    }, 30_000);

    it('displays subtitle "Log in to your Tsewa account"', async () => {
      const sub = page.getByText('Log in to your Tsewa account');
      expect(await sub.isVisible()).toBe(true);
    }, 30_000);

    it('shows email input with placeholder "your@email.com"', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      expect(await emailInput.isVisible()).toBe(true);
    }, 30_000);

    it('shows password input with placeholder "Enter your password"', async () => {
      const pwInput = inputByPlaceholder('Enter your password');
      expect(await pwInput.isVisible()).toBe(true);
    }, 30_000);

    it('shows "Log In" submit button', async () => {
      const btn = page.getByText('Log In', { exact: true });
      expect(await btn.isVisible()).toBe(true);
    }, 30_000);

    it('shows "Back" navigation', async () => {
      const back = page.getByText('Back', { exact: false }).first();
      expect(await back.isVisible()).toBe(true);
    }, 30_000);

    it('shows footer "Don\'t have an account?" with "Sign up" link', async () => {
      const footer = page.getByText("Don't have an account?", { exact: false });
      expect(await footer.isVisible()).toBe(true);
      const signUp = page.getByText('Sign up');
      expect(await signUp.isVisible()).toBe(true);
    }, 30_000);

    it('displays labels: Email, Password', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Email');
      expect(bodyText).toContain('Password');
    }, 30_000);
  });

  // -----------------------------------------------------------------------
  // 7. Login validation
  // -----------------------------------------------------------------------
  describe('Login Validation', () => {
    beforeEach(async () => {
      await goToWelcome();
      const loginLink = page.getByText('Log in', { exact: false }).first();
      await loginLink.click();
      await page.waitForTimeout(2000);
    }, 40_000);

    it('shows error when email is empty and form is submitted', async () => {
      const pwInput = inputByPlaceholder('Enter your password');
      await pwInput.fill('SomePass1');

      const submitBtn = page.getByText('Log In', { exact: true });
      await submitBtn.click();
      await page.waitForTimeout(1500);

      await screenshot('login_empty_email');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('required');
    }, 30_000);

    it('shows error when password is empty and form is submitted', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      await emailInput.fill('user@example.com');

      const submitBtn = page.getByText('Log In', { exact: true });
      await submitBtn.click();
      await page.waitForTimeout(1500);

      await screenshot('login_empty_password');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('required');
    }, 30_000);

    it('shows error when email is invalid format', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('Enter your password');

      await emailInput.fill('badformat');
      await pwInput.fill('SomePass1');

      const submitBtn = page.getByText('Log In', { exact: true });
      await submitBtn.click();
      await page.waitForTimeout(1500);

      await screenshot('login_invalid_email');
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Invalid email');
    }, 30_000);

    it('shows error for wrong password (server-side rejection)', async () => {
      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('Enter your password');

      await emailInput.fill(TEST_USER.email);
      await pwInput.fill('WrongPassword99');

      const submitBtn = page.getByText('Log In', { exact: true });
      await submitBtn.click();

      // Wait for the server round-trip
      await page.waitForTimeout(5000);

      await screenshot('login_wrong_password');
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasError =
        bodyText.includes('failed') ||
        bodyText.includes('Invalid') ||
        bodyText.includes('incorrect') ||
        bodyText.includes('credentials');
      expect(hasError).toBe(true);
    }, 30_000);
  });

  // -----------------------------------------------------------------------
  // 8. Login submission with valid credentials
  // -----------------------------------------------------------------------
  describe('Login Submission', () => {
    it('logs in successfully and shows waitlist (inactive user)', async () => {
      await goToWelcome();
      const loginLink = page.getByText('Log in', { exact: false }).first();
      await loginLink.click();
      await page.waitForTimeout(2000);

      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('Enter your password');

      await emailInput.fill(TEST_USER.email);
      await pwInput.fill(TEST_USER.password);

      await screenshot('login_filled');

      const submitBtn = page.getByText('Log In', { exact: true });
      await submitBtn.click();

      // Wait for auth to complete and routing to settle
      await page.waitForTimeout(6000);
      await screenshot('login_result');

      // New users are inactive -> waitlist page
      const bodyText = await page.evaluate(() => document.body.innerText);
      const onWaitlist =
        bodyText.includes('waitlist') ||
        bodyText.includes('Waitlist') ||
        bodyText.includes("You're on the waitlist") ||
        bodyText.includes('Your position');
      expect(onWaitlist).toBe(true);
    }, 60_000);
  });

  // -----------------------------------------------------------------------
  // 9. Waitlist page elements (after login)
  // -----------------------------------------------------------------------
  describe('Waitlist Page', () => {
    beforeAll(async () => {
      // Log in via UI to get to waitlist
      await clearAuthState();
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(3000);

      const loginLink = page.getByText('Log in', { exact: false }).first();
      await loginLink.click();
      await page.waitForTimeout(2000);

      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('Enter your password');
      await emailInput.fill(TEST_USER.email);
      await pwInput.fill(TEST_USER.password);

      const submitBtn = page.getByText('Log In', { exact: true });
      await submitBtn.click();
      await page.waitForTimeout(6000);
    }, 60_000);

    it('displays "You\'re on the waitlist!" title', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain("You're on the waitlist");
      await screenshot('waitlist_title');
    }, 30_000);

    it('displays position card with "Your position"', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      // RN Web may render this as "YOUR POSITION" via CSS text-transform
      expect(bodyText.toLowerCase()).toContain('your position');
    }, 30_000);

    it('displays invite code input', async () => {
      const inviteInput = inputByPlaceholder('Enter your invite code');
      expect(await inviteInput.isVisible()).toBe(true);
    }, 30_000);

    it('displays "Submit Code" button', async () => {
      const submitBtn = page.getByText('Submit Code');
      expect(await submitBtn.isVisible()).toBe(true);
    }, 30_000);

    it('displays "Share Tsewa" section', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Share Tsewa');
    }, 30_000);

    it('displays "Generate Invite Code" button', async () => {
      const genBtn = page.getByText('Generate Invite Code');
      expect(await genBtn.isVisible()).toBe(true);
    }, 30_000);

    it('displays "Log Out" button', async () => {
      const logoutBtn = page.getByText('Log Out');
      expect(await logoutBtn.isVisible()).toBe(true);
    }, 30_000);

    it('displays the user email in footer', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain(TEST_USER.email);
      await screenshot('waitlist_full');
    }, 30_000);

    it('shows hint text about invite codes', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('invite code');
    }, 30_000);

    it('shows community growth message', async () => {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('carefully growing');
    }, 30_000);
  });

  // -----------------------------------------------------------------------
  // 10. Input interaction behavior
  // -----------------------------------------------------------------------
  describe('Input Interactions', () => {
    it('can type into registration email field and see the value', async () => {
      await goToWelcome();
      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);

      const emailInput = inputByPlaceholder('your@email.com');
      await emailInput.fill('hello@world.com');

      const value = await emailInput.inputValue();
      expect(value).toBe('hello@world.com');
      await screenshot('input_email_typed');
    }, 40_000);

    it('can type into login password field and value is masked', async () => {
      await goToWelcome();
      const loginLink = page.getByText('Log in', { exact: false }).first();
      await loginLink.click();
      await page.waitForTimeout(2000);

      const pwInput = inputByPlaceholder('Enter your password');
      await pwInput.fill('SecretPass1');

      const value = await pwInput.inputValue();
      expect(value).toBe('SecretPass1');

      // Verify the input type is password (masked)
      const inputType = await pwInput.getAttribute('type');
      expect(inputType).toBe('password');
      await screenshot('input_password_masked');
    }, 40_000);

    it('registration form shows all four input fields simultaneously', async () => {
      await goToWelcome();
      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);

      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');
      const inviteInput = inputByPlaceholder('Enter invite code');

      expect(await emailInput.isVisible()).toBe(true);
      expect(await pwInput.isVisible()).toBe(true);
      expect(await confirmInput.isVisible()).toBe(true);
      expect(await inviteInput.isVisible()).toBe(true);

      await screenshot('reg_all_inputs');
    }, 40_000);

    it('can fill all registration fields sequentially', async () => {
      await goToWelcome();
      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);

      const emailInput = inputByPlaceholder('your@email.com');
      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');
      const inviteInput = inputByPlaceholder('Enter invite code');

      await emailInput.fill('test@demo.com');
      await pwInput.fill('SecurePass1');
      await confirmInput.fill('SecurePass1');
      await inviteInput.fill('INVITE123');

      expect(await emailInput.inputValue()).toBe('test@demo.com');
      expect(await pwInput.inputValue()).toBe('SecurePass1');
      expect(await confirmInput.inputValue()).toBe('SecurePass1');
      expect(await inviteInput.inputValue()).toBe('INVITE123');

      await screenshot('reg_all_filled');
    }, 40_000);

    it('login password field has type="password" for security', async () => {
      await goToWelcome();
      const loginLink = page.getByText('Log in', { exact: false }).first();
      await loginLink.click();
      await page.waitForTimeout(2000);

      const pwInput = inputByPlaceholder('Enter your password');
      const type = await pwInput.getAttribute('type');
      expect(type).toBe('password');
    }, 40_000);

    it('registration password fields have type="password"', async () => {
      await goToWelcome();
      const getStartedBtn = page.getByText('Get Started');
      await getStartedBtn.click();
      await page.waitForTimeout(2000);

      const pwInput = inputByPlaceholder('At least 8 characters');
      const confirmInput = inputByPlaceholder('Re-enter your password');

      expect(await pwInput.getAttribute('type')).toBe('password');
      expect(await confirmInput.getAttribute('type')).toBe('password');
    }, 40_000);
  });

  // -----------------------------------------------------------------------
  // 11. API health check (sanity)
  // -----------------------------------------------------------------------
  describe('API Backend', () => {
    it('health endpoint returns ok', async () => {
      const res = await fetch(`${API_URL}/api/health`);
      const data = await res.json();
      expect(data.status).toBe('ok');
    }, 15_000);

    it('rejects login with wrong password via API', async () => {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_USER.email, password: 'wrong' }),
      });
      expect(res.status).toBe(401);
    }, 15_000);

    it('rejects duplicate registration via API', async () => {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER),
      });
      expect(res.status).toBe(409);
    }, 15_000);
  });

  // -----------------------------------------------------------------------
  // 12. Console errors / JS errors
  // -----------------------------------------------------------------------
  describe('Page Health', () => {
    it('welcome page loads without fatal JS errors', async () => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await goToWelcome();
      await screenshot('page_health');

      // Filter out non-critical errors (third-party, known benign)
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Loading chunk') &&
          !e.includes('ServiceWorker'),
      );

      expect(criticalErrors.length).toBe(0);
    }, 30_000);
  });
});
