import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

const MANGADEX = 'https://api.mangadex.org';

async function searchManga(query) {
  const { data } = await axios.get(`${MANGADEX}/manga`, {
    params: { title: query, limit: 10, 'order[relevance]': 'desc', 'availableTranslatedLanguage[]': 'en' },
    timeout: 20000
  });
  return data?.data || [];
}

async function getMangaDetails(mangaId) {
  const { data } = await axios.get(`${MANGADEX}/manga/${mangaId}`, {
    params: { includes: ['author', 'cover_art'] },
    timeout: 20000
  });
  return data?.data || null;
}

async function getMangaChapters(mangaId) {
  const { data } = await axios.get(`${MANGADEX}/manga/${mangaId}/feed`, {
    params: { 'translatedLanguage[]': 'en', limit: 10, 'order[chapter]': 'desc', 'order[volume]': 'desc' },
    timeout: 20000
  });
  return data?.data || [];
}

async function getChapterImages(chapterId) {
  const { data } = await axios.get(`${MANGADEX}/at-home/server/${chapterId}`, { timeout: 20000 });
  const base = data?.baseUrl;
  const hash = data?.chapter?.hash;
  const pages = data?.chapter?.data || [];
  return pages.map(p => `${base}/data/${hash}/${p}`);
}

function getCoverUrl(manga) {
  const cover = manga?.relationships?.find(r => r.type === 'cover_art');
  if (!cover?.attributes?.fileName) return null;
  return `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`;
}

function getTitle(manga) {
  const attr = manga?.attributes;
  return attr?.title?.en || Object.values(attr?.title || {})[0] || 'Unknown Title';
}

const mangaHomeCommand = {
  name: 'mangahome',
  description: 'Get latest manga updates from MangaDex',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    try {
      await sock.sendMessage(from, { react: { text: emojis.processing || '⏳', key: msg.key } });

      const { data } = await axios.get(`${MANGADEX}/manga`, {
        params: { limit: 10, 'order[updatedAt]': 'desc', 'availableTranslatedLanguage[]': 'en', includes: ['cover_art'] },
        timeout: 20000
      });
      const list = data?.data || [];

      if (!list.length) return await sock.sendMessage(from, { text: `${emojis.error} No manga found!` }, { quoted: msg });

      let text = `📚 *LATEST MANGA UPDATES*\n\n`;
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const attr = m.attributes;
        const title = getTitle(m);
        const genres = attr?.tags?.filter(t => t.attributes.group === 'genre').map(t => t.attributes.name.en).slice(0, 3).join(', ') || 'N/A';
        const status = attr?.status || 'N/A';
        text += `*${i + 1}. ${title}*\n├ 🏷️ Genre: ${genres}\n├ 📊 Status: ${status}\n└ 📰 ID: \`${m.id}\`\n\n`;
      }
      text += `\n💡 *Usage:*\n• ${settings.prefix}mangainfo <manga-id> - Get details\n• ${settings.prefix}mangasearch <query> - Search`;

      const coverUrl = getCoverUrl(list[0]);
      if (coverUrl) {
        await sock.sendMessage(from, { image: { url: coverUrl }, caption: text }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text }, { quoted: msg });
      }

      await sock.sendMessage(from, { react: { text: emojis.success || '✅', key: msg.key } });
    } catch (error) {
      console.error('[MANGA HOME] Error:', error.message);
      await sock.sendMessage(from, { text: `${emojis.error} Failed to fetch manga: ${error.message}` }, { quoted: msg });
    }
  }
};

const mangaSearchCommand = {
  name: 'mangasearch',
  description: 'Search for manga by title on MangaDex',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const query = args.join(' ').trim();
    if (!query) return await sock.sendMessage(from, { text: `${emojis.error} Please provide a search query!\n\nExample: ${settings.prefix}mangasearch One Piece` }, { quoted: msg });

    try {
      await sock.sendMessage(from, { react: { text: emojis.processing || '⏳', key: msg.key } });
      const list = await searchManga(query);

      if (!list.length) return await sock.sendMessage(from, { text: `${emojis.error} No manga found for "${query}"!` }, { quoted: msg });

      let text = `🔍 *MANGA SEARCH RESULTS*\nQuery: "${query}"\n\n`;
      for (let i = 0; i < Math.min(list.length, 10); i++) {
        const m = list[i];
        const attr = m.attributes;
        const title = getTitle(m);
        const genres = attr?.tags?.filter(t => t.attributes.group === 'genre').map(t => t.attributes.name.en).slice(0, 3).join(', ') || 'N/A';
        const year = attr?.year || 'N/A';
        text += `*${i + 1}. ${title}*\n├ 🏷️ Genre: ${genres}\n├ 📅 Year: ${year}\n└ 📰 ID: \`${m.id}\`\n\n`;
      }
      text += `\n💡 Use: ${settings.prefix}mangainfo <manga-id>`;

      await sock.sendMessage(from, { text }, { quoted: msg });
      await sock.sendMessage(from, { react: { text: emojis.success || '✅', key: msg.key } });
    } catch (error) {
      console.error('[MANGA SEARCH] Error:', error.message);
      await sock.sendMessage(from, { text: `${emojis.error} Search failed: ${error.message}` }, { quoted: msg });
    }
  }
};

