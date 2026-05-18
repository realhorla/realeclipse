import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojis = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'emojis.json'), 'utf8')
);

function extractPastebinId(url) {
  const match = url.match(/pastebin\.com\/(?:raw\/)?([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractGDriveId(url) {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractMediafireId(url) {
  const match = url.match(/mediafire\.com\/file\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default [
  {
    name: 'pastebin',
    description: 'Download content from Pastebin',
    category: 'Download',
    async execute(msg, { sock, args }) {
      const from = msg.key.remoteJid;
      const url = args[0];
      if (!url) return sock.sendMessage(from, { text: '❌ Provide a Pastebin URL.\n\nExample: ?pastebin https://pastebin.com/abc123' }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
      try {
        const id = extractPastebinId(url);
        if (!id) throw new Error('Invalid Pastebin URL');

        const res = await axios.get(`https://pastebin.com/raw/${id}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
          responseType: 'text'
        });

        const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        if (content.length > 4000) {
          await sock.sendMessage(from, {
            document: Buffer.from(content, 'utf8'),
            mimetype: 'text/plain',
            fileName: `${id}.txt`,
            caption: `📋 *Pastebin:* ${id}`
          }, { quoted: msg });
        } else {
          await sock.sendMessage(from, {
            text: `📋 *Pastebin Content (${id}):*\n\n${content}`
          }, { quoted: msg });
        }
        await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
      } catch (e) {
        console.error('[pastebin]', e.message);
        await sock.sendMessage(from, { text: `❌ Failed to fetch Pastebin content.\n🔧 ${e.message}` }, { quoted: msg });
      }
    }
  },
  {
    name: 'mediafire',
    description: 'Get download link from Mediafire',
    category: 'Download',
    async execute(msg, { sock, args }) {
      const from = msg.key.remoteJid;
      const url = args[0];
      if (!url) return sock.sendMessage(from, { text: '❌ Provide a Mediafire URL.' }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
      try {
        const res = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 20000
        });
        const html = res.data;
        const dlMatch = html.match(/href="(https:\/\/download\d+\.mediafire\.com\/[^"]+)"/);
        if (!dlMatch) throw new Error('Could not extract download link from Mediafire page');

        const downloadLink = dlMatch[1];
        const nameMatch = html.match(/class="filename"[^>]*>([^<]+)</);
        const fileName = nameMatch ? nameMatch[1].trim() : 'mediafire_file';

        await sock.sendMessage(from, {
          text: `📂 *Mediafire File*\n\n📄 *Name:* ${fileName}\n🔗 *Download Link:*\n${downloadLink}\n\n> Tap the link to download`
        }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
      } catch (e) {
        console.error('[mediafire]', e.message);
        await sock.sendMessage(from, { text: `❌ Could not process Mediafire link.\n🔧 ${e.message}` }, { quoted: msg });
      }
    }
  },
  {
    name: 'googledrive',
    aliases: ['gdrive'],
    description: 'Get direct download link from Google Drive',
    category: 'Download',
    async execute(msg, { sock, args }) {
      const from = msg.key.remoteJid;
      const url = args[0];
      if (!url) return sock.sendMessage(from, { text: '❌ Provide a Google Drive URL.' }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
      try {
        const fileId = extractGDriveId(url);
        if (!fileId) throw new Error('Could not extract Google Drive file ID');

        const directLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const confirmLink = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

        await sock.sendMessage(from, {
          text: `📂 *Google Drive File*\n\n🆔 *File ID:* ${fileId}\n\n🔗 *Direct Download Link:*\n${confirmLink}\n\n> If the link prompts a warning, use the confirm link above`
        }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
      } catch (e) {
        console.error('[googledrive]', e.message);
        await sock.sendMessage(from, { text: `❌ Could not process Google Drive link.\n🔧 ${e.message}` }, { quoted: msg });
      }
    }
  },
  {
    name: 'snackdl',
    description: 'Download video from SnackVideo',
    category: 'Download',
    async execute(msg, { sock, args }) {
      const from = msg.key.remoteJid;
      const url = args[0];
      if (!url) return sock.sendMessage(from, { text: '❌ Provide a SnackVideo URL.' }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
      try {
        const apiUrl = `https://ssss.to/api/ajaxSearch`;
        const res = await axios.post(apiUrl,
          `q=${encodeURIComponent(url)}&t=media&lang=en`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0'
            },
            timeout: 20000
          }
        );

        if (res.data?.data) {
          const html = res.data.data;
          const linkMatch = html.match(/href="(https[^"]+\.mp4[^"]*)"/);
          if (linkMatch) {
            await sock.sendMessage(from, {
              text: `🎬 *SnackVideo Download*\n\n🔗 *Link:* ${linkMatch[1]}`
            }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            return;
          }
        }
        throw new Error('Could not extract download link');
      } catch (e) {
        console.error('[snackdl]', e.message);
        await sock.sendMessage(from, {
          text: `❌ SnackVideo download failed.\n\n💡 *Tip:* Try using the TikTok downloader (?tiktok) or copy the video URL directly.`
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'aiodl',
    description: 'All-in-one downloader (TikTok, Instagram, Twitter, Facebook)',
    category: 'Download',
    async execute(msg, { sock, args }) {
      const from = msg.key.remoteJid;
      const url = args[0];
      if (!url) return sock.sendMessage(from, {
        text: `❌ Provide a media URL.\n\n*Supported platforms:*\n• TikTok → ?tiktok\n• YouTube Audio → ?play\n• YouTube Video → ?video\n• Facebook → ?facebook\n• Instagram → ?instagram\n\n*Usage:* ?aiodl <url>`
      }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
      try {
        const urlLower = url.toLowerCase();

        if (urlLower.includes('tiktok')) {
          const tiktokRes = await axios.get(
            `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
            { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 }
          );
          if (tiktokRes.data?.code === 0 && tiktokRes.data?.data?.play) {
            const d = tiktokRes.data.data;
            await sock.sendMessage(from, {
              video: { url: d.play },
              caption: `🎬 *${d.title || 'TikTok Video'}*\n\n👤 @${d.author?.unique_id || 'unknown'}`
            }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            return;
          }
        }

        await sock.sendMessage(from, {
          text: `⚠️ Could not automatically download from this URL.\n\n*Try these specific commands:*\n• ?tiktok <url> — TikTok\n• ?play <name> — YouTube audio\n• ?video <name> — YouTube video\n• ?facebook <url> — Facebook\n• ?instagram <url> — Instagram`
        }, { quoted: msg });
      } catch (e) {
        console.error('[aiodl]', e.message);
        await sock.sendMessage(from, {
          text: `❌ Download failed.\n\n*Try a specific command:*\n• ?tiktok <url>\n• ?play <song name>\n• ?video <video name>`
        }, { quoted: msg });
      }
    }
  }
];
