require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const { scrapeOtodom } = require('./scraper');
const { wyslijOferty } = require('./discord');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/pobierz', async (req, res) => {
  const { miasto, pokoje_min, pokoje_max, cena_min, cena_max, typ = 'mieszkanie' } = req.body;
  if (!miasto) {
    return res.status(400).json({ error: 'Podaj miasto' });
  }

  try {
    const { oferty, domainId } = await scrapeOtodom(miasto, { pokoje_min, pokoje_max, cena_min, cena_max, typ });
    const wojewodztwo = domainId ? domainId.split('/')[0] : '';

    const insert = db.prepare(`
      INSERT OR IGNORE INTO oferty (otodom_id, tytul, cena, cena_m2, metraz, pokoje, typ, miasto, wojewodztwo, url)
      VALUES (@otodom_id, @tytul, @cena, @cena_m2, @metraz, @pokoje, @typ, @miasto, @wojewodztwo, @url)
    `);

    const nowe = [];
    for (const o of oferty) {
      const info = insert.run({ ...o, miasto, wojewodztwo, typ });
      if (info.changes > 0) nowe.push(o);
    }

    let wyslanoDiscord = 0;
    if (nowe.length > 0) {
      wyslanoDiscord = await wyslijOferty(nowe, miasto);
    }

    res.json({
      pobrano: oferty.length,
      nowe: nowe.length,
      discord: wyslanoDiscord,
      brakOfert: oferty.length === 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/statystyki', (req, res) => {
  const { miasto, wojewodztwo, pokoje_min, pokoje_max, cena_min, cena_max } = req.query;

  let where = 'WHERE 1=1';
  const params = {};
  if (miasto) { where += ' AND miasto = @miasto'; params.miasto = miasto; }
  if (wojewodztwo) { where += ' AND wojewodztwo = @wojewodztwo'; params.wojewodztwo = wojewodztwo; }
  if (pokoje_min) { where += ' AND pokoje >= @pokoje_min'; params.pokoje_min = Number(pokoje_min); }
  if (pokoje_max) { where += ' AND pokoje <= @pokoje_max'; params.pokoje_max = Number(pokoje_max); }
  if (cena_min) { where += ' AND cena >= @cena_min'; params.cena_min = Number(cena_min); }
  if (cena_max) { where += ' AND cena <= @cena_max'; params.cena_max = Number(cena_max); }

  const kpi = db.prepare(`
    SELECT
      COUNT(*) as liczba,
      ROUND(AVG(cena), 0) as srednia_cena,
      ROUND(AVG(cena_m2), 0) as srednia_cena_m2
    FROM oferty ${where}
  `).get(params);

  const cenyBins = db.prepare(`
    SELECT
      ROUND(cena / 100000) * 100000 as bin,
      COUNT(*) as ile
    FROM oferty ${where} AND cena IS NOT NULL
    GROUP BY bin ORDER BY bin
  `).all(params);

  const metrazBins = db.prepare(`
    SELECT
      ROUND(metraz / 10) * 10 as bin,
      COUNT(*) as ile
    FROM oferty ${where} AND metraz IS NOT NULL
    GROUP BY bin ORDER BY bin
  `).all(params);

  const lista = db.prepare(`
    SELECT * FROM oferty ${where} ORDER BY pobrano_at DESC LIMIT 50
  `).all(params);

  const miasta = db.prepare('SELECT DISTINCT miasto FROM oferty ORDER BY miasto').all();
  const wojewodztwa = db.prepare('SELECT DISTINCT wojewodztwo FROM oferty ORDER BY wojewodztwo').all();

  res.json({ kpi, cenyBins, metrazBins, lista, miasta, wojewodztwa });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer dziala na http://localhost:${PORT}`));
