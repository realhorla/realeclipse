import yts from 'yt-search';
import fs from 'fs';
import path from 'path';

const emojis = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'emojis.json'), 'utf8')
);

globalThis.__VIDEO_SESSIONS__ = globalThis.__VIDEO_SESSIONS__ || new Map();
const sessions = globalThis.__VIDEO_SESSIONS__;

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
    await sock.sendMessage(from, { text: '❌ No pending video session. Use .video <name> first.' }, { quoted: msg });
    return true;
  }

  const video = sessions.get(from);
  sessions.delete(from);

  await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });

  try {
    const ytdl = (await import('@distube/ytdl-core')).default;
    const ytUrl = video?.url || `https://youtube.com/watch?v=${video.videoId}`;

    await sock.sendMessage(from, {
      text: `🎬 Downloading *${video.title}*... Please wait! (Videos may take a few minutes)`
    }, { quoted: msg });

    const info = await ytdl.getInfo(ytUrl, {
      requestOptions: {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }
    });

    const format = ytdl.chooseFormat(info.formats, {
      quality: 'lowestvideo',
      filter: f => f.hasVideo && f.hasAudio && f.container === 'mp4'
    }) || ytdl.chooseFormat(info.formats, { quality: 'lowest', filter: 'videoandaudio' });

    if (!format) throw new Error('No suitable video format found');

    const stream = ytdl.downloadFromInfo(info, { format });
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const fileName = `${video.title.replace(/[/\\?%*:|"<>]/g, '_')}.mp4`;

    if (selection === '1') {
      await sock.sendMessage(from, {
        video: buffer,
        mimetype: 'video/mp4',
        fileName,
        caption: `🎬 *${video.title}*`
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, {
        document: buffer,
        mimetype: 'video/mp4',
        fileName,
        caption: `🎬 *${video.title}*`
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
  } catch (err) {
    console.error('Video download error:', err.message);
    await sock.sendMessage(from, { text: `❌ Video download failed: ${err.message}\n\n💡 Try ?play for audio instead.` }, { quoted: msg });
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
  name: 'video',
  description: 'Search YouTube and download video',
  category: 'Media',
  aliases: ['ytv', 'vid'],
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
        text: '🎬 *YouTube Video Downloader*\n\n*Usage:* ?video <video name or YouTube URL>\n*Example:* ?video Blinding Lights\n\nAfter results show, reply with:\n1️⃣ *Video (MP4)*\n2️⃣ *Document (File)*\n\n⚠️ Only short videos (< 5 min) recommended due to size limits.'
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
        caption: `🎬 *${video.title}*\n⏱ *Duration:* ${video.timestamp}\n👤 *Channel:* ${video.author.name}\n👁 *Views:* ${video.views?.toLocaleString?.() || 'N/A'}\n\n*Reply with a number to download:*\n1️⃣ *Video (MP4)*\n2️⃣ *Document (File)*\n\n⚠️ Works best for videos under 5 minutes`
      }, { quoted: msg });
    } catch (err) {
      console.error('Video search error:', err.message);
      await sock.sendMessage(from, { text: `❌ Search failed: ${err.message}` }, { quoted: msg });
    }
  }
};
