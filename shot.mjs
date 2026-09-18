import { chromium } from 'playwright';
const [,, url, out, theme, width] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({
  viewport: { width: Number(width) || 1440, height: 1000 },
  colorScheme: theme === 'dark' ? 'dark' : 'light',
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: true });
const errors = await page.evaluate(() => window.__errs || []);
console.log('ok', out, errors.length ? errors : '');
await browser.close();
