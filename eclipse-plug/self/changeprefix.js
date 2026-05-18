import { updateSetting } from '../../lib/persistentData.js';

export default {
  name: 'changeprefix',
  description: 'Change the bot command prefix (self mode, DM only)',
  category: 'Self',
  aliases: ['setprefix', 'prefix'],
  async execute(msg, { sock, args, isOwner, settings }) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    if (isGroup) {
      return await sock.sendMessage(from, {
        text: '❌ This command can only be used in private DM, not in groups.'
      }, { quoted: msg });
    }

    if (!isOwner) {
      return await sock.sendMessage(from, {
        text: '❌ Only the bot owner can change the prefix.'
      }, { quoted: msg });
    }

    if (global.botMode !== 'self') {
      return await sock.sendMessage(from, {
        text: `❌ Prefix can only be changed in *SELF* mode.\nSwitch to self mode first with \`${settings.prefix}self\``
      }, { quoted: msg });
    }

    const newPrefix = args[0];

    if (!newPrefix) {
      return await sock.sendMessage(from, {
        text: `*Change Bot Prefix*\n\nCurrent prefix: *${settings.prefix}*\n\nUsage: \`${settings.prefix}changeprefix <new_prefix>\`\nExample: \`${settings.prefix}changeprefix !\`\n\n⚠️ Prefix must be a single character or short symbol.`
      }, { quoted: msg });
    }

    if (newPrefix.length > 3) {
      return await sock.sendMessage(from, {
        text: '❌ Prefix is too long. Please use 1-3 characters (e.g. `.`, `!`, `#`, `>>`)'
      }, { quoted: msg });
    }

    const oldPrefix = settings.prefix;
    global.COMMAND_PREFIX = newPrefix;
    updateSetting('prefix', newPrefix);

    await sock.sendMessage(from, {
      text: `✅ *Prefix changed successfully!*\n\n• Old prefix: *${oldPrefix}*\n• New prefix: *${newPrefix}*\n\nBot will now respond to: \`${newPrefix}menu\`, \`${newPrefix}help\`, etc.`
    }, { quoted: msg });
  }
};
