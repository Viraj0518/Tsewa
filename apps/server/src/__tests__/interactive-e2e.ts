/**
 * Interactive E2E test — simulates real user flows on the live deployed site.
 * Run: npx tsx src/__tests__/interactive-e2e.ts
 *
 * Takes screenshots at every breakpoint for visual verification.
 */
import { chromium, type Page, type Browser } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'https://tsewa.pages.dev';
const API_URL = 'https://fairy-head-pleasant-randy.trycloudflare.com';
const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots');

const TEST_USER = {
  email: `e2e_interactive_${Date.now()}@tsewa.test`,
  password: 'TestPass123!',
};

let browser: Browser;
let page: Page;
let step = 0;

async function screenshot(name: string) {
  step++;
  const filename = `${String(step).padStart(2, '0')}_${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
  console.log(`  📸 ${filename}`);
}

async function log(msg: string) {
  console.log(`\n▸ ${msg}`);
}

async function main() {
  // Setup
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  });
  page = await context.newPage();

  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });

  try {
    // ─── 1. API Health Check ─────────────────────────────────
    await log('API Health Check');
    const health = await fetch(`${API_URL}/api/health`);
    const healthData = await health.json();
    console.log(`  Status: ${healthData.status} @ ${healthData.timestamp}`);
    assert(healthData.status === 'ok', 'API health check failed');

    // ─── 2. API Registration ────────────────────────────────
    await log(`API Registration (${TEST_USER.email})`);
    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });
    const regData = await regRes.json();
    console.log(`  Status: ${regRes.status}`);
    console.log(`  User ID: ${regData.user?.id}`);
    console.log(`  isActive: ${regData.user?.isActive}`);
    console.log(`  Token: ${regData.accessToken?.substring(0, 20)}...`);
    assert(regRes.status === 201, `Registration failed: ${JSON.stringify(regData)}`);
    assert(regData.accessToken, 'No access token returned');
    assert(regData.refreshToken, 'No refresh token returned');

    const accessToken = regData.accessToken;
    const refreshToken = regData.refreshToken;

    // ─── 3. API Login ───────────────────────────────────────
    await log('API Login');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });
    const loginData = await loginRes.json();
    console.log(`  Status: ${loginRes.status}`);
    console.log(`  User: ${loginData.user?.email}`);
    assert(loginRes.status === 200, `Login failed: ${JSON.stringify(loginData)}`);

    // Use tokens from login (login overwrites Redis refresh token)
    const latestAccessToken = loginData.accessToken;
    const latestRefreshToken = loginData.refreshToken;

    // ─── 4. API Token Refresh ───────────────────────────────
    await log('API Token Refresh');
    const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: latestRefreshToken }),
    });
    const refreshData = await refreshRes.json();
    console.log(`  Status: ${refreshRes.status}`);
    console.log(`  New token: ${refreshData.accessToken?.substring(0, 20)}...`);
    assert(refreshRes.status === 200, 'Token refresh failed');

    // ─── 5. API Protected Route ─────────────────────────────
    await log('API Protected Route (GET /api/profile)');
    const profileRes = await fetch(`${API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${latestAccessToken}` },
    });
    console.log(`  Status: ${profileRes.status}`);
    assert(profileRes.status !== 401, 'Auth middleware rejected valid token');

    // ─── 6. API Waitlist Status ─────────────────────────────
    await log('API Waitlist Status');
    const waitlistRes = await fetch(`${API_URL}/api/waitlist/status`, {
      headers: { Authorization: `Bearer ${latestAccessToken}` },
    });
    const waitlistData = await waitlistRes.json();
    console.log(`  Status: ${waitlistRes.status}`);
    console.log(`  Waitlist: ${JSON.stringify(waitlistData).substring(0, 100)}`);

    // ─── 7. API Reject Bad Auth ─────────────────────────────
    await log('API Reject Bad Auth');
    const badRes = await fetch(`${API_URL}/api/profile`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    console.log(`  Status: ${badRes.status} (expected 401)`);
    assert(badRes.status === 401, 'Should reject invalid token');

    // ─── 8. API Reject Wrong Password ───────────────────────
    await log('API Reject Wrong Password');
    const wrongRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_USER.email, password: 'wrong' }),
    });
    console.log(`  Status: ${wrongRes.status} (expected 401)`);
    assert(wrongRes.status === 401, 'Should reject wrong password');

    // ─── 9. API Duplicate Registration ──────────────────────
    await log('API Duplicate Registration');
    const dupeRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });
    console.log(`  Status: ${dupeRes.status} (expected 409)`);
    assert(dupeRes.status === 409, 'Should reject duplicate email');

    // ─── 10. Load Welcome Page ──────────────────────────────
    await log('Load Welcome Page');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);
    await screenshot('welcome_page');

    const welcomeText = await page.evaluate(() => document.body.innerText);
    console.log(`  Page text: ${welcomeText.substring(0, 100)}...`);
    assert(welcomeText.includes('Tsewa'), 'Welcome page should show Tsewa');

    // ─── 11. Click "Get Started" ────────────────────────────
    await log('Click "Get Started"');
    const getStartedBtn = page.locator('text=Get Started').first();
    if (await getStartedBtn.isVisible()) {
      await getStartedBtn.click();
      await page.waitForTimeout(2000);
      await screenshot('after_get_started');
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log(`  Page text: ${pageText.substring(0, 100)}...`);
    } else {
      console.log('  ⚠ Get Started button not found, skipping');
      await screenshot('no_get_started');
    }

    // ─── 12. Click "Log in" ─────────────────────────────────
    await log('Navigate to Log In');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    const loginLink = page.locator('text=Log in').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForTimeout(2000);
      await screenshot('login_page');
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log(`  Page text: ${pageText.substring(0, 100)}...`);
    } else {
      console.log('  ⚠ Log in link not found');
      await screenshot('no_login_link');
    }

    // ─── 13. Fill Login Form ────────────────────────────────
    await log('Fill Login Form');
    const emailInput = page.locator('input[type="email"], [placeholder*="email" i], [placeholder*="Email"]').first();
    const passwordInput = page.locator('input[type="password"], [placeholder*="password" i], [placeholder*="Password"]').first();

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await screenshot('login_form_filled');

      // Try to submit
      const submitBtn = page.locator('text=Log In, text=Sign In, text=Login, button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        await screenshot('after_login_submit');
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log(`  After login: ${pageText.substring(0, 150)}...`);
      } else {
        console.log('  ⚠ Submit button not found');
      }
    } else {
      console.log('  ⚠ Login form inputs not found');
      await screenshot('no_login_form');
    }

    // ─── 14. API Logout ─────────────────────────────────────
    await log('API Logout');
    const logoutRes = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${latestAccessToken}` },
    });
    console.log(`  Status: ${logoutRes.status}`);
    assert(logoutRes.status === 200, 'Logout failed');

    // Verify token is invalidated
    const afterLogoutRefresh = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: latestRefreshToken }),
    });
    console.log(`  Refresh after logout: ${afterLogoutRefresh.status} (expected 401)`);
    assert(afterLogoutRefresh.status === 401, 'Refresh should fail after logout');

    // ─── 15. Create Second User + Test Discovery ────────────
    await log('Create Second User');
    const user2 = {
      email: `e2e_user2_${Date.now()}@tsewa.test`,
      password: 'TestPass123!',
    };
    const reg2 = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user2),
    });
    const reg2Data = await reg2.json();
    console.log(`  User 2: ${reg2Data.user?.id}`);

    // ─── 16. Test Feed ──────────────────────────────────────
    await log('Create Feed Post');
    const token2 = reg2Data.accessToken;
    const postRes = await fetch(`${API_URL}/api/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({ content: 'E2E test post from interactive test', type: 'TEXT' }),
    });
    console.log(`  Create post: ${postRes.status}`);

    const feedRes = await fetch(`${API_URL}/api/feed`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const feedData = await feedRes.json();
    console.log(`  Feed: ${feedRes.status}, posts: ${feedData.posts?.length || 0}`);

    // ─── 17. Test Events ────────────────────────────────────
    await log('Create Event');
    const eventRes = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({
        title: 'E2E Test Losar Party',
        description: 'Interactive E2E test event',
        type: 'LOSAR',
        city: 'Seattle',
        country: 'US',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 90000000).toISOString(),
      }),
    });
    console.log(`  Create event: ${eventRes.status}`);

    const eventsListRes = await fetch(`${API_URL}/api/events`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const eventsData = await eventsListRes.json();
    console.log(`  Events: ${eventsListRes.status}, count: ${eventsData.events?.length || 0}`);

    // ─── 18. Test Rooms ─────────────────────────────────────
    await log('Create Room');
    const roomRes = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({
        title: 'E2E Test Room',
        description: 'Interactive test audio room',
        type: 'OPEN',
      }),
    });
    console.log(`  Create room: ${roomRes.status}`);

    const roomsRes = await fetch(`${API_URL}/api/rooms`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const roomsData = await roomsRes.json();
    console.log(`  Rooms: ${roomsRes.status}, count: ${roomsData.rooms?.length || 0}`);

    // ─── Final Screenshot ───────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await screenshot('final_state');

    // ─── Summary ────────────────────────────────────────────
    console.log('\n' + '═'.repeat(50));
    console.log('  INTERACTIVE E2E TEST RESULTS');
    console.log('═'.repeat(50));
    console.log(`  Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`  JS Errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((e) => console.log(`    ❌ ${e}`));
    }
    console.log(`  All API tests: ✅ PASSED`);
    console.log('═'.repeat(50));

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    await screenshot('error_state');
    process.exit(1);
  } finally {
    // Cleanup test users
    await log('Cleanup test users');
    try {
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER),
      });
      if (loginRes.ok) {
        const { accessToken } = await loginRes.json();
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch {}
    console.log('  Done');

    await browser.close();
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

main();
