import axios from "axios";

export default {
  name: "dlmovie",
  aliases: ["downloadmovie"],
  category: "download",
  description: "Download Silent Movie / Series episode as WhatsApp DOCUMENT (no disk usage)",

  async execute(m, { sock, args, settings }) {
    const from = m.key.remoteJid;
    const PREFIX = settings?.prefix || ".";
    const reply = (text) => sock.sendMessage(from, { text }, { quoted: m });

    const movieId = args[0];
    const season = args[1] && args[1] !== "null" ? args[1] : null;
    const episode = args[2] && args[2] !== "null" ? args[2] : null;
    const subLang = args.slice(3).join(" ").trim();

    if (!movieId) {
      return reply(`Usage: ${PREFIX}dlmovie <movie_id> [season] [episode] [language]`);
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      const requestParams = { movie_id: movieId };
      if (season && episode) {
        requestParams.season = season;
        requestParams.episode = episode;
      }
      if (subLang) requestParams.sub_lang = subLang;

      const { data } = await axios.get(
        "https://darkvibe314-silent-movies-api.hf.space/api/download",
        { params: requestParams }
      );

      const url = data?.download_url;
      if (!url) throw new Error("No download_url returned by API.");

      const sizeBytes = data?.size_bytes ? parseInt(data.size_bytes, 10) : 0;
      const sizeMB = sizeBytes ? Number((sizeBytes / (1024 * 1024)).toFixed(2)) : null;

      const fileName =
        season && episode
          ? `Silent_Series_${movieId}_S${season}E${episode}.mp4`
          : `Silent_Movie_${movieId}.mp4`;

      // ✅ ALWAYS send as DOCUMENT BY URL (WhatsApp fetches it; your server doesn't download it)
      await sock.sendMessage(
        from,
        {
          document: { url },
          mimetype: "video/mp4",
          fileName,
          caption: `🎬 ${fileName}${sizeMB ? `\n📦 ${sizeMB} MB` : ""}`,
        },
        { quoted: m }
      );

      // ✅ Subtitles: also send BY URL (do NOT axios arraybuffer => avoids disk/memory spikes)
      if (data?.subtitle_url) {
        const subName =
          season && episode
            ? `Subtitles_${subLang || "Default"}_S${season}E${episode}.srt`
            : `Subtitles_${subLang || "Default"}.srt`;

        await sock.sendMessage(
          from,
          {
            document: { url: data.subtitle_url },
            mimetype: "application/x-subrip",
            fileName: subName,
            caption: `📝 ${subLang || "Default"} subtitles`,
          },
          { quoted: m }
        );
      }

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("[DLMOVIE ERROR]", e?.response?.data || e?.message || e);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return reply(`Download Error: ${e?.response?.data?.detail || e.message}`);
    }
  },
};