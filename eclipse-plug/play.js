import axios from "axios";
import yts from "yt-search";
import fs from "fs";
import path from "path";

const emojis = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "emojis.json"), "utf8")
);

const sessions = new Map();

export default {
    name: "play",
    description: "Search YouTube and download audio",
    category: "Media",
    aliases: ["song", "music"],

    async execute(msg, { sock, args }) {
        const from = msg.key.remoteJid;
        let input = args.join(" ").trim();
        const bodyText = (msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || "").trim();
        
        let selection = "";
        if (input === "1" || input === "2") {
            selection = input;
        } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const quotedText = (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "").trim();
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
            return sock.sendMessage(from, { text: `❌ *Provide search query or link*` }, { quoted: msg });
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
