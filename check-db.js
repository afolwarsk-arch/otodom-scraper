const db = require('./db');
const del = db.prepare("DELETE FROM oferty WHERE miasto NOT IN ('Wrocław')").run();
console.log('Usunieto blednych rekordow:', del.changes);
const all = db.prepare("SELECT DISTINCT miasto, COUNT(*) as ile FROM oferty GROUP BY miasto").all();
console.log('Pozostale miasta:', all);
