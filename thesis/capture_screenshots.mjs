/**
 * Capture thesis screenshots from local dev server.
 * Usage: node thesis/capture_screenshots.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'screenshots');
const BASE = process.env.THESIS_BASE_URL || 'http://localhost:3000';

const shots = [
  { name: '01-landing-ar', url: '/ar', fullPage: true },
  { name: '02-landing-en', url: '/en', fullPage: true },
  { name: '03-login-ar', url: '/ar/login' },
  { name: '04-register-ar', url: '/ar/register' },
  { name: '05-plans-ar', url: '/ar/plans', fullPage: true },
  { name: '06-scans-list-ar', url: '/ar/scans' },
  { name: '07-scans-new-ar', url: '/ar/scans/new', fullPage: true },
  { name: '08-targets-ar', url: '/ar/targets' },
  { name: '09-jira-projects-ar', url: '/ar/jira/projects' },
  { name: '10-settings-jira-ar', url: '/ar/settings/jira' },
  { name: '11-billing-ar', url: '/ar/billing' },
  { name: '12-profile-ar', url: '/ar/profile' },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA',
  });
  const page = await context.newPage();

  for (const shot of shots) {
    const target = `${BASE}${shot.url}`;
    try {
      await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      const file = path.join(OUT_DIR, `${shot.name}.png`);
      await page.screenshot({
        path: file,
        fullPage: !!shot.fullPage,
      });
      console.log(`OK ${shot.name}`);
    } catch (err) {
      console.warn(`SKIP ${shot.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
