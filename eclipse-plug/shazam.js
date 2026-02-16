import { Shazam } from 'node-shazam';
import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import yts from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_SIZE = 500000; // 500KB safe limit

export default {
  name: 'shazam',
  description: 'Identify songs from audio or video',
  category: 'Newly Added',

  async execute(msg, { sock, settings }) {

    const from = msg.key.remoteJid;
    const prefix = settings.prefix || global.COMMAND_PREFIX;

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const isAudio = msg.message?.audioMessage;
    const isVideo = msg.message?.videoMessage;
    const isQuotedAudio = quoted?.audioMessage;
    const isQuotedVideo = quoted?.videoMessage;

    if (!isAudio && !isVideo && !isQuotedAudio && !isQuotedVideo) {
      return sock.sendMessage(from, {
        text: `Reply to audio/video or send one with ${prefix}shazam`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, {
        text: '🔍 Identifying song... please wait.'
      }, { quoted: msg });

      const media = isAudio ? msg.message.audioMessage
        : isVideo ? msg.message.videoMessage
        : isQuotedAudio ? quoted.audioMessage
        : quoted.videoMessage;

      const mediaType = (isVideo || isQuotedVideo) ? 'video' : 'audio';

      const stream = await downloadContentFromMessage(media, mediaType);

      let buffer = Buffer.from([]);
      let size = 0;

      for await (const chunk of stream) {
        size += chunk.length;
        if (size > MAX_SIZE) break;
        buffer = Buffer.concat([buffer, chunk]);
      }

      const inputPath = path.join(__dirname, `../temp_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'mp3'}`);
      fs.writeFileSync(inputPath, buffer);

      let finalAudioPath = inputPath;

      if (mediaType === 'video') {
        finalAudioPath = inputPath.replace('.mp4', '.mp3');

        await new Promise((resolve, reject) => {
          exec(`ffmpeg -i "${inputPath}" -t 25 -vn -acodec mp3 "${finalAudioPath}" -y`,
            (err) => {
              if (err) reject(err);
              else resolve();
            });
        });

        fs.unlinkSync(inputPath);
      }

      const shazam = new Shazam();
      const result = await shazam.recognise(finalAudioPath);

      if (fs.existsSync(finalAudioPath))
        fs.unlinkSync(finalAudioPath);

      if (!result?.track) {
        return sock.sendMessage(from, {
          text: '❌ Could not identify the song.'
        }, { quoted: msg });
      }

      const title = result.track.title;
      const artist = result.track.subtitle;

      // 🔎 SEARCH ON YOUTUBE
      const search = await yts(`${title} ${artist}`);
      const video = search.videos[0];

      if (!video) {
        return sock.sendMessage(from, {
          text: `🎵 *${title}* - ${artist}\n\n(No YouTube result found)`
        }, { quoted: msg });
      }

      const caption =
`🎵 *SONG IDENTIFIED* 🎵

🎼 *Title:* ${title}
🎤 *Artist:* ${artist}

▶ *YouTube Result:* ${video.title}
📺 *Channel:* ${video.author.name}
⏱ *Duration:* ${video.timestamp}

🔗 *Watch:* ${video.url}

_Powered by Eclipse MD_`;

      await sock.sendMessage(from, {
        image: { url: video.thumbnail },
        caption
      }, { quoted: msg });

    } catch (err) {
      console.error('Error:', err);
      return sock.sendMessage(from, {
        text: `❌ Error: ${err.message}`
      }, { quoted: msg });
    }
  }
};
