const { chromium } = require('playwright');

const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL','pl','en'] });
  window.chrome = { runtime: {} };
`;

const AUTOCOMPLETE_HASH = '63dfe8182f8cd71a2493912ed138c743f8fdb43e741e11aff9e53bc34b85c9d6';

async function znajdzLokalizacje(miasto, page) {
  const variables = encodeURIComponent(JSON.stringify({
    isLocationSearch: true,
    locationLevelLikeDistrictAndSubdistrict: ['district', 'residential'],
    query: miasto,
    ranking: { type: 'BLENDED_INFIX_LOOKUP_SUGGEST' }
  }));
  const extensions = encodeURIComponent(JSON.stringify({
    persistedQuery: { sha256Hash: AUTOCOMPLETE_HASH, version: 1 }
  }));
  const url = `https://www.otodom.pl/api/query?operationName=autocomplete&variables=${variables}&extensions=${extensions}`;

  const response = await page.evaluate(async (apiUrl) => {
    const r = await fetch(apiUrl, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    return r.json();
  }, url);

  const locations = response?.data?.autocomplete?.locationsObjects || [];
  // Preferuj typ 'city', potem pierwszy wynik
  const city = locations.find(l => l.detailedLevel === 'city') || locations[0];
  return city?.id || null;
}

const ROOMS_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4 };

function buildSearchUrl(domainId, filtry = {}) {
  const { pokoje_min, pokoje_max, cena_min, cena_max, typ = 'mieszkanie' } = filtry;
  const params = new URLSearchParams({ limit: 10, by: 'LATEST', direction: 'DESC' });

  if (pokoje_min || pokoje_max) {
    const minVal = ROOMS_MAP[pokoje_min] || 1;
    const maxVal = ROOMS_MAP[pokoje_max] || 4;
    const labels = ['ONE','TWO','THREE','FOUR'];
    labels.forEach((l, i) => {
      if (i + 1 >= minVal && i + 1 <= maxVal) params.append('roomsNumber', `[${l}]`);
    });
  }

  if (cena_min) params.set('priceMin', cena_min);
  if (cena_max) params.set('priceMax', cena_max);

  return `https://www.otodom.pl/pl/wyniki/sprzedaz/${typ}/${domainId}?${params}`;
}

async function scrapeOtodom(miasto, filtry = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pl-PL',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { 'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8' }
  });
  await context.addInitScript(STEALTH_SCRIPT);
  const page = await context.newPage();

  try {
    // Załaduj stronę główną żeby mieć ciasteczka sesji
    await page.goto('https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie', { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.locator('#onetrust-accept-btn-handler, button[id*="accept"]').first().click({ timeout: 3000 }); } catch {}
    await page.waitForTimeout(1000);

    // Pobierz poprawny domainId przez API autocomplete
    const domainId = await znajdzLokalizacje(miasto, page);
    if (!domainId) throw new Error(`Nie znaleziono lokalizacji: ${miasto}`);
    console.log(`Lokalizacja "${miasto}" → domainId: ${domainId}`);

    // Szukaj ogłoszeń po domainId z filtrami
    const searchUrl = buildSearchUrl(domainId, filtry);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? JSON.parse(el.textContent) : null;
    });

    const oferty = parseNextData(nextData, miasto);
    console.log(`Znaleziono ${oferty.length} ofert dla "${miasto}"`);
    return { oferty, domainId };
  } finally {
    await browser.close();
  }
}

function parseNextData(nextData, miasto) {
  try {
    const items = nextData?.props?.pageProps?.data?.searchAds?.items || [];
    const slug = miasto.toLowerCase()
      .replace(/ó/g, 'o').replace(/ą/g, 'a').replace(/ę/g, 'e')
      .replace(/ś/g, 's').replace(/ł/g, 'l').replace(/ż/g, 'z')
      .replace(/ź/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n');

    // Filtruj: tylko niespromowane oferty z szukanego miasta
    const wynik = items.filter(item => {
      if (item.isPromoted) return false;
      const cityName = item.location?.address?.city?.name || '';
      return cityName.toLowerCase()
        .replace(/ó/g, 'o').replace(/ą/g, 'a').replace(/ę/g, 'e')
        .replace(/ś/g, 's').replace(/ł/g, 'l').replace(/ż/g, 'z')
        .replace(/ź/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n')
        .includes(slug);
    });

    return wynik.slice(0, 10).map(item => ({
      otodom_id: String(item.id),
      tytul: item.title || 'Brak tytułu',
      cena: item.totalPrice?.value ?? null,
      cena_m2: item.pricePerSquareMeter?.value ?? null,
      metraz: item.areaInSquareMeters ?? null,
      pokoje: item.roomsNumber ?? null,
      url: `https://www.otodom.pl/pl/oferta/${item.slug}`
    }));
  } catch {
    return [];
  }
}

module.exports = { scrapeOtodom };
