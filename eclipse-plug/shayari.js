import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: 'shayari',
  aliases: ['shayri', 'poetry'],
  description: 'Get random beautiful Shayari (Urdu/Hindi poetry)',
  category: 'Entertainment',

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;

    try {
      await sock.sendMessage(from, { react: { text: emojis.processing || '⏳', key: msg.key } });

      let shayariText = '';
      try {
        const res = await axios.get('https://api.princetechn.com/api/fun/shayari?apikey=prince', { timeout: 10000 });
        if (res.data?.success && res.data?.result) {
          shayariText = res.data.result;
        }
      } catch {}

      if (!shayariText) {
        const fallback = [
          "Dard hi sahi mere ishq ka inaam to aaya, khali hi sahi hathon me jaam to aaya.",
          "Mohabbat karna sikha do mujhe, teri raahon mein kho jaana seekha do mujhe.",
          "Waqt ke saath badal jaate hain log, rishte nahin badlte, sirf log badlte hain."
        ];
        shayariText = fallback[Math.floor(Math.random() * fallback.length)];
      }

      const text = `${emojis.heart || '💝'} *Beautiful Shayari* ${emojis.heart || '💝'}\n\n${shayariText}\n\n━━━━━━━━━━━━━━━━━━\n💫 _Powered by Eclipse MD_`;

      await sock.sendMessage(from, { text }, { quoted: msg });
      await sock.sendMessage(from, { react: { text: emojis.success || '✅', key: msg.key } });

    } catch (error) {
      console.error('Error in shayari command:', error);
      await sock.sendMessage(from, { react: { text: emojis.error || '❌', key: msg.key } });
      await sock.sendMessage(from, {
        text: `${emojis.error || '❌'} Failed to fetch shayari. Please try again later.`
      }, { quoted: msg });
    }
  }
};
