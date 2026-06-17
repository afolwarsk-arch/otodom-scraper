const { spawn } = require('child_process');
const path = require('path');

const server = spawn(process.execPath, ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

server.on('spawn', () => console.log('Serwer uruchomiony na http://localhost:3000'));

setTimeout(async () => {
  const localtunnel = require('localtunnel');
  const tunnel = await localtunnel({ port: 3000 });
  console.log('\n========================================');
  console.log('Publiczny URL: ' + tunnel.url);
  console.log('Haslo (wpisz na stronie tunelu): sprawdz https://api.ipify.org');
  console.log('========================================\n');
  tunnel.on('close', () => console.log('Tunel zamkniety'));
}, 2000);
