import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: 'roseday',
  aliases: ['rose', 'roseday-msg'],
  description: 'Get romantic Rose Day messages',
  category: 'Entertainment',

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;

    try {
      await sock.sendMessage(from, { react: { text: '🌹', key: msg.key } });

      let message = '';
      try {
        const res = await axios.get('https://api.princetechn.com/api/fun/roseday?apikey=prince', { timeout: 10000 });
        if (res.data?.success && res.data?.result) {
          message = res.data.result;
        }
      } catch {}

      if (!message) {
        const fallback = [
          "A rose speaks of love silently, in a language known only to the heart. 🌹",
          "Red roses for a red love. You're the love of my life! 🌹❤️",
          "A single rose can be my garden... a single friend, my world. 🌹",
          "I'd rather have roses on my table than diamonds on my neck. 🌹💎",
          "You don't meet every day, but I remember you every day. 🌹"
        ];
        message = fallback[Math.floor(Math.random() * fallback.length)];
      }

      const text = `🌹 *Happy Rose Day* 🌹\n\n${message}\n\n━━━━━━━━━━━━━━━━━━\n💖 _Spread love with Eclipse MD_`;

      await sock.sendMessage(from, { text }, { quoted: msg });
      await sock.sendMessage(from, { react: { text: emojis.success || '✅', key: msg.key } });

    } catch (error) {
      console.error('Error in roseday command:', error);
      await sock.sendMessage(from, { react: { text: emojis.error || '❌', key: msg.key } });
      await sock.sendMessage(from, {
        text: `${emojis.error || '❌'} Failed to fetch Rose Day message. Please try again later.`
      }, { quoted: msg });
    }
  }
};
