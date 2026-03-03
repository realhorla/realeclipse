import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { updateSetting } from '../lib/persistentData.js';

export default {
    name: 'settheme',
    description: 'Change the bot menu image by replying to an image',
    category: 'Self',
    async execute(msg, { sock, isOwner }) {
        if (!isOwner) return;

        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg || !quotedMsg.imageMessage) {
            return sock.sendMessage(msg.key.remoteJid, { text: '❌ Please reply to an image with .settheme' }, { quoted: msg });
        }

        try {
            const buffer = await downloadMediaMessage(
                { message: quotedMsg },
                'buffer',
                {},
                { logger: console }
            );

            const fileName = `theme_${Date.now()}.jpg`;
            const filePath = path.join(process.cwd(), 'data', fileName);
            
            if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
                fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
            }

            fs.writeFileSync(filePath, buffer);

            // Update the mediaUrls.js or just use persistent settings
            // For this bot, we'll try to update the global theme setting
            const imageUrl = `file://${filePath}`; 
            // Since we can't easily edit mediaUrls.js programmatically without risk
            // We'll store it in settings and index.js will handle it
            updateSetting('menuImage', filePath);

            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Bot theme image updated successfully!' }, { quoted: msg });
        } catch (error) {
            console.error('Settheme error:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to update theme image.' }, { quoted: msg });
        }
    }
};
