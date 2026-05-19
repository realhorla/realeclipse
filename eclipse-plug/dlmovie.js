import axios from 'axios';
import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const MOVIE_API = 'https://mv-api.silent7.app/api';
const MOVIE_API_KEY = 'silenttech';

global.movieEpisodeCache = global.movieEpisodeCache || {};

export default {
  name: 'dlmovie',
  aliases: ['downloadmovie'],
  category: 'download',
  description: 'Download movie or browse/download series episodes',

  async execute(m, { sock, args, settings }) {
    const from = m.key.remoteJid;
    const PREFIX = settings?.prefix || '.';
    const reply = (text) => sock.sendMessage(from, { text }, { quoted: m });

    const subjectId = args[0];
    const mode = args[1] || 'movie';

    if (!subjectId) {
      return reply(`Usage:\n${PREFIX}movie <title> — search for a movie/series\n${PREFIX}dlmovie <id> movie — download a movie\n${PREFIX}dlmovie <id> series — browse episodes`);
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } });

    try {

      // ─── INFO MODE ────────────────────────────────────────────────────────────
      if (mode === 'info') {
        const { data } = await axios.get(`${MOVIE_API}/item-details`, {
          params: { api: MOVIE_API_KEY, id: subjectId }, timeout: 20000
        });
        const p = data?.payload;
        if (!p) return reply('❌ Movie not found.');

        const cast = p.staffList?.slice(0, 5).map(s => `• ${s.name} as ${s.character}`).join('\n') || 'N/A';
        const subs = p.subtitles || 'None';
        const dubs = p.dubs?.map(d => d.lanName).join(', ') || 'None';

        const text = `🎬 *${p.title}*\n\n` +
          `📅 Release: ${p.releaseDate || 'N/A'}\n` +
          `⭐ IMDb: ${p.imdbRatingValue || 'N/A'}\n` +
          `🎭 Genre: ${p.genre || 'N/A'}\n` +
          `🌍 Country: ${p.countryName || 'N/A'}\n` +
          `🗣️ Language: ${p.language || 'N/A'}\n` +
          `📺 Rating: ${p.contentRating || 'N/A'}\n\n` +
          `📖 *Description:*\n${p.description?.slice(0, 400) || 'No description.'}\n\n` +
          `🎭 *Cast:*\n${cast}\n\n` +
          `💬 Subtitles: ${subs}\n🎙️ Dubs: ${dubs}`;

        if (p.cover?.url) {
          await sock.sendMessage(from, { image: { url: p.cover.url }, caption: text }, { quoted: m });
        } else {
          await reply(text);
        }
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
        return;
      }

      // ─── SERIES EPISODE LIST MODE ─────────────────────────────────────────────
      if (mode === 'series') {
        const { data } = await axios.get(`${MOVIE_API}/media`, {
          params: { api: MOVIE_API_KEY, id: subjectId }, timeout: 20000
        });
        const episodes = data?.payload?.full_resource_list;
        if (!episodes?.length) return reply('❌ No episodes found for this series.');

        // Cache episodes by resourceId for later download
        global.movieEpisodeCache[subjectId] = {};
        for (const ep of episodes) {
          global.movieEpisodeCache[subjectId][ep.resourceId] = {
            title: ep.title,
            resourceLink: ep.resourceLink,
            resolution: ep.resolution,
            se: ep.se,
            ep: ep.ep,
            size: ep.size,
            codecName: ep.codecName
          };
        }

        // Group by season
        const seasonMap = {};
        for (const ep of episodes) {
          const key = ep.se || 0;
          if (!seasonMap[key]) seasonMap[key] = [];
          seasonMap[key].push(ep);
        }

        // Build sections for single_select list
        const sections = [];
        for (const [se, eps] of Object.entries(seasonMap).sort((a, b) => a[0] - b[0])) {
          const rows = eps.slice(0, 25).map(ep => {
            const label = Number(se) > 0 ? `S${ep.se}E${ep.ep}` : `E${ep.ep}`;
            const sizeMB = ep.size ? `${(parseInt(ep.size) / 1024 / 1024).toFixed(0)}MB` : '';
            const epTitle = (ep.title || `Episode ${ep.ep}`).slice(0, 50);
            return {
              title: `${label} — ${epTitle}`,
              description: `${ep.resolution}p${sizeMB ? ` • ${sizeMB}` : ''}${ep.codecName ? ` • ${ep.codecName}` : ''}`,
              id: `${PREFIX}dlmovie ${subjectId} ep ${ep.resourceId}`
            };
          });
          sections.push({
            title: Number(se) > 0 ? `📺 Season ${se}` : '📺 Episodes',
            rows
          });
        }

        // PRIMARY: Interactive single_select list
        try {
          const interactiveMsg = generateWAMessageFromContent(from, {
            viewOnceMessage: {
              message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                  body: proto.Message.InteractiveMessage.Body.create({
                    text: `📺 *Episode List* — ${episodes.length} episodes\n\nSelect an episode to download:`
                  }),
                  footer: proto.Message.InteractiveMessage.Footer.create({ text: '© Eclipse MD' }),
                  header: proto.Message.InteractiveMessage.Header.create({
                    title: '🎬 Select Episode',
                    hasMediaAttachment: false
                  }),
                  nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: [{
                      name: 'single_select',
                      buttonParamsJson: JSON.stringify({
                        title: '📋 Choose Episode',
                        sections
                      })
                    }]
                  })
                })
              }
            }
          }, { quoted: m });

          await sock.relayMessage(from, interactiveMsg.message, { messageId: interactiveMsg.key.id });
          await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
          return;
        } catch (interactiveErr) {
          console.warn('[DLMOVIE] Interactive list failed, trying buttons:', interactiveErr.message);
        }

        // FALLBACK 1: Carousel buttons (up to 5 cards × 3 episodes)
        try {
          const flat = episodes.slice(0, 15);
          const cards = [];
          for (let i = 0; i < flat.length; i += 3) {
            const chunk = flat.slice(i, i + 3);
            const buttons = chunk.map(ep => {
              const label = ep.se > 0 ? `S${ep.se}E${ep.ep}` : `E${ep.ep}`;
              return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: `⬇️ ${label}`,
                  id: `${PREFIX}dlmovie ${subjectId} ep ${ep.resourceId}`
                })
              };
            });
            const descLines = chunk.map(ep => {
              const label = ep.se > 0 ? `S${ep.se}E${ep.ep}` : `E${ep.ep}`;
              return `*${label}* ${ep.title ? `— ${ep.title.slice(0, 30)}` : ''} (${ep.resolution}p)`;
            }).join('\n');
            cards.push({
              body: proto.Message.InteractiveMessage.Body.create({ text: descLines }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: `📺 Episodes ${i + 1}–${Math.min(i + chunk.length, flat.length)}`,
                hasMediaAttachment: false
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
            });
          }

          const carousel = generateWAMessageFromContent(from, {
            viewOnceMessage: {
              message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                  body: proto.Message.InteractiveMessage.Body.create({
                    text: `📺 *${episodes.length} episodes* — Swipe to browse ➡️`
                  }),
                  carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
                    cards, messageVersion: 1
                  })
                })
              }
            }
          }, { quoted: m });

          await sock.relayMessage(from, carousel.message, { messageId: carousel.key.id });
          await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
          return;
        } catch (btnErr) {
          console.warn('[DLMOVIE] Buttons failed, using text fallback:', btnErr.message);
        }

        // FALLBACK 2: Plain text reply with S1E1 format
        let text = `📺 *Episode List* (${episodes.length} total)\n\n`;
        for (const ep of episodes.slice(0, 30)) {
          const label = ep.se > 0 ? `S${ep.se}E${ep.ep}` : `E${ep.ep}`;
          const sizeMB = ep.size ? ` | ${(parseInt(ep.size) / 1024 / 1024).toFixed(0)}MB` : '';
          text += `*${label}* — ${ep.title || 'Episode ' + ep.ep}\n`;
          text += `  📺 ${ep.resolution}p${sizeMB} | \`${PREFIX}dlmovie ${subjectId} ep ${ep.resourceId}\`\n\n`;
        }
        if (episodes.length > 30) text += `_...and ${episodes.length - 30} more episodes_`;
        await reply(text);
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
        return;
      }

      // ─── SINGLE EPISODE DOWNLOAD MODE ────────────────────────────────────────
      if (mode === 'ep') {
        const resourceId = args[2];
        if (!resourceId) return reply('❌ Missing episode resource ID.');

        const cached = global.movieEpisodeCache?.[subjectId]?.[resourceId];
        if (!cached) {
          return reply(`❌ Episode not in cache.\nUse *${PREFIX}dlmovie ${subjectId} series* first to browse episodes.`);
        }

        const label = cached.se > 0 ? `S${cached.se}E${cached.ep}` : `E${cached.ep}`;
        const fileName = `${label}_${(cached.title || 'Episode').replace(/[^a-zA-Z0-9 ]/g, '_').slice(0, 40)}_${cached.resolution}p.mp4`;
        const sizeMB = cached.size ? `${(parseInt(cached.size) / 1024 / 1024).toFixed(0)} MB` : '';

        await sock.sendMessage(from, {
          document: { url: cached.resourceLink },
          mimetype: 'video/mp4',
          fileName,
          caption: `📺 *${label}* — ${cached.title || ''}\n📺 Quality: ${cached.resolution}p${sizeMB ? ` | 📦 ${sizeMB}` : ''}`
        }, { quoted: m });

        await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
        return;
      }

      // ─── MOVIE DOWNLOAD MODE ──────────────────────────────────────────────────
      const { data } = await axios.get(`${MOVIE_API}/item-details`, {
        params: { api: MOVIE_API_KEY, id: subjectId }, timeout: 20000
      });
      const p = data?.payload;
      if (!p) return reply('❌ Movie not found.');

      const resource = p.resourceDetectors?.[0];
      if (!resource) return reply('❌ No download resource available for this movie.');

      const resList = resource.resolutionList || [];
      let downloadUrl = resource.downloadUrl || '';
      let resolution = '';
      let sizeMB = '';

      if (resList.length > 0) {
        const preferred =
          resList.find(r => r.resolution === 720) ||
          resList.find(r => r.resolution === 480) ||
          resList.find(r => r.resolution === 360) ||
          resList.sort((a, b) => b.resolution - a.resolution)[0];
        downloadUrl = preferred.resourceLink || preferred.downloadUrl || downloadUrl;
        resolution = preferred.resolution + 'p';
        sizeMB = preferred.size ? `${(parseInt(preferred.size) / 1024 / 1024).toFixed(0)} MB` : '';
      } else if (resource.downloadUrl) {
        downloadUrl = resource.downloadUrl;
        sizeMB = resource.firstSize ? `${(parseInt(resource.firstSize) / 1024 / 1024).toFixed(0)} MB` : '';
      }

      if (!downloadUrl) {
        return reply(`❌ No direct download URL available.\n🔗 Resource Link: ${resource.resourceLink || 'N/A'}`);
      }

      const fileName = `${(p.title || 'Movie').replace(/[^a-zA-Z0-9 ]/g, '_').slice(0, 50)}_${resolution || 'SD'}.mp4`;
      const caption = `🎬 *${p.title}*\n📅 ${p.releaseDate?.split('-')[0] || ''} | ⭐ ${p.imdbRatingValue || 'N/A'}` +
        (resolution ? `\n📺 Quality: ${resolution}` : '') +
        (sizeMB ? `\n📦 Size: ${sizeMB}` : '');

      await sock.sendMessage(from, {
        document: { url: downloadUrl },
        mimetype: 'video/mp4',
        fileName,
        caption
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
      console.error('[DLMOVIE ERROR]', e?.response?.data || e?.message || e);
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } });
      reply(`❌ Error: ${e?.response?.data?.detail || e.message}`);
    }
  }
};
