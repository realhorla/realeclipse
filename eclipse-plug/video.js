import axios from "axios";
import yts from "yt-search";
import fs from "fs";
import path from "path";

const emojis = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "emojis.json"), "utf8")
);

// ✅ Shared sessions store (per chat)
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
    ""
  ).trim();
}

async function doDownloadSelection({ msg, sock, selection }) {
  const from = msg.key.remoteJid;

  if (!sessions.has(from)) {
    await sock.sendMessage(
      from,
      { text: "❌ No pending video session. Use .video <name> first." },
      { quoted: msg }
    );
    return true;
  }

  const video = sessions.get(from);
  sessions.delete(from);

  await sock.sendMessage(from, {
    react: { text: emojis.processing, key: msg.key },
  });

  try {
    const ytUrl = video?.url || `https://youtube.com/watch?v=${video.videoId}`;

    // ✅ PrinceTechn VIDEO endpoint (ytv)
    const apiURL =
      `https://api.princetechn.com/api/download/ytv?apikey=prince&url=${encodeURIComponent(
        ytUrl
      )}`;

    const res = await axios.get(apiURL, { timeout: 60000 });

    if (!res.data?.success || !res.data?.result?.download_url) {
      throw new Error("No download link");
    }

    const downloadUrl = res.data.result.download_url;
    const fileName = `${video.title}.mp4`;

    // 1️⃣ send video (stream)
    if (selection === "1") {
      await sock.sendMessage(
        from,
        {
          video: { url: downloadUrl },
          mimetype: "video/mp4",
          fileName,
          caption: `🎬 *${video.title}*`,
        },
        { quoted: msg }
      );
    } else {
      // 2️⃣ send as document
      await sock.sendMessage(
        from,
        {
          document: { url: downloadUrl },
          mimetype: "video/mp4",
          fileName,
        },
        { quoted: msg }
      );
    }

    await sock.sendMessage(from, {
      react: { text: emojis.success, key: msg.key },
    });
  } catch (err) {
    console.error("Video download error:", err);
    await sock.sendMessage(
      from,
      { text: "❌ Video download failed." },
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

  if (body !== "1" && body !== "2") return false;
  if (!sessions.has(msg.key.remoteJid)) return false;

  await doDownloadSelection({ msg, sock, selection: body });
  return true;
}

export default {
  name: "video",
  description: "Search YouTube and download video",
  category: "Media",
  aliases: ["ytv", "vid"],

  // ✅ Called by index.js quick-reply router for plain "1" / "2"
  onReply: handleReply,

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const input = (args || []).join(" ").trim();

    // ✅ Support `.video 1` / `.video 2` (fallback)
    if (input === "1" || input === "2") {
      await doDownloadSelection({ msg, sock, selection: input });
      return;
    }

    if (!input) {
      await sock.sendMessage(
        from,
        { text: "❌ *Provide search query or link*\nExample: .video believer" },
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

      const menuText = `🎬 *${video.title}*
⏱ *Duration:* ${video.timestamp}
👤 *Channel:* ${video.author.name}

*Reply with a number to download:*
1️⃣ *Video (MP4)*
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
      console.error("Video search error:", err);
      await sock.sendMessage(
        from,
        { text: "❌ Search failed." },
        { quoted: msg }
      );
    }
  },
};