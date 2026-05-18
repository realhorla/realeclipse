import fs from 'fs';
import path from 'path';
import axios from 'axios';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'autogreet.json');

function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return { 
                enabled: false, 
                morningTime: '07:00',  // 7:00 AM
                nightTime: '22:00',    // 10:00 PM
                lastMorningGreet: null,
                lastNightGreet: null
            };
        }
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
        return { 
            enabled: false, 
            morningTime: '07:00', 
            nightTime: '22:00',
            lastMorningGreet: null,
            lastNightGreet: null
        };
    }
}

function saveConfig(config) {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('[AUTOGREET] Config save error:', err);
    }
}

export default {
    name: 'autogreet',
    description: 'Configure automatic good morning and goodnight messages (self mode only)',
    aliases: ['autogreeting'],
    async execute(msg, { sock, args, settings }) {
        const from = msg.key.remoteJid;

        if (!msg.key.fromMe) {
            return await sock.sendMessage(from, {
                text: '❌ This is a self mode command. Only accessible when using your own account.'
            }, { quoted: msg });
        }

        const config = loadConfig();

        if (!args[0]) {
            return await sock.sendMessage(from, {
                text: `🌅 *AUTO-GREET CONFIGURATION* 🌙

📊 **Current Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}
⏰ **Morning Time:** ${config.morningTime} (Africa/Lagos)
🌙 **Night Time:** ${config.nightTime} (Africa/Lagos)

**Commands:**
• \`${settings.prefix}autogreet on\` - Enable auto greetings
• \`${settings.prefix}autogreet off\` - Disable auto greetings
• \`${settings.prefix}autogreet morning HH:MM\` - Set morning time (24h format)
• \`${settings.prefix}autogreet night HH:MM\` - Set night time (24h format)
• \`${settings.prefix}autogreet status\` - Check current status

**Features:**
• Automatically sends good morning at set time
• Automatically sends goodnight at set time
• Sends to your own account (self chat)`
            }, { quoted: msg });
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'on':
            case 'enable':
                config.enabled = true;
                saveConfig(config);
                await sock.sendMessage(from, {
                    text: `✅ *Auto-greet enabled!*\n\n🌅 Good morning at ${config.morningTime}\n🌙 Goodnight at ${config.nightTime}\n\n*Messages will be sent to your own chat.*`
                }, { quoted: msg });
                break;

            case 'off':
            case 'disable':
                config.enabled = false;
                saveConfig(config);
                await sock.sendMessage(from, {
                    text: '❌ *Auto-greet disabled!*'
                }, { quoted: msg });
                break;

            case 'morning':
                if (!args[1]) {
                    return await sock.sendMessage(from, {
                        text: '❌ Invalid time format!\n\n**Formats:**\n• 24-hour: `07:00`\n• 12-hour: `7:00 AM` or `07:00AM`\n\n**Examples:**\n• `' + settings.prefix + 'autogreet morning 07:00`\n• `' + settings.prefix + 'autogreet morning 7:00 AM`'
                    }, { quoted: msg });
                }
                
                // Parse time (support both 24-hour and 12-hour formats)
                let timeStr = args.slice(1).join(' ').trim();
                let time24 = '';
                
                // Check if it's 12-hour format (contains AM/PM)
                if (/am|pm/i.test(timeStr)) {
                    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
                    if (!match) {
                        return await sock.sendMessage(from, {
                            text: '❌ Invalid 12-hour format! Use: `7:00 AM` or `07:00 PM`'
                        }, { quoted: msg });
                    }
                    let hour = parseInt(match[1]);
                    const minute = match[2];
                    const period = match[3].toLowerCase();
                    
                    // Convert to 24-hour
                    if (period === 'pm' && hour !== 12) hour += 12;
                    if (period === 'am' && hour === 12) hour = 0;
                    
                    time24 = `${hour.toString().padStart(2, '0')}:${minute}`;
                } else if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
                    // 24-hour format
                    const parts = timeStr.split(':');
                    const hour = parseInt(parts[0]);
                    const minute = parts[1];
                    if (hour > 23 || parseInt(minute) > 59) {
                        return await sock.sendMessage(from, {
                            text: '❌ Invalid time! Hour must be 0-23, minute must be 0-59'
                        }, { quoted: msg });
                    }
                    time24 = `${hour.toString().padStart(2, '0')}:${minute}`;
                } else {
                    return await sock.sendMessage(from, {
                        text: '❌ Invalid time format! Use 24-hour (07:00) or 12-hour (7:00 AM)'
                    }, { quoted: msg });
                }
                
                config.morningTime = time24;
                saveConfig(config);
                await sock.sendMessage(from, {
                    text: `✅ Morning greeting time set to *${time24}* (24-hour format)\n🌅 Original: ${timeStr}`
                }, { quoted: msg });
                break;

            case 'night':
                if (!args[1]) {
                    return await sock.sendMessage(from, {
                        text: '❌ Invalid time format!\n\n**Formats:**\n• 24-hour: `22:00`\n• 12-hour: `10:00 PM` or `10:00PM`\n\n**Examples:**\n• `' + settings.prefix + 'autogreet night 22:00`\n• `' + settings.prefix + 'autogreet night 10:00 PM`'
                    }, { quoted: msg });
                }
                
                // Parse time (support both 24-hour and 12-hour formats)
                let nightTimeStr = args.slice(1).join(' ').trim();
                let nightTime24 = '';
                
                // Check if it's 12-hour format (contains AM/PM)
                if (/am|pm/i.test(nightTimeStr)) {
                    const match = nightTimeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
                    if (!match) {
                        return await sock.sendMessage(from, {
                            text: '❌ Invalid 12-hour format! Use: `10:00 PM` or `10:00PM`'
                        }, { quoted: msg });
                    }
                    let hour = parseInt(match[1]);
                    const minute = match[2];
                    const period = match[3].toLowerCase();
                    
                    // Convert to 24-hour
                    if (period === 'pm' && hour !== 12) hour += 12;
                    if (period === 'am' && hour === 12) hour = 0;
                    
                    nightTime24 = `${hour.toString().padStart(2, '0')}:${minute}`;
                } else if (/^\d{1,2}:\d{2}$/.test(nightTimeStr)) {
                    // 24-hour format
                    const parts = nightTimeStr.split(':');
                    const hour = parseInt(parts[0]);
                    const minute = parts[1];
                    if (hour > 23 || parseInt(minute) > 59) {
                        return await sock.sendMessage(from, {
                            text: '❌ Invalid time! Hour must be 0-23, minute must be 0-59'
                        }, { quoted: msg });
                    }
                    nightTime24 = `${hour.toString().padStart(2, '0')}:${minute}`;
                } else {
                    return await sock.sendMessage(from, {
                        text: '❌ Invalid time format! Use 24-hour (22:00) or 12-hour (10:00 PM)'
                    }, { quoted: msg });
                }
                
                config.nightTime = nightTime24;
                saveConfig(config);
                await sock.sendMessage(from, {
                    text: `✅ Night greeting time set to *${nightTime24}* (24-hour format)\n🌙 Original: ${nightTimeStr}`
                }, { quoted: msg });
                break;

            case 'status':
                await sock.sendMessage(from, {
                    text: `📊 *AUTO-GREET STATUS*

🔄 **Status:** ${config.enabled ? '✅ Active' : '❌ Inactive'}
🌅 **Morning Time:** ${config.morningTime}
🌙 **Night Time:** ${config.nightTime}
📅 **Last Morning Greet:** ${config.lastMorningGreet || 'Never'}
📅 **Last Night Greet:** ${config.lastNightGreet || 'Never'}`
                }, { quoted: msg });
                break;

            default:
                await sock.sendMessage(from, {
                    text: '❌ Invalid option! Use `' + settings.prefix + 'autogreet` to see available commands.'
                }, { quoted: msg });
        }
    }
};

