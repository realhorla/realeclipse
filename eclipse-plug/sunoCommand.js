import axios from 'axios';

export default {
  name: 'suno',
  description: 'Generate AI music description and lyrics',
  aliases: ['music', 'generate-music', 'sunoai'],
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prompt = args.join(' ');

    if (!prompt) {
      return await sock.sendMessage(from, {
        text: `🎵 *Suno AI Music Generator*\n\nProvide a music style or theme and I'll generate lyrics and a description for it!\n\n*Usage:* ${settings.prefix}suno <music style/theme>\n*Example:* ${settings.prefix}suno upbeat electronic dance music with deep bass`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, {
        text: `🎵 *Suno AI* is generating music content... Please wait!`
      }, { quoted: msg });

      const systemPrompt = `You are a professional music producer and lyricist. The user wants music with the theme: "${prompt}". 
Create:
1. 🎵 **Song Title**: A catchy title
2. 🎸 **Genre/Style**: Detailed description of the music style, BPM, instruments, mood
3. 📝 **Lyrics**: Full lyrics with verse, chorus, bridge (at least 2 verses and 1 chorus)
4. 🎹 **Production Notes**: How it should be produced, what makes it unique

Make it creative, engaging, and professional.`;

      const encodedPrompt = encodeURIComponent(systemPrompt);
      const seed = Math.floor(Math.random() * 99999);

      const response = await axios.get(
        `https://text.pollinations.ai/${encodedPrompt}?model=openai&seed=${seed}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain, */*' },
          timeout: 60000,
          responseType: 'text'
        }
      );

      const result = typeof response.data === 'string' ? response.data.trim() : String(response.data || '').trim();
      if (!result) throw new Error('Empty response');

      await sock.sendMessage(from, {
        text: `🎵 *AI Music Generation*\n\n🎤 *Theme:* ${prompt}\n\n${result}\n\n> Powered by Eclipse MD`
      }, { quoted: msg });

    } catch (error) {
      console.error('[SUNO] Error:', error.message);
      await sock.sendMessage(from, {
        text: `❌ Music generation failed. Please try again.\n\n🔧 ${error.message}`
      }, { quoted: msg });
    }
  }
};
