const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pl-PL',
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();

  await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/dolnoslaskie/wroclaw?limit=10&by=LATEST&direction=DESC',
    { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);

  const nextData = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    return el ? JSON.parse(el.textContent) : null;
  });

  if (!nextData) { console.log('Brak __NEXT_DATA__'); await browser.close(); return; }

  // Znajdz tablice z ofertami
  const props = nextData?.props?.pageProps;
  const keys = Object.keys(props || {});
  console.log('Klucze pageProps:', keys);

  // Sprobuj znalezc items
  const data = props?.data;
  if (data) {
    console.log('Klucze data:', Object.keys(data));
    const searchAds = data?.searchAds;
    if (searchAds) {
      console.log('Klucze searchAds:', Object.keys(searchAds));
      const items = searchAds?.items;
      if (items && items.length > 0) {
        console.log('Liczba items:', items.length);
        console.log('Pierwsza oferta (klucze):', Object.keys(items[0]));
        console.log('Pierwsza oferta:', JSON.stringify(items[0], null, 2).substring(0, 2000));
      }
    }
  }

  fs.writeFileSync('nextdata-debug.json', JSON.stringify(nextData?.props?.pageProps?.data || nextData, null, 2).substring(0, 100000));
  console.log('Zapisano nextdata-debug.json');

  await browser.close();
})();
