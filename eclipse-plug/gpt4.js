import axios from 'axios';

export default {
    name: 'gpt4',
    description: 'Ask GPT-4 a question using PrinceTechn API',
    aliases: ['gpt-4', 'ai'],
    async execute(msg, { sock, args, settings }) {
        const from = msg.key.remoteJid;
        
        let text = '';
        
        // Check if replying to a message
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            if (quotedMsg.conversation) {
                text = quotedMsg.conversation;
            } else if (quotedMsg.extendedTextMessage?.text) {
                text = quotedMsg.extendedTextMessage.text;
            }
        }
        
        // If no quoted text, use command arguments
        if (!text && args.length > 0) {
            text = args.join(' ');
        }

        if (!text) {
            return await sock.sendMessage(from, { 
                text: `❓ Please provide a question or prompt!\n\nUsage:\n• ${settings.prefix}gpt4 How are you?\n• Reply to a message with ${settings.prefix}gpt4` 
            }, { quoted: msg });
        }

        if (text.length > 2000) {
            return await sock.sendMessage(from, { 
                text: '❌ Text is too long! Maximum 2000 characters allowed.' 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(from, { 
                text: '🤖 GPT-4 is thinking... Please wait!' 
            }, { quoted: msg });

            // Encode the question for URL
            const encodedQuery = encodeURIComponent(text);

            // New API URL
            const apiUrl = `https://api.princetechn.com/api/ai/gpt4?apikey=prince&q=${encodedQuery}`;

            const response = await axios.get(apiUrl);

            const result = response.data;

            // Adjust this depending on API response structure
            const replyText = result?.response || result?.result || result?.message || JSON.stringify(result);

            await sock.sendMessage(from, { 
                text: `🤖 *GPT-4 Response:*\n\n${replyText}\n\n💡 *Tip:* You can reply to any message with ${settings.prefix}gpt4 to analyze it!` 
            }, { quoted: msg });

        } catch (error) {
            console.error('GPT-4 error:', error);
            
            let errorMessage = '❌ Sorry, GPT-4 is currently unavailable. Please try again later.';
            
            if (error.response?.status === 429) {
                errorMessage = '❌ GPT-4 is busy. Please try again in a few minutes.';
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                errorMessage = '❌ GPT-4 service is currently down. Please try again later.';
            } else if (error.response?.status === 400) {
                errorMessage = '❌ Invalid request. Please try with different text.';
            }
            
            await sock.sendMessage(from, { 
                text: errorMessage 
            }, { quoted: msg });
        }
    }
};