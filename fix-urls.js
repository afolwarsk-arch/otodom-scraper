const db = require('./db');
const r = db.prepare("UPDATE oferty SET url = REPLACE(url, 'https://www.otodom.plpl/', 'https://www.otodom.pl/')").run();
console.log('Zaktualizowano rekordow:', r.changes);
const sample = db.prepare('SELECT url FROM oferty LIMIT 2').all();
sample.forEach(o => console.log(o.url));
