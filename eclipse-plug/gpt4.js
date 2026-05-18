import axios from 'axios';

export default {
  name: 'gpt4',
  description: 'Ask GPT-4 a question',
  aliases: ['gpt-4', 'ai'],
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;

    let text = '';
    if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const q = msg.message.extendedTextMessage.contextInfo.quotedMessage;
      text = q.conversation || q.extendedTextMessage?.text || '';
    }
    if (!text && args.length > 0) text = args.join(' ');

    if (!text) {
      return await sock.sendMessage(from, {
        text: `❓ Please provide a question!\n\nUsage:\n• ${settings.prefix}gpt4 <your question>\n• Reply to a message with ${settings.prefix}gpt4`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { text: '🤖 GPT-4 is thinking... Please wait!' }, { quoted: msg });

      const encodedPrompt = encodeURIComponent(text);
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
        text: `🤖 *GPT-4 Response:*\n\n${reply}`
      }, { quoted: msg });

    } catch (error) {
      console.error('GPT-4 error:', error.message);
      let errorMsg = '❌ GPT-4 is currently unavailable. Please try again later.';
      if (error.response?.status === 429) errorMsg = '❌ AI is busy. Please try again in a moment.';
      else if (error.code === 'ETIMEDOUT') errorMsg = '⏰ Request timed out. Please try again.';
      await sock.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
  }
};
