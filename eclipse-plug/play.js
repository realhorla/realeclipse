import yts from 'yt-search';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import ytdl from '@distube/ytdl-core';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { musicDownloader, alternativeSource, musicApi, logNetworkError } from '../lib/musicHelper.js';

// Load emojis
const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = util.promisify(exec);

let ytdlp;
try {
    const ytdlpModule = await import('yt-dlp-exec');
    ytdlp = ytdlpModule.default;
} catch (_) {
    ytdlp = null;
}

export default {
    name: 'play',
    description: 'Download and send music from YouTube as voice note',
    aliases: ['song', 'music'],
    category: 'Media',
        let selection = "";
        if (input === "1" || input === "2") {
            selection = input;
        } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedText = msg.message.extendedTextMessage.text || "";
            if (quotedText === "1" || quotedText === "2") {
                selection = quotedText;
            }
        } else if (bodyText === "1" || bodyText === "2") {
            selection = bodyText;
        }

        if (selection && sessions.has(from)) {
            const video = sessions.get(from);
            sessions.delete(from);

            await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });

            try {
                const apiURL = `https://api.princetechn.com/api/download/yta?apikey=prince&url=${encodeURIComponent(video.url || video.videoId)}`;
                const res = await axios.get(apiURL, { timeout: 60000 });

                if (!res.data?.success || !res.data?.result?.download_url) throw new Error("No download link");
                const downloadUrl = res.data.result.download_url;

                if (selection === "1") {
                    await sock.sendMessage(from, {
                        audio: { url: downloadUrl },
                        mimetype: "audio/mpeg",
                        fileName: `${video.title}.mp3`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, {
                        document: { url: downloadUrl },
                        mimetype: "audio/mpeg",
                        fileName: `${video.title}.mp3`
                    }, { quoted: msg });
                }

                await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            } catch (err) {
                console.error("Audio download error:", err);
                await sock.sendMessage(from, { text: `❌ Download failed.` }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: emojis.error, key: msg.key } });
            }
            return;
        }

        if (!input) {
            return sock.sendMessage(from, { text: `❌ *Provide search query*` }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });

        try {
            const search = await yts(input);
            if (!search || !search.videos || search.videos.length === 0) {
                 return sock.sendMessage(from, { text: `❌ No results found for "${input}"` }, { quoted: msg });
            }
            const video = search.videos[0];
            
            sessions.set(from, video);

            const menuText = `🎵 *${video.title}*
⏱ *Duration:* ${video.timestamp}
👤 *Channel:* ${video.author.name}

*Reply with a number to download:*
1️⃣ *Audio (MP3)*
2️⃣ *Document (File)*`;

            await sock.sendMessage(from, { 
                image: { url: video.thumbnail },
                caption: menuText
            }, { quoted: msg });

        } catch (err) {
            console.error("Audio search error:", err);
            await sock.sendMessage(from, { text: `❌ Search failed.` }, { quoted: msg });
        }
    }
};
