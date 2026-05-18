import axios from "axios";

const MOVIE_API = "https://mv-api.silent7.app/api";
const MOVIE_API_KEY = "silenttech";

export default {
  name: "dlmovie",
  aliases: ["downloadmovie"],
  category: "download",
  description: "Download movie or browse series episodes using Silent Tech API",

  async execute(m, { sock, args, settings }) {
    const from = m.key.remoteJid;
    const PREFIX = settings?.prefix || ".";
    const reply = (text) => sock.sendMessage(from, { text }, { quoted: m });

    const subjectId = args[0];
    const mode = args[1] || "movie";

    if (!subjectId) {
      return reply(`Usage:\n${PREFIX}dlmovie <subject_id> [movie|series|info]\n\nUse ${PREFIX}movie <title> to search first.`);
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      if (mode === "info") {
        const { data } = await axios.get(`${MOVIE_API}/item-details`, {
          params: { api: MOVIE_API_KEY, id: subjectId },
          timeout: 20000
        });
        const p = data?.payload;
        if (!p) return reply("❌ Movie info not found.");

        const cast = p.staffList?.slice(0, 5).map(s => `• ${s.name} as ${s.character}`).join("\n") || "N/A";
        const subs = p.subtitles || "None";
        const dubs = p.dubs?.map(d => d.lanName).join(", ") || "None";

        const text = `🎬 *${p.title}*\n\n` +
          `📅 Release: ${p.releaseDate || "N/A"}\n` +
          `⭐ IMDb: ${p.imdbRatingValue || "N/A"}\n` +
          `🎭 Genre: ${p.genre || "N/A"}\n` +
          `🌍 Country: ${p.countryName || "N/A"}\n` +
          `🗣️ Language: ${p.language || "N/A"}\n` +
          `📺 Content Rating: ${p.contentRating || "N/A"}\n\n` +
          `📖 *Description:*\n${p.description || "No description available."}\n\n` +
          `🎭 *Cast:*\n${cast}\n\n` +
          `💬 Subtitles: ${subs}\n` +
          `🎙️ Dubs: ${dubs}`;

        const coverUrl = p.cover?.url;
        if (coverUrl) {
          await sock.sendMessage(from, { image: { url: coverUrl }, caption: text }, { quoted: m });
        } else {
          await reply(text);
        }
        return;
      }

      if (mode === "series") {
        const { data } = await axios.get(`${MOVIE_API}/media`, {
          params: { api: MOVIE_API_KEY, id: subjectId },
          timeout: 20000
        });
        const episodes = data?.payload?.full_resource_list;
        if (!episodes?.length) return reply("❌ No episodes found for this series.");

        let text = `📺 *Available Episodes* (${episodes.length} total)\n\n`;
        const shown = episodes.slice(0, 15);
        for (const ep of shown) {
          const sizeMB = ep.size ? (parseInt(ep.size) / 1024 / 1024).toFixed(0) + "MB" : "?";
          const dur = ep.duration ? Math.floor(ep.duration / 60) + "min" : "?";
          text += `*S${ep.se}E${ep.ep}* - ${ep.title || "Episode " + ep.ep}\n`;
          text += `  📦 ${sizeMB} | ⏱️ ${dur} | 📺 ${ep.resolution}p\n`;
          text += `  🔗 ${ep.resourceLink}\n\n`;
        }
        if (episodes.length > 15) {
          text += `_...and ${episodes.length - 15} more episodes_`;
        }

        await reply(text);
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
        return;
      }

      // Default: movie download
      const { data } = await axios.get(`${MOVIE_API}/item-details`, {
        params: { api: MOVIE_API_KEY, id: subjectId },
        timeout: 20000
      });

      const p = data?.payload;
      if (!p) return reply("❌ Movie not found.");

      const resource = p.resourceDetectors?.[0];
      if (!resource) return reply("❌ No download resource available for this movie.");

      // Try resolutionList for best quality direct URL
      const resList = resource.resolutionList || [];
      let downloadUrl = resource.downloadUrl || "";
      let resolution = "";
      let sizeMB = "";

      if (resList.length > 0) {
        // Pick best available resolution (720p preferred, else highest)
        const preferred = resList.find(r => r.resolution === 720) ||
          resList.find(r => r.resolution === 480) ||
          resList.sort((a, b) => b.resolution - a.resolution)[0];
        downloadUrl = preferred.resourceLink || preferred.downloadUrl || downloadUrl;
        resolution = preferred.resolution + "p";
        sizeMB = preferred.size ? (parseInt(preferred.size) / 1024 / 1024).toFixed(0) + " MB" : "";
      } else if (resource.downloadUrl) {
        downloadUrl = resource.downloadUrl;
        sizeMB = resource.firstSize ? (parseInt(resource.firstSize) / 1024 / 1024).toFixed(0) + " MB" : "";
      }

      if (!downloadUrl) {
        return reply(`❌ No direct download URL available.\n\n🔗 Resource: ${resource.resourceLink || "N/A"}`);
      }

      const fileName = `${(p.title || "Movie").replace(/[^a-zA-Z0-9 ]/g, "_")}_${resolution || "SD"}.mp4`;

      const caption = `🎬 *${p.title}*\n` +
        `📅 ${p.releaseDate?.split("-")[0] || ""} | ⭐ ${p.imdbRatingValue || "N/A"}\n` +
        (resolution ? `📺 Quality: ${resolution}\n` : "") +
        (sizeMB ? `📦 Size: ${sizeMB}\n` : "");

      await sock.sendMessage(from, {
        document: { url: downloadUrl },
        mimetype: "video/mp4",
        fileName,
        caption
      }, { quoted: m });

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error("[DLMOVIE ERROR]", e?.response?.data || e?.message || e);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      reply(`❌ Download Error: ${e?.response?.data?.detail || e.message}`);
    }
  }
};
