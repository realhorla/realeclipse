import { proto, generateWAMessageFromContent } from "@whiskeysockets/baileys";

global.movieSubCache = global.movieSubCache || {};

export default {
  name: "smsubs",
  aliases: ["subs", "sub", "subtitles"],
  category: "download",
  description: "Select subtitle language for a Silent Movie",

  async execute(m, { sock, args, settings }) {
    const from = m.key.remoteJid;
    const PREFIX = settings?.prefix || ".";
    const reply = (text) => sock.sendMessage(from, { text }, { quoted: m });

    const movieId = args[0];
    const season = args[1] === "null" ? null : args[1];
    const episode = args[2] === "null" ? null : args[2];

    if (!movieId) {
      return reply(`📝 Usage:\n${PREFIX}smsubs <movie_id> [season] [episode]`);
    }

    const cachedSubs = global.movieSubCache[String(movieId)];
    if (!cachedSubs || cachedSubs === "None") {
      return reply("🩸 No subtitles are available for this media.");
    }

    const subList = String(cachedSubs)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!subList.length) return reply("🩸 No subtitles are available for this media.");

    const rows = subList.map((sub) => ({
      header: "",
      title: `📝 ${sub}`,
      description: `Download video with ${sub} subtitles`,
      id: `${PREFIX}dlmovie ${movieId} ${season || "null"} ${episode || "null"} ${sub}`,
    }));

    const sections = [{ title: "Available Languages", rows }];

    const interactiveMsg = generateWAMessageFromContent(
      from,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: "🗣️ *Select Subtitle Language*\n\nChoose a language from the list below to start downloading:",
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: "© Silent Tech" }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: "📝 Subtitles",
                subtitle: "",
                hasMediaAttachment: false,
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                      title: "🌐 Choose Language",
                      sections,
                    }),
                  },
                ],
              }),
            }),
          },
        },
      },
      { quoted: m }
    );

    await sock.relayMessage(from, interactiveMsg.message, { messageId: interactiveMsg.key.id });
  },
};