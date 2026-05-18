import axios from 'axios';

export default {
    name: 'goodnight',
    description: 'Send goodnight message with sweet quotes',
    aliases: ['gn', 'night'],
    async execute(msg, { sock, args, settings }) {
        const from = msg.key.remoteJid;
        
        try {
            let goodnightMessage = '';

            try {
                const res = await axios.get('https://api.princetechn.com/api/fun/goodnight?apikey=prince', { timeout: 10000 });
                if (res.data?.success && res.data?.result) {
                    goodnightMessage = `🌙 *Good Night!* 🌙\n\n${res.data.result}\n\n✨ _Sweet dreams!_`;
                }
            } catch {}

            if (!goodnightMessage) {
                const defaults = [
                    '🌙 *Good Night!* 🌙\n\nMay your dreams be filled with peace and happiness. Sleep tight! 💤',
                    '✨ *Sweet Dreams!* ✨\n\nAs the stars light up the night sky, may your dreams be just as bright. Good night! 🌟',
                    '🌃 *Good Night!* 🌃\n\nRest well and recharge for tomorrow. You deserve the best sleep! 😴',
                    '💫 *Sleep Tight!* 💫\n\nLet go of today\'s worries and embrace the calm of the night. Good night! 🌙',
                    '🌠 *Good Night!* 🌠\n\nMay the night bring you rest and the morning bring you joy. Sweet dreams! 💖'
                ];
                goodnightMessage = defaults[Math.floor(Math.random() * defaults.length)];
            }

            await sock.sendMessage(from, { text: goodnightMessage }, { quoted: msg });

        } catch (error) {
            console.error('[GOODNIGHT] Error:', error);
            await sock.sendMessage(from, {
                text: '❌ Failed to send goodnight message. Please try again!'
            }, { quoted: msg });
        }
    }
};
