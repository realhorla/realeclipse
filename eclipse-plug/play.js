import axios from "axios";
import yts from "yt-search";
import fs from "fs";
import path from "path";

const emojis = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "emojis.json"), "utf8")
);

// ✅ Shared sessions store (per chat)
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
    ""
  ).trim();
}

async function doDownloadSelection({ msg, sock, selection }) {
  const from = msg.key.remoteJid;

  if (!sessions.has(from)) {
    await sock.sendMessage(
      from,
      { text: "❌ No pending download session. Use .play <song name> first." },
      { quoted: msg }
    );
    return true; // handled (we replied)
  }

  const video = sessions.get(from);
  sessions.delete(from);

  await sock.sendMessage(from, {
    react: { text: emojis.processing, key: msg.key },
  });

  try {
    // yt-search usually gives video.url; build fallback just in case
    const ytUrl = video?.url || `https://youtube.com/watch?v=${video.videoId}`;

    const apiURL =
      `https://api.princetechn.com/api/download/yta?apikey=prince&url=${encodeURIComponent(
        ytUrl
      )}`;

    const res = await axios.get(apiURL, { timeout: 60000 });

    if (!res.data?.success || !res.data?.result?.download_url) {
      throw new Error("No download link");
    }

    const downloadUrl = res.data.result.download_url;
    const fileName = `${video.title}.mp3`;

    if (selection === "1") {
      await sock.sendMessage(
        from,
        {
          audio: { url: downloadUrl },
          mimetype: "audio/mpeg",
          fileName,
        },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(
        from,
        {
          document: { url: downloadUrl },
          mimetype: "audio/mpeg",
          fileName,
        },
        { quoted: msg }
      );
    }

    await sock.sendMessage(from, {
      react: { text: emojis.success, key: msg.key },
    });
  } catch (err) {
    console.error("Audio download error:", err);
    await sock.sendMessage(
      from,
      { text: "❌ Download failed." },
      { quoted: msg }
    );
    await sock.sendMessage(from, {
      react: { text: emojis.error, key: msg.key },
    });
  }

  return true;
}

async function handleReply(msg, sock) {
  const body = getText(msg);

  // Only handle plain 1/2 replies
  if (body !== "1" && body !== "2") return false;

  // Only handle if there is an active session for this chat
  if (!sessions.has(msg.key.remoteJid)) return false;

  await doDownloadSelection({ msg, sock, selection: body });
  return true;
}

export default {
  name: "play",
  description: "Search YouTube and download audio",
  category: "Media",
  aliases: ["song", "music"],

  // ✅ Called by your index.js handler when user sends "1" or "2" without prefix
  onReply: handleReply,

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const input = (args || []).join(" ").trim();

    // ✅ Support `.play 1` / `.play 2` too (fallback)
    if (input === "1" || input === "2") {
      await doDownloadSelection({ msg, sock, selection: input });
      return;
    }

    if (!input) {
      await sock.sendMessage(
        from,
        { text: "❌ *Provide search query or link*\nExample: .play believer" },
        { quoted: msg }
      );
      return;
    }

    await sock.sendMessage(from, {
      react: { text: emojis.processing, key: msg.key },
    });

    try {
      const search = await yts(input);

      if (!search?.videos?.length) {
        await sock.sendMessage(
          from,
          { text: `❌ No results found for "${input}"` },
          { quoted: msg }
        );
        return;
      }

      const video = search.videos[0];
      sessions.set(from, video);

      const menuText = `🎵 *${video.title}*
⏱ *Duration:* ${video.timestamp}
👤 *Channel:* ${video.author.name}

*Reply with a number to download:*
1️⃣ *Audio (MP3)*
2️⃣ *Document (File)*`;

      await sock.sendMessage(
        from,
        {
          image: { url: video.thumbnail },
          caption: menuText,
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("Audio search error:", err);
      await sock.sendMessage(
        from,
        { text: "❌ Search failed." },
        { quoted: msg }
      );
    }
  },
};