const db = require('./db');
try { db.exec('ALTER TABLE oferty ADD COLUMN pokoje INTEGER'); console.log('Dodano kolumne pokoje'); }
catch { console.log('Kolumna pokoje juz istnieje'); }
try { db.exec("ALTER TABLE oferty ADD COLUMN typ TEXT DEFAULT 'mieszkanie'"); console.log('Dodano kolumne typ'); }
catch { console.log('Kolumna typ juz istnieje'); }
