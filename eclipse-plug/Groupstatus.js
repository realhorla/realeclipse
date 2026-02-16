import crypto from 'crypto';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
  name: 'groupstatus',
  description: 'Post a message as Group Status',
  category: 'Group',
  aliases: ['gstatus', 'gst'],

  async execute(msg, { sock }) {

    try {

      const from = msg.key.remoteJid;

      if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, {
          text: '❌ This command can only be used in groups.'
        }, { quoted: msg });
      }

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const textInput = msg.message?.conversation?.split(' ').slice(1).join(' ') ||
                        msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ') ||
                        '';

      if (!quoted && !textInput) {
        return sock.sendMessage(from, {
          text: '❌ Reply to media or provide text.'
        }, { quoted: msg });
      }

      let innerMessage;

      // ===============================
      // TEXT ONLY
      // ===============================
      if (!quoted && textInput) {

        innerMessage = {
          extendedTextMessage: {
            text: textInput,
            backgroundArgb: 0xFF33FF57,
            textArgb: 0xFFFFFFFF,
            font: 1,
            contextInfo: { isGroupStatus: true }
          }
        };
      }

      // ===============================
      // MEDIA
      // ===============================
      else if (quoted?.imageMessage || quoted?.videoMessage || quoted?.audioMessage) {

        const type = quoted.imageMessage
          ? 'image'
          : quoted.videoMessage
          ? 'video'
          : 'audio';

        const mediaObj =
          quoted.imageMessage ||
          quoted.videoMessage ||
          quoted.audioMessage;

        const stream = await downloadContentFromMessage(mediaObj, type);

        let buffer = Buffer.from([]);
        for await (const chunk of stream)
          buffer = Buffer.concat([buffer, chunk]);

        // 🔥 THIS IS THE FIX
        // Upload media properly using generateWAMessage
        const uploaded = await sock.sendMessage(
          from,
          {
            [type]: buffer,
            caption: textInput || mediaObj.caption || ''
          },
          { upload: sock.waUploadToServer }
        );

        innerMessage = uploaded.message;
      }

      // ===============================
      // WRAP IN GROUP STATUS V2
      // ===============================

      const payload = {
        groupStatusMessageV2: {
          message: innerMessage
        }
      };

      const messageId =
        '3EB0' + crypto.randomBytes(8).toString('hex').toUpperCase();

      await sock.relayMessage(from, payload, { messageId });

      await sock.sendMessage(from, {
        text: '✅ Group Status Posted _powered by horlapookie_!'
      }, { quoted: msg });

    } catch (err) {
      console.error('GroupStatus Error:', err);

      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Error: ${err.message}`
      }, { quoted: msg });
    }
  }
};