const mangaInfoCommand = {
  name: 'mangainfo',
  description: 'Get detailed manga information from MangaDex',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const mangaId = args[0];
    if (!mangaId) return await sock.sendMessage(from, { text: `${emojis.error} Please provide a manga ID!\n\nExample: ${settings.prefix}mangainfo a96676be-9e79-481b-a1cd-c5c47ddcce94` }, { quoted: msg });

    try {
      await sock.sendMessage(from, { react: { text: emojis.processing || '⏳', key: msg.key } });
      const manga = await getMangaDetails(mangaId);
      if (!manga) return await sock.sendMessage(from, { text: `${emojis.error} Manga not found!` }, { quoted: msg });

      const attr = manga.attributes;
      const title = getTitle(manga);
      const desc = attr?.description?.en || Object.values(attr?.description || {})[0] || 'No description';
      const genres = attr?.tags?.filter(t => t.attributes.group === 'genre').map(t => t.attributes.name.en).join(', ') || 'N/A';
      const author = manga.relationships?.find(r => r.type === 'author')?.attributes?.name || 'Unknown';
      const chapters = await getMangaChapters(mangaId);

      let text = `📚 *${title}*\n\n`;
      text += `📝 *Description:*\n${desc.slice(0, 300)}${desc.length > 300 ? '...' : ''}\n\n`;
      text += `🏷️ *Genres:* ${genres}\n`;
      text += `✍️ *Author:* ${author}\n`;
      text += `📊 *Status:* ${attr?.status || 'Unknown'}\n`;
      text += `📅 *Year:* ${attr?.year || 'N/A'}\n\n`;

      if (chapters.length) {
        text += `📑 *Recent Chapters (EN):*\n`;
        for (const ch of chapters.slice(0, 5)) {
          const cattr = ch.attributes;
          text += `• Ch.${cattr.chapter || '?'} - ${cattr.title || 'No title'}\n`;
        }
        text += `\n💡 Use: ${settings.prefix}mangaread <chapter-id>`;
      }

      const coverUrl = getCoverUrl(manga);
      if (coverUrl) {
        await sock.sendMessage(from, { image: { url: coverUrl }, caption: text }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text }, { quoted: msg });
      }

      await sock.sendMessage(from, { react: { text: emojis.success || '✅', key: msg.key } });
    } catch (error) {
      console.error('[MANGA INFO] Error:', error.message);
      await sock.sendMessage(from, { text: `${emojis.error} Failed to get manga info: ${error.message}` }, { quoted: msg });
    }
  }
};

const mangaReadCommand = {
  name: 'mangaread',
  description: 'Read a manga chapter from MangaDex',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const chapterId = args[0];
    if (!chapterId) return await sock.sendMessage(from, { text: `${emojis.error} Please provide a chapter ID!\n\nExample: ${settings.prefix}mangaread <chapter-uuid>` }, { quoted: msg });

    try {
      await sock.sendMessage(from, { react: { text: emojis.processing || '⏳', key: msg.key } });
      await sock.sendMessage(from, { text: `📖 Fetching chapter images...` }, { quoted: msg });

      const images = await getChapterImages(chapterId);
      if (!images.length) return await sock.sendMessage(from, { text: `${emojis.error} No images found for this chapter!` }, { quoted: msg });

      await sock.sendMessage(from, { text: `📖 Total Pages: ${images.length}\n⏳ Sending first 10 pages...` }, { quoted: msg });

      const maxPages = Math.min(images.length, 10);
      for (let i = 0; i < maxPages; i++) {
        try {
          await sock.sendMessage(from, { image: { url: images[i] }, caption: `📄 Page ${i + 1}/${images.length}` });
        } catch (e) {
          console.error(`[MANGA READ] Page ${i + 1} failed:`, e.message);
        }
      }

      if (images.length > 10) {
        await sock.sendMessage(from, { text: `📄 Showing first 10 pages of ${images.length}. Read full chapter on MangaDex.` }, { quoted: msg });
      }

      await sock.sendMessage(from, { react: { text: emojis.success || '✅', key: msg.key } });
    } catch (error) {
      console.error('[MANGA READ] Error:', error.message);
      await sock.sendMessage(from, { text: `${emojis.error} Failed to fetch chapter: ${error.message}` }, { quoted: msg });
    }
  }
};

export default [mangaHomeCommand, mangaSearchCommand, mangaInfoCommand, mangaReadCommand];
