import axios from 'axios';
import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys';

global.movieSubCache = global.movieSubCache || {};

const MOVIE_API = 'https://mv-api.silent7.app/api';
const MOVIE_API_KEY = 'silenttech';

export default {
  name: 'smsubs',
  aliases: ['subs', 'sub', 'subtitles'],
  category: 'download',
  description: 'Select subtitle language for a Silent Movie',

  async execute(m, { sock, args, settings }) {
    const from = m.key.remoteJid;
    const PREFIX = settings?.prefix || '.';
    const reply = (text) => sock.sendMessage(from, { text }, { quoted: m });

    const movieId = args[0];
    const season = args[1] === 'null' ? null : args[1];
    const episode = args[2] === 'null' ? null : args[2];

    if (!movieId) {
      return reply(`📝 Usage:\n${PREFIX}smsubs <movie_id> [season] [episode]\n\nUse ${PREFIX}movie <title> to search first.`);
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } });

    // Check cache first, if missing fetch from API
    let subsRaw = global.movieSubCache[String(movieId)];
    if (!subsRaw || subsRaw === 'None') {
      try {
        const { data } = await axios.get(`${MOVIE_API}/item-details`, {
          params: { api: MOVIE_API_KEY, id: movieId }, timeout: 20000
        });
        const subs = data?.payload?.subtitles;
        if (subs) {
          global.movieSubCache[String(movieId)] = subs;
          subsRaw = subs;
        }
      } catch (e) {
        console.error('[SMSUBS] API fetch error:', e.message);
      }
    }

    if (!subsRaw || subsRaw === 'None') {
      return reply('🩸 No subtitles are available for this media.');
    }

    const subList = String(subsRaw).split(',').map(s => s.trim()).filter(Boolean);
    if (!subList.length) return reply('🩸 No subtitles are available for this media.');

    const rows = subList.map(sub => ({
      header: '',
      title: `📝 ${sub}`,
      description: `Download with ${sub} subtitles`,
      id: `${PREFIX}dlmovie ${movieId} ${season || 'null'} ${episode || 'null'} ${sub}`
    }));

    const sections = [{ title: 'Available Languages', rows }];

    try {
      const interactiveMsg = generateWAMessageFromContent(from, {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: `🗣️ *Select Subtitle Language*\n\n${subList.length} language(s) available.\nChoose one to download:`
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: '© Eclipse MD' }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: '📝 Subtitles',
                hasMediaAttachment: false
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [{
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({ title: '🌐 Choose Language', sections })
                }]
              })
            })
          }
        }
      }, { quoted: m });

      await sock.relayMessage(from, interactiveMsg.message, { messageId: interactiveMsg.key.id });
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
    } catch (e) {
      // Fallback: plain text list
      const text = `📝 *Available Subtitle Languages*\n\n` +
        subList.map((sub, i) => `${i + 1}. ${sub}`).join('\n') +
        `\n\n💡 Use: ${PREFIX}dlmovie ${movieId} ${season || 'null'} ${episode || 'null'} <language>`;
      await reply(text);
    }
  }
};
