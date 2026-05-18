import axios from 'axios';

export default {
  name: 'copilot',
  description: 'Ask Microsoft Copilot AI a question',
  aliases: ['mscopilot1'],
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prompt = args.join(' ');

    if (!prompt) {
      return await sock.sendMessage(from, {
        text: `❓ Please provide a prompt.\n\nUsage: ${settings.prefix}copilot <your question>`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { text: '🤖 Copilot is thinking... Please wait!' }, { quoted: msg });

      const encodedPrompt = encodeURIComponent(prompt);
      const seed = Math.floor(Math.random() * 99999);
      const response = await axios.get(
        `https://text.pollinations.ai/${encodedPrompt}?model=openai&seed=${seed}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain, */*' },
          timeout: 60000,
          responseType: 'text'
        }
      );

      const reply = typeof response.data === 'string' ? response.data.trim() : String(response.data).trim();
      if (!reply) throw new Error('Empty response');

      await sock.sendMessage(from, {
        text: `🤖 *Copilot Response:*\n\n${reply}`
      }, { quoted: msg });

    } catch (error) {
      console.error('[Copilot Error]', error.message);
      let errorMsg = '❌ Copilot is currently unavailable. Please try again later.';
      if (error.response?.status === 429) errorMsg = '❌ Copilot is busy. Please try again in a moment.';
      else if (error.code === 'ETIMEDOUT') errorMsg = '⏰ Request timed out. Please try again.';
      await sock.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
  }
};
