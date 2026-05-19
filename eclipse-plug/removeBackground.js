import axios from 'axios';
import FormData from 'form-data';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const IMGBB_KEY = '6daae8b10a1aaf7bed0086dff6bce3bc';

async function uploadToImgBB(buffer) {
  const form = new FormData();
  form.append('key', IMGBB_KEY);
  form.append('image', buffer.toString('base64'));
  const { data } = await axios.post('https://api.imgbb.com/1/upload', form, {
    headers: form.getHeaders(),
    timeout: 30000
  });
  if (data?.success && data?.data?.url) return data.data.url;
  throw new Error('ImgBB upload failed');
}

async function removeBgTheresav(buffer) {
  const form = new FormData();
  form.append('image', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  form.append('apikey', 'X4cCB');
  const { data, headers } = await axios.post(
    'https://api.theresav.biz.id/tools/removebg',
    form,
    { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 }
  );
  const buf = Buffer.from(data);
  const ct = headers['content-type'] || '';
  if (buf.length > 1000 && (ct.includes('image') || buf[0] === 0x89 || buf[0] === 0xFF)) {
    return { buffer: buf, source: 'theresav' };
  }
  throw new Error('theresav: invalid response');
}

async function removeBgNexray(imageUrl) {
  const { data, headers } = await axios.get(
    `https://api.nexray.eu.cc/tools/removebg?url=${encodeURIComponent(imageUrl)}`,
    { responseType: 'arraybuffer', timeout: 60000 }
  );
  const buf = Buffer.from(data);
  const ct = headers['content-type'] || '';
  if (buf.length > 1000 && (ct.includes('image') || buf[0] === 0x89 || buf[0] === 0xFF)) {
    return { buffer: buf, source: 'nexray' };
  }
  throw new Error('nexray: invalid response');
}

async function removeBgPrince(imageUrl) {
  const { data } = await axios.get(
    `https://api.princetechn.com/api/tools/removebg?apikey=prince&url=${encodeURIComponent(imageUrl)}`,
    { responseType: 'arraybuffer', timeout: 60000 }
  );
  const buf = Buffer.from(data);
  if (buf.length > 1000 && (buf[0] === 0x89 || buf[0] === 0xFF || buf[0] === 0x52)) {
    return { buffer: buf, source: 'prince' };
  }
  throw new Error('prince removebg: invalid response');
}

export default {
  name: 'removebg',
  aliases: ['rmbg', 'rembg', 'removeBackground'],
  description: 'Remove background from an image',
  category: 'Image-Effects',

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;
    const hasQuotedImage = !!quotedMsg?.imageMessage;
    const hasDirectImage = !!msg.message?.imageMessage;

    if (!hasQuotedImage && !hasDirectImage) {
      return reply(
        `🎭 *Remove Background*\n\n` +
        `Reply to an image with *removebg* to remove its background.\n\n` +
        `📌 Aliases: rmbg, rembg`
      );
    }

    await sock.sendMessage(from, { react: { text: '✂️', key: msg.key } });
    const processingMsg = await sock.sendMessage(from, {
      text: `✂️ *Removing background...*\n_Processing your image, please wait._`
    }, { quoted: msg });

    try {
      const targetMsg = hasQuotedImage ? {
        key: { remoteJid: from, id: contextInfo.stanzaId, participant: contextInfo.participant },
        message: quotedMsg
      } : msg;

      const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});

      if (!buffer || buffer.length < 100) throw new Error('Failed to download image');

      let result = null;
      const errors = [];

      // Primary: theresav (direct buffer upload)
      try {
        result = await removeBgTheresav(buffer);
      } catch (e1) {
        errors.push(`theresav: ${e1.message}`);

        // Upload to imgbb for URL-based APIs
        let imgUrl = null;
        try {
          imgUrl = await uploadToImgBB(buffer);
        } catch (e) {
          errors.push(`imgbb: ${e.message}`);
        }

        if (imgUrl) {
          // Secondary: nexray (URL-based)
          try {
            result = await removeBgNexray(imgUrl);
          } catch (e2) {
            errors.push(`nexray: ${e2.message}`);

            // Tertiary: Prince API (URL-based)
            try {
              result = await removeBgPrince(imgUrl);
            } catch (e3) {
              errors.push(`prince: ${e3.message}`);
            }
          }
        }
      }

      // Delete processing message
      try {
        await sock.sendMessage(from, { delete: processingMsg.key });
      } catch {}

      if (!result) {
        console.error('[REMOVEBG] All APIs failed:', errors.join(' | '));
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        return reply(`❌ *Background removal failed.*\n\nAll services are currently unavailable. Please try again later.`);
      }

      await sock.sendMessage(from, {
        image: result.buffer,
        caption: `✅ *Background Removed!*`
      }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      console.error('[REMOVEBG] Error:', error.message);
      try { await sock.sendMessage(from, { delete: processingMsg.key }); } catch {}
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
      return reply(`❌ Error: ${error.message}`);
    }
  }
};
