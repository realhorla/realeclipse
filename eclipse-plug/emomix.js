
import axios from 'axios';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { horla } from '../lib/horla.js';
import { channelInfo } from '../lib/messageConfig.js';

function getEmojiCodepoint(emoji) {
  return [...emoji]
    .map(c => c.codePointAt(0).toString(16).padStart(4, '0'))
    .join('-');
}

async function getEmojiKitchenUrl(emoji1, emoji2) {
  const cp1 = getEmojiCodepoint(emoji1);
  const cp2 = getEmojiCodepoint(emoji2);

  const dates = ['20230301', '20220815', '20210831', '20201001'];

  for (const date of dates) {
    const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${cp1}/u${cp1}_u${cp2}.png`;
    try {
      const res = await axios.head(url, { timeout: 5000 });
      if (res.status === 200) return url;
    } catch {}

    const urlReverse = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${cp2}/u${cp2}_u${cp1}.png`;
    try {
      const res = await axios.head(urlReverse, { timeout: 5000 });
      if (res.status === 200) return urlReverse;
    } catch {}
  }
  return null;
}

export default horla({
  nomCom: "emomix",
  aliases: ["emojimix"],
  categorie: "Conversion",
  reaction: "😀"
}, async (msg, { sock, args }) => {
  const from = msg.key.remoteJid;

  if (!args || args.length !== 1) {
    await sock.sendMessage(from, {
      text: "Incorrect use. Example: ?emomix 😀;🥰",
      ...channelInfo
    }, { quoted: msg });
    return;
  }

  const parts = args.join(' ').split(';');
  if (parts.length !== 2) {
    await sock.sendMessage(from, {
      text: "Please specify two emojis using a ';' as a separator. Example: ?emomix 😀;🥰",
      ...channelInfo
    }, { quoted: msg });
    return;
  }

  const emoji1 = parts[0].trim();
  const emoji2 = parts[1].trim();

  try {
    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

    const imageUrl = await getEmojiKitchenUrl(emoji1, emoji2);

    if (!imageUrl) {
      await sock.sendMessage(from, {
        text: `❌ Unable to mix ${emoji1} and ${emoji2}. This emoji combination may not be supported.\n\nTry common emojis like: 😀;🥰 or 🔥;❤️`,
        ...channelInfo
      }, { quoted: msg });
      return;
    }

    const stickerMess = new Sticker(imageUrl, {
      pack: "Eclipse MD",
      type: StickerTypes.CROPPED,
      categories: ["🤩", "🎉"],
      id: "12345",
      quality: 70,
      background: "transparent",
    });

    const stickerBuffer = await stickerMess.toBuffer();

    await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    console.error('Emoji mix error:', error);
    await sock.sendMessage(from, {
      text: "❌ An error occurred while creating the emoji mix.",
      ...channelInfo
    }, { quoted: msg });
  }
});
