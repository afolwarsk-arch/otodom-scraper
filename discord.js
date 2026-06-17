const axios = require('axios');

const BASE = 'https://discord.com/api/v10';

function slugify(str) {
  return str.toLowerCase()
    .replace(/ó/g, 'o').replace(/ą/g, 'a').replace(/ę/g, 'e')
    .replace(/ś/g, 's').replace(/ł/g, 'l').replace(/ż/g, 'z')
    .replace(/ź/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function headers() {
  return { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' };
}

async function znajdzLubStworzKanal(guildId, channelName, miasto) {
  const { data: channels } = await axios.get(`${BASE}/guilds/${guildId}/channels`, { headers: headers() });
  const existing = channels.find(ch => ch.name === channelName && ch.type === 0);
  if (existing) return existing.id;

  const { data: newChannel } = await axios.post(`${BASE}/guilds/${guildId}/channels`, {
    name: channelName,
    type: 0,
    topic: `Oferty mieszkań — ${miasto}`
  }, { headers: headers() });

  return newChannel.id;
}

async function wyslijOferty(oferty, miasto) {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_GUILD_ID) {
    console.warn('Brak DISCORD_TOKEN lub DISCORD_GUILD_ID — pomijam wysyłkę');
    return 0;
  }

  const channelName = slugify(miasto);
  const channelId = await znajdzLubStworzKanal(process.env.DISCORD_GUILD_ID, channelName, miasto);

  let wyslano = 0;
  for (const o of oferty) {
    const cena = o.cena ? `${o.cena.toLocaleString('pl-PL')} zł` : 'brak ceny';
    const m2 = o.cena_m2 ? ` · ${o.cena_m2.toLocaleString('pl-PL')} zł/m²` : '';
    const metraz = o.metraz ? ` · ${o.metraz} m²` : '';

    await axios.post(`${BASE}/channels/${channelId}/messages`, {
      content: `🏠 **${o.tytul}**\n💰 ${cena}${m2}${metraz}\n🔗 ${o.url}`
    }, { headers: headers() });

    wyslano++;
  }

  return wyslano;
}

module.exports = { wyslijOferty };
