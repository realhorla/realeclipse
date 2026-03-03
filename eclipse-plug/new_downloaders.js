import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojis = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "emojis.json"), "utf8")
);

export default [
    {
        name: "pastebin",
        description: "Download content from Pastebin",
        category: "Download",
        async execute(msg, { sock, args }) {
            const from = msg.key.remoteJid;
            const url = args[0];
            if (!url) return sock.sendMessage(from, { text: "❌ Provide Pastebin URL" }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
            try {
                const res = await axios.get(`https://api.princetechn.com/api/download/pastebin?apikey=prince&url=${encodeURIComponent(url)}`);
                if (!res.data?.success) throw new Error("Failed");
                await sock.sendMessage(from, { text: res.data.result.content || res.data.result.output }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Download failed" }, { quoted: msg });
            }
        }
    },
    {
        name: "mediafire",
        description: "Download file from Mediafire",
        category: "Download",
        async execute(msg, { sock, args }) {
            const from = msg.key.remoteJid;
            const url = args[0];
            if (!url) return sock.sendMessage(from, { text: "❌ Provide Mediafire URL" }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
            try {
                const res = await axios.get(`https://api.princetechn.com/api/download/mediafire?apikey=prince&url=${encodeURIComponent(url)}`);
                if (!res.data?.success) throw new Error("Failed");
                const result = res.data.result;
                await sock.sendMessage(from, {
                    document: { url: result.download_url || result.link },
                    mimetype: result.mimetype || "application/octet-stream",
                    fileName: result.filename || "file",
                    caption: `📂 *File:* ${result.filename}`
                }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Download failed" }, { quoted: msg });
            }
        }
    },
    {
        name: "googledrive",
        aliases: ["gdrive"],
        description: "Download file from Google Drive",
        category: "Download",
        async execute(msg, { sock, args }) {
            const from = msg.key.remoteJid;
            const url = args[0];
            if (!url) return sock.sendMessage(from, { text: "❌ Provide Google Drive URL" }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
            try {
                const res = await axios.get(`https://api.princetechn.com/api/download/googledrive?apikey=prince&url=${encodeURIComponent(url)}`);
                if (!res.data?.success) throw new Error("Failed");
                const result = res.data.result;
                await sock.sendMessage(from, {
                    document: { url: result.download_url || result.link },
                    fileName: result.filename || "file",
                    caption: `📂 *File:* ${result.filename}`
                }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Download failed" }, { quoted: msg });
            }
        }
    },
    {
        name: "snackdl",
        description: "Download video from SnackVideo",
        category: "Download",
        async execute(msg, { sock, args }) {
            const from = msg.key.remoteJid;
            const url = args[0];
            if (!url) return sock.sendMessage(from, { text: "❌ Provide SnackVideo URL" }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
            try {
                const res = await axios.get(`https://api.princetechn.com/api/download/snackvideo?apikey=prince&url=${encodeURIComponent(url)}`);
                if (!res.data?.success) throw new Error("Failed");
                const result = res.data.result;
                await sock.sendMessage(from, {
                    video: { url: result.download_url || result.url },
                    caption: `🎬 *SnackVideo:* ${result.title || ""}`
                }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Download failed" }, { quoted: msg });
            }
        }
    },
    {
        name: "aiodl",
        description: "All-in-one downloader",
        category: "Download",
        async execute(msg, { sock, args }) {
            const from = msg.key.remoteJid;
            const url = args[0];
            if (!url) return sock.sendMessage(from, { text: "❌ Provide URL" }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: emojis.processing, key: msg.key } });
            try {
                const res = await axios.get(`https://api.princetechn.com/api/download/aiodl?apikey=prince&url=${encodeURIComponent(url)}`);
                if (!res.data?.success) throw new Error("Failed");
                const result = res.data.result;
                const mediaUrl = result.download_url || result.url || result.link;
                if (result.type === 'image') {
                    await sock.sendMessage(from, { image: { url: mediaUrl }, caption: result.title }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { video: { url: mediaUrl }, caption: result.title }, { quoted: msg });
                }
                await sock.sendMessage(from, { react: { text: emojis.success, key: msg.key } });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Download failed" }, { quoted: msg });
            }
        }
    }
];
