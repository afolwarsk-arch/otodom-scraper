const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pl-PL',
  });
  const page = await context.newPage();

  let autocompleteUrl = null;
  page.on('request', (req) => {
    if (req.url().includes('operationName=autocomplete')) {
      autocompleteUrl = req.url();
    }
  });

  await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  try { await page.locator('#onetrust-accept-btn-handler').click({ timeout: 3000 }); } catch {}
  await page.waitForTimeout(500);

  const input = page.locator('[data-cy="search.form.location.button"]').first();
  await input.click();
  await page.keyboard.type('Wrocław', { delay: 100 });
  await page.waitForTimeout(2000);

  console.log('Pełny URL autocomplete:');
  console.log(autocompleteUrl);

  await browser.close();
})();
