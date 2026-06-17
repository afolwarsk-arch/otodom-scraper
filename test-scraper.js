const { scrapeOtodom } = require('./scraper');

(async () => {
  console.log('Testuję domy w Bolesławcu...');
  const { oferty, domainId } = await scrapeOtodom('Bolesławiec', { typ: 'dom' });
  console.log('domainId:', domainId);
  console.log('Liczba ofert:', oferty.length);
  oferty.forEach(o => console.log(`  - ${o.tytul.substring(0, 55)} | ${o.cena ? o.cena.toLocaleString('pl') + ' zł' : 'brak ceny'}`));
})();
