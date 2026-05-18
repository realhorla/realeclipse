import axios from 'axios';

export default {
    name: 'goodmorning',
    description: 'Send good morning message with motivational quotes',
    aliases: ['gm', 'morning'],
    async execute(msg, { sock, args, settings }) {
        const from = msg.key.remoteJid;
        
        try {
            let morningMessage = '';

            try {
                const res = await axios.get('https://api.princetechn.com/api/fun/motivation?apikey=prince', { timeout: 10000 });
                if (res.data?.success && res.data?.result) {
                    morningMessage = `☀️ *Good Morning!* ☀️\n\n${res.data.result}\n\n🌅 _Have a blessed day!_`;
                }
            } catch {}

            if (!morningMessage) {
                const defaults = [
                    '☀️ *Good Morning!* ☀️\n\nRise and shine! Today is a new day full of possibilities. Make it amazing! 🌅',
                    '🌄 *Good Morning!* 🌄\n\nEvery morning is a fresh start. Embrace it with a smile and positive energy! 😊',
                    '🌞 *Rise and Shine!* 🌞\n\nA new day means new opportunities. Go out there and make the most of it! 💪',
                    '🌻 *Good Morning!* 🌻\n\nStart your day with gratitude and watch how beautiful it becomes. Have a blessed day! 🙏',
                    '🌈 *Good Morning!* 🌈\n\nBelieve in yourself and all that you are. Today is your day to shine! ✨'
                ];
                morningMessage = defaults[Math.floor(Math.random() * defaults.length)];
            }

            await sock.sendMessage(from, { text: morningMessage }, { quoted: msg });

        } catch (error) {
            console.error('[GOODMORNING] Error:', error);
            await sock.sendMessage(from, {
                text: '❌ Failed to send good morning message. Please try again!'
            }, { quoted: msg });
        }
    }
};