// Function to check and send auto greetings
export async function checkAutoGreetings(sock) {
    try {
        const config = loadConfig();
        if (!config.enabled) return;

        const now = new Date();
        const options = {
            timeZone: 'Africa/Lagos',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        const currentTime = now.toLocaleTimeString('en-US', options);
        const currentDate = now.toLocaleDateString('en-US', { timeZone: 'Africa/Lagos' });

        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Check for morning greeting
        if (currentTime === config.morningTime && config.lastMorningGreet !== currentDate) {
            let morningMessage = '';
            
            try {
                const res = await axios.get('https://api.princetechn.com/api/fun/motivation?apikey=prince', { timeout: 10000 });
                if (res.data?.success && res.data?.result) {
                    morningMessage = `☀️ *Good Morning!* ☀️\n\n${res.data.result}\n\n🌅 _Have a blessed day!_`;
                }
            } catch (apiError) {
                const defaultMessages = [
                    '☀️ *Good Morning!* ☀️\n\nRise and shine! Today is a new day full of possibilities. Make it amazing! 🌅',
                    '🌄 *Good Morning!* 🌄\n\nEvery morning is a fresh start. Embrace it with a smile and positive energy! 😊',
                    '🌞 *Rise and Shine!* 🌞\n\nA new day means new opportunities. Go out there and make the most of it! 💪'
                ];
                morningMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
            }

            await sock.sendMessage(ownerNumber, { text: morningMessage });
            config.lastMorningGreet = currentDate;
            saveConfig(config);
            console.log('[AUTOGREET] Morning greeting sent');
        }

        // Check for night greeting
        if (currentTime === config.nightTime && config.lastNightGreet !== currentDate) {
            let nightMessage = '';
            
            try {
                const res = await axios.get('https://api.princetechn.com/api/fun/goodnight?apikey=prince', { timeout: 10000 });
                if (res.data?.success && res.data?.result) {
                    nightMessage = `🌙 *Good Night!* 🌙\n\n${res.data.result}\n\n✨ _Sweet dreams!_`;
                }
            } catch (apiError) {
                const defaultMessages = [
                    '🌙 *Good Night!* 🌙\n\nMay your dreams be filled with peace and happiness. Sleep tight! 💤',
                    '✨ *Sweet Dreams!* ✨\n\nAs the stars light up the night sky, may your dreams be just as bright. Good night! 🌟',
                    '🌃 *Good Night!* 🌃\n\nRest well and recharge for tomorrow. You deserve the best sleep! 😴'
                ];
                nightMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
            }

            await sock.sendMessage(ownerNumber, { text: nightMessage });
            config.lastNightGreet = currentDate;
            saveConfig(config);
            console.log('[AUTOGREET] Night greeting sent');
        }

    } catch (err) {
        console.error('[AUTOGREET] Check error:', err);
    }
}
