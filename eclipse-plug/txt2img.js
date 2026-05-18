import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

const POLLINATIONS_IMAGE = 'https://image.pollinations.ai/prompt';

const COMMANDS = {
  txt2cartoon:      'cartoon style, animated, colorful, fun, cel-shaded',
  txt2pixelart:     'pixel art, 8-bit retro game style, chunky pixels, vibrant colors',
  txt2sketch:       'pencil sketch, hand drawn, black and white, detailed hatching',
  txt2abstractimg:  'abstract art, surreal, geometric shapes, vibrant colors, expressionist',
  txt2minimalistimg:'minimalist, simple clean lines, flat design, modern, white background',
  txt2vintage:      'vintage retro style, old photograph, film grain, sepia tones, 1960s aesthetic',
  txt2steampunk:    'steampunk style, brass gears, Victorian era, mechanical, copper tones',
  txt2horror:       'horror style, dark and scary, eerie atmosphere, gothic, cinematic',
  txt2scifi:        'sci-fi style, futuristic, space technology, neon lights, cyberpunk',
};

function createTxt2ImageCommand(name, stylePrompt) {
  return {
    name,
    description: `Generate ${name.replace('txt2', '')} AI image using Pollinations`,
    async execute(msg, { sock, args }) {
      try {
        const input = args.join(' ');
        if (!input) {
          return sock.sendMessage(
            msg.key.remoteJid,
            { text: `${emojis.error || '❌'} *Usage:* ${name} <prompt>\n\n*Example:* ${name} a beautiful forest\n\nOptionally add | for negative prompt:\n${name} sunset | blurry, ugly` },
            { quoted: msg }
          );
        }

        const [prompt, negativePrompt] = input.split('|').map(v => v?.trim());

        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: '🎨', key: msg.key }
        });

        await sock.sendMessage(msg.key.remoteJid, {
          text: `🎨 Generating *${name.replace('txt2', '')}* image...\n\n📝 *Prompt:* ${prompt}\n⏳ Please wait...`
        }, { quoted: msg });

        const fullPrompt = negativePrompt
          ? `${prompt}, ${stylePrompt}, avoid: ${negativePrompt}`
          : `${prompt}, ${stylePrompt}`;

        const encodedPrompt = encodeURIComponent(fullPrompt);
        const seed = Math.floor(Math.random() * 99999);
        const imageUrl = `${POLLINATIONS_IMAGE}/${encodedPrompt}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true&enhance=true`;

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            image: { url: imageUrl },
            caption:
              `${emojis.success || '✅'} *Image Generated!*\n` +
              `🎨 *Style:* ${name.replace('txt2', '')}\n` +
              `📝 *Prompt:* ${prompt}` +
              (negativePrompt ? `\n🚫 *Avoid:* ${negativePrompt}` : '') +
              `\n\n> Powered by Eclipse MD`
          },
          { quoted: msg }
        );

        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: '✅', key: msg.key }
        });

      } catch (err) {
        console.error(`${name} error:`, err.message);
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: `${emojis.error || '❌'} Image generation failed. Please try again.\n\n🔧 Error: ${err.message}` },
          { quoted: msg }
        );
      }
    }
  };
}

export default Object.entries(COMMANDS).map(([name, style]) =>
  createTxt2ImageCommand(name, style)
);
