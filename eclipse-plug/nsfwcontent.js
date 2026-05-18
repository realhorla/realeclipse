import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

const WAIFU_NSFW = 'https://api.waifu.pics/nsfw';
const NEKOS_BEST = 'https://nekos.best/api/v2';

async function fetchNsfwContent(category) {
  const categoryMap = {
    'ass': { api: 'waifu', endpoint: `${WAIFU_NSFW}/ass` },
    'ahegao': { api: 'waifu', endpoint: `${WAIFU_NSFW}/ahegao` },
    'bdsm': { api: 'waifu', endpoint: `${WAIFU_NSFW}/bdsm` },
    'blowjob': { api: 'waifu', endpoint: `${WAIFU_NSFW}/blowjob` },
    'cum': { api: 'waifu', endpoint: `${WAIFU_NSFW}/cum` },
    'feet': { api: 'waifu', endpoint: `${WAIFU_NSFW}/feet` },
    'gangbang': { api: 'waifu', endpoint: `${WAIFU_NSFW}/gangbang` },
    'hentai': { api: 'waifu', endpoint: `${WAIFU_NSFW}/hentai` },
    'lesbian': { api: 'waifu', endpoint: `${WAIFU_NSFW}/yuri` },
    'milf': { api: 'waifu', endpoint: `${WAIFU_NSFW}/milf` },
    'neko': { api: 'waifu', endpoint: `${WAIFU_NSFW}/hneko` },
    'oral': { api: 'waifu', endpoint: `${WAIFU_NSFW}/oral` },
    'pussy': { api: 'waifu', endpoint: `${WAIFU_NSFW}/pussy` },
    'thighs': { api: 'waifu', endpoint: `${WAIFU_NSFW}/hentai` },
    'tits': { api: 'waifu', endpoint: `${WAIFU_NSFW}/hentai` },
    'trap': { api: 'waifu', endpoint: `${WAIFU_NSFW}/trap` },
    'waifu': { api: 'waifu', endpoint: `${WAIFU_NSFW}/waifu` },
    'yaoi': { api: 'waifu', endpoint: `${WAIFU_NSFW}/yaoi` },
    'yuri': { api: 'waifu', endpoint: `${WAIFU_NSFW}/yuri` },
    'boobs': { api: 'waifu', endpoint: `${WAIFU_NSFW}/hentai` },
  };

  const target = categoryMap[category] || { api: 'waifu', endpoint: `${WAIFU_NSFW}/hentai` };

  try {
    const { data } = await axios.get(target.endpoint, { timeout: 15000 });
    const imageUrl = data?.url;
    if (!imageUrl) throw new Error('No URL returned');

    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const contentType = imgRes.headers['content-type'] || 'image/jpeg';
    const buffer = Buffer.from(imgRes.data);
    return {
      buffer,
      contentType,
      isGif: contentType.includes('gif'),
      isVideo: contentType.includes('video') || contentType.includes('mp4'),
      isImage: contentType.includes('image')
    };
  } catch (error) {
    console.error(`[NSFW ${category}] API Error:`, error.message);
    return null;
  }
}

function createNsfwCommand(name, category, description) {
  return {
    name: name,
    description: description,
    async execute(msg, { sock, settings }) {
      const from = msg.key.remoteJid;

      if (from.endsWith('@g.us')) {
        const nsfwEnabled = global.nsfwGroups?.[from];
        if (!nsfwEnabled) {
          return await sock.sendMessage(from, {
            text: `${emojis.error} NSFW commands are disabled in this group!\n\nAn admin can enable with: ${settings.prefix}nsfw on`
          }, { quoted: msg });
        }
      }

      try {
        await sock.sendMessage(from, { react: { text: emojis.processing || '⏳', key: msg.key } });

        const content = await fetchNsfwContent(category);

        if (!content || !content.buffer || content.buffer.length < 1000) {
          return await sock.sendMessage(from, {
            text: `${emojis.error} Failed to fetch ${name} content. Try again later.`
          }, { quoted: msg });
        }

        const caption = `🔞 *${name.toUpperCase()}*\n\n_NSFW Content - 18+ Only_`;

        if (content.isGif || content.isVideo) {
          await sock.sendMessage(from, { video: content.buffer, gifPlayback: content.isGif, caption }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { image: content.buffer, caption }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: emojis.success || '✅', key: msg.key } });

      } catch (error) {
        console.error(`[NSFW ${name}] Error:`, error.message);
        await sock.sendMessage(from, {
          text: `${emojis.error} Failed to fetch content: ${error.message}`
        }, { quoted: msg });
      }
    }
  };
}

const nsfwToggleCommand = {
  name: 'nsfw',
  description: 'Toggle NSFW commands in group',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: `${emojis.error} This command only works in groups!`
      }, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();

    if (!action || !['on', 'off', 'status'].includes(action)) {
      return await sock.sendMessage(from, {
        text: `🔞 *NSFW Settings*\n\n• ${settings.prefix}nsfw on - Enable NSFW\n• ${settings.prefix}nsfw off - Disable NSFW\n• ${settings.prefix}nsfw status - Check status`
      }, { quoted: msg });
    }

    if (!global.nsfwGroups) global.nsfwGroups = {};

    if (action === 'on') {
      global.nsfwGroups[from] = true;
      await sock.sendMessage(from, { text: `${emojis.success} NSFW commands *enabled* in this group!\n\n⚠️ 18+ content only.` }, { quoted: msg });
    } else if (action === 'off') {
      global.nsfwGroups[from] = false;
      await sock.sendMessage(from, { text: `${emojis.success} NSFW commands *disabled* in this group.` }, { quoted: msg });
    } else {
      const status = global.nsfwGroups[from] ? 'Enabled' : 'Disabled';
      await sock.sendMessage(from, { text: `🔞 NSFW Status: *${status}*` }, { quoted: msg });
    }
  }
};

export default [
  nsfwToggleCommand,
  createNsfwCommand('ass', 'ass', 'Get NSFW ass content'),
  createNsfwCommand('ahegao', 'ahegao', 'Get NSFW ahegao content'),
  createNsfwCommand('bdsm', 'bdsm', 'Get NSFW bdsm content'),
  createNsfwCommand('blowjob', 'blowjob', 'Get NSFW blowjob content'),
  createNsfwCommand('cum', 'cum', 'Get NSFW cum content'),
  createNsfwCommand('feet', 'feet', 'Get NSFW feet content'),
  createNsfwCommand('gangbang', 'gangbang', 'Get NSFW gangbang content'),
  createNsfwCommand('hentai', 'hentai', 'Get NSFW hentai content'),
  createNsfwCommand('lesbian', 'lesbian', 'Get NSFW lesbian content'),
  createNsfwCommand('milf', 'milf', 'Get NSFW milf content'),
  createNsfwCommand('nekonsfw', 'neko', 'Get NSFW neko content'),
  createNsfwCommand('oral', 'oral', 'Get NSFW oral content'),
  createNsfwCommand('pussy', 'pussy', 'Get NSFW pussy content'),
  createNsfwCommand('thighs', 'thighs', 'Get NSFW thighs content'),
  createNsfwCommand('tits', 'tits', 'Get NSFW tits content'),
  createNsfwCommand('trap', 'trap', 'Get NSFW trap content'),
  createNsfwCommand('waifunsfw', 'waifu', 'Get NSFW waifu content'),
  createNsfwCommand('yaoi', 'yaoi', 'Get NSFW yaoi content'),
  createNsfwCommand('yuri', 'yuri', 'Get NSFW yuri content'),
  createNsfwCommand('boobs', 'boobs', 'Get NSFW boobs content'),
];
