import yts from 'yt-search';
import fs from 'fs';
import path from 'path';

const emojis = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'emojis.json'), 'utf8')
);

globalThis.__PLAY_SESSIONS__ = globalThis.__PLAY_SESSIONS__ || new Map();
const sessions = globalThis.__PLAY_SESSIONS__;

function getText(msg) {
  const m = msg?.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  ).trim();
}

async function doDownloadSelection({ msg, sock, selection }) {
  const from = msg.key.remoteJid;

  if (!sessions.has(from)) {
    await sock.sendMessage(from, { text: '❌ No pending download session. Use .play <song name> first.' }, { quoted: msg });
    return true;
  }

  const video = sessions.get(from);
  sessions.delete(from);

  await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });

  try {
    const ytdl = (await import('@distube/ytdl-core')).default;
    const ytUrl = video?.url || `https://youtube.com/watch?v=${video.videoId}`;

    await sock.sendMessage(from, {
      text: `🎵 Downloading *${video.title}*... Please wait!`
    }, { quoted: msg });

    const stream = ytdl(ytUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }
    });

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (selection === '1') {
      await sock.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, {
        document: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`,
        caption: `🎵 *${video.title}*`
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
  } catch (err) {
    console.error('Audio download error:', err.message);
    await sock.sendMessage(from, { text: `❌ Download failed: ${err.message}` }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: emojis.error, key: msg.key } });
  }

  return true;
}

async function handleReply(msg, sock) {
  const body = getText(msg);
  if (body !== '1' && body !== '2') return false;
  if (!sessions.has(msg.key.remoteJid)) return false;
  await doDownloadSelection({ msg, sock, selection: body });
  return true;
}

export default {
  name: 'play',
  description: 'Search YouTube and download audio',
  category: 'Media',
  aliases: ['song', 'yta'],
  onReply: handleReply,

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const input = (args || []).join(' ').trim();

    if (input === '1' || input === '2') {
      await doDownloadSelection({ msg, sock, selection: input });
      return;
    }

    if (!input) {
      await sock.sendMessage(from, {
        text: '🎵 *YouTube Audio Downloader*\n\n*Usage:* ?play <song name or YouTube URL>\n*Example:* ?play Blinding Lights\n\nAfter results show, reply with:\n1️⃣ *Audio (MP3)*\n2️⃣ *Document (File)*'
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });

    try {
      const search = await yts(input);
      if (!search?.videos?.length) {
        await sock.sendMessage(from, { text: `❌ No results found for "${input}"` }, { quoted: msg });
        return;
      }

      const video = search.videos[0];
      sessions.set(from, video);

      setTimeout(() => { if (sessions.get(from) === video) sessions.delete(from); }, 5 * 60 * 1000);

      await sock.sendMessage(from, {
        image: { url: video.thumbnail },
        caption: `🎵 *${video.title}*\n⏱ *Duration:* ${video.timestamp}\n👤 *Channel:* ${video.author.name}\n👁 *Views:* ${video.views?.toLocaleString?.() || 'N/A'}\n\n*Reply with a number to download:*\n1️⃣ *Audio (MP3)*\n2️⃣ *Document (File)*`
      }, { quoted: msg });
    } catch (err) {
      console.error('Audio search error:', err.message);
      await sock.sendMessage(from, { text: `❌ Search failed: ${err.message}` }, { quoted: msg });
    }
  }
};
