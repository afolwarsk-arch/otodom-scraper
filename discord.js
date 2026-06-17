require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = require('discord.js');

let client = null;

function getClient() {
  if (!client) {
    client = new Client({ intents: [GatewayIntentBits.Guilds] });
  }
  return client;
}

async function ensureConnected() {
  const c = getClient();
  if (c.isReady()) return c;
  await c.login(process.env.DISCORD_TOKEN);
  await new Promise(res => c.once('ready', res));
  return c;
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/ó/g, 'o').replace(/ą/g, 'a').replace(/ę/g, 'e')
    .replace(/ś/g, 's').replace(/ł/g, 'l').replace(/ż/g, 'z')
    .replace(/ź/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function wyslijOferty(oferty, miasto) {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_GUILD_ID) {
    console.warn('Brak DISCORD_TOKEN lub DISCORD_GUILD_ID — pomijam wysyłkę');
    return 0;
  }

  const c = await ensureConnected();
  const guild = await c.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const channelName = slugify(miasto);

  let channel = guild.channels.cache.find(
    ch => ch.name === channelName && ch.type === ChannelType.GuildText
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `Oferty mieszkań — ${miasto}`
    });
  }

  let wyslano = 0;
  for (const o of oferty) {
    const cena = o.cena ? `${o.cena.toLocaleString('pl-PL')} zł` : 'brak ceny';
    const m2 = o.cena_m2 ? `${o.cena_m2.toLocaleString('pl-PL')} zł/m²` : '';
    const metraz = o.metraz ? `${o.metraz} m²` : '';

    await channel.send(
      `🏠 **${o.tytul}**\n💰 ${cena}${m2 ? ' · ' + m2 : ''}${metraz ? ' · ' + metraz : ''}\n🔗 ${o.url}`
    );
    wyslano++;
  }

  return wyslano;
}

module.exports = { wyslijOferty };
