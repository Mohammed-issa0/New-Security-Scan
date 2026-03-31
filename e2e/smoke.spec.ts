import { expect, test, type Page } from '@playwright/test';

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const JIRA_URL = process.env.E2E_JIRA_URL;
const JIRA_USER = process.env.E2E_JIRA_USER;
const JIRA_TOKEN = process.env.E2E_JIRA_TOKEN;
const JIRA_PROJECT_KEY = process.env.E2E_JIRA_PROJECT_KEY;
const JIRA_ISSUE_TYPE = process.env.E2E_JIRA_ISSUE_TYPE || 'Task';

async function loginByUI(page: Page, email: string, password: string) {
  await page.goto('/en/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/en\/(scans|admin)(\/.*)?$/);
}

async function createTargetViaUI(page: Page, targetUrl: string) {
  await page.goto('/en/targets');
  await page.getByTestId('targets-open-create').click();
  await page.getByTestId('target-url-input').fill(targetUrl);
  await page.getByTestId('target-create-submit').click();
  await expect(page.getByText(targetUrl)).toBeVisible({ timeout: 20000 });
}

test.describe('End-to-end smoke scenarios', () => {
  test('login flow test', async ({ page }) => {
    test.skip(!USER_EMAIL || !USER_PASSWORD, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');
    await loginByUI(page, USER_EMAIL!, USER_PASSWORD!);
    await expect(page).toHaveURL(/\/en\/scans/);
  });

  test('create target test', async ({ page }) => {
    test.skip(!USER_EMAIL || !USER_PASSWORD, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');
    await loginByUI(page, USER_EMAIL!, USER_PASSWORD!);

    const targetUrl = `https://smoke-${Date.now()}.example.com`;
    await createTargetViaUI(page, targetUrl);
  });

  test('create scan test', async ({ page }) => {
    test.skip(!USER_EMAIL || !USER_PASSWORD, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');
    await loginByUI(page, USER_EMAIL!, USER_PASSWORD!);

    const targetUrl = `https://scan-smoke-${Date.now()}.example.com`;
    await createTargetViaUI(page, targetUrl);

    await page.goto('/en/scans/new');
    await page.locator('input[name="name"]').fill(`Smoke Scan ${Date.now()}`);
    await page.locator('select[name="targetId"]').selectOption({ label: targetUrl });

    await page.locator('button[form="scan-form"]').click();
    await expect(page).toHaveURL(/\/en\/scans\/[0-9a-f-]{10,}/i, { timeout: 30000 });
  });

  test('report export test', async ({ page }) => {
    test.skip(!USER_EMAIL || !USER_PASSWORD, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');
    await loginByUI(page, USER_EMAIL!, USER_PASSWORD!);

    await page.goto('/en/scans');
    const detailsLink = page.getByRole('link', { name: /view/i }).first();
    if ((await detailsLink.count()) === 0) {
      test.skip(true, 'No scans available to export');
    }

    await detailsLink.click();
    await expect(page).toHaveURL(/\/en\/scans\//, { timeout: 15000 });

    const exportButton = page.getByTestId('scan-export-pdf');
    await expect(exportButton).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      exportButton.click(),
    ]);

    expect(download.suggestedFilename().toLowerCase()).toContain('.pdf');
  });

  test('Jira config test', async ({ page }) => {
    test.skip(!USER_EMAIL || !USER_PASSWORD, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');
    test.skip(!JIRA_URL || !JIRA_USER || !JIRA_TOKEN || !JIRA_PROJECT_KEY, 'Set Jira env vars for smoke config creation');
    await loginByUI(page, USER_EMAIL!, USER_PASSWORD!);

    await page.goto('/en/jira/projects');
    await page.getByTestId('jira-open-create').click();

    const name = `Smoke Jira ${Date.now()}`;
    await page.getByTestId('jira-create-name').fill(name);
    await page.getByTestId('jira-create-project-key').fill(JIRA_PROJECT_KEY!);
    await page.getByTestId('jira-create-url').fill(JIRA_URL!);
    await page.getByTestId('jira-create-user').fill(JIRA_USER!);
    await page.getByTestId('jira-create-issue-type').fill(JIRA_ISSUE_TYPE);
    await page.getByTestId('jira-create-token').fill(JIRA_TOKEN!);
    await page.getByTestId('jira-create-submit').click();

    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20000 });
  });

  test('admin smoke test', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
    await loginByUI(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);

    const adminRoutes = [
      '/en/admin',
      '/en/admin/users',
      '/en/admin/scans',
      '/en/admin/audit-logs',
      '/en/admin/queue',
      '/en/admin/plans',
      '/en/admin/billing',
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
