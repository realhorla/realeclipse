import fs from "fs";
import os from "os";
import config from "../config.js";
import { channelInfo } from "../lib/channelConfig.js";
import { mediaUrls } from "../lib/mediaUrls.js";
import { menuButtonsConfig } from "../lib/menuButtons.js";
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

export default {
  name: 'menu',
  description: 'Display bot menu with all commands',
  aliases: ['help', 'commands'],
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prefix = config.prefix;
    const botName = config.botName;
    const ownerName = config.ownerName;

    const platform = os.platform();
    const platformName = {
      'linux': 'Linux',
      'darwin': 'macOS',
      'win32': 'Windows',
      'android': 'Android'
    }[platform] || platform.charAt(0).toUpperCase() + platform.slice(1);

    const now = new Date();
    const timeOptions = { timeZone: 'Africa/Lagos', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' };
    const dateOptions = { timeZone: 'Africa/Lagos', day: 'numeric', month: 'numeric', year: 'numeric' };

    const currentTime = now.toLocaleTimeString('en-US', timeOptions);
    const currentDate = now.toLocaleDateString('en-US', dateOptions);

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

    const memUsage = process.memoryUsage();
    const usedMemory = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const totalMemory = Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100;
    const memoryPercent = Math.round((usedMemory / totalMemory) * 100);

    const bodyText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || "").trim();
    
    // Add quoted message support for "next"
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedText = (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "").trim();

    if (bodyText.toLowerCase() === "next" || (quotedText.includes("Reply with \"next\"") && bodyText.toLowerCase() === "next")) {
        const nextMenu = `╔════ *SUPPORT & LINKS* ════╗
        
📱 *GitHub:* https://github.com/horlapookie/Eclipse-MD
🆘 *Support:* https://www.eclipse-support.zone.id  
🛫 *Deploy:* https://eclipse-md-horlapookie.zone.id
👿 *Bug Report:* https://github.com/horlapookie/Eclipse-MD/issues
📣 *Telegram Channel:* https://t.me/yourhighnesstech1 
📞 *Direct Telegram:* https://t.me/horlapookie

╚════════════════════════════╝`;
        return sock.sendMessage(from, { text: nextMenu, ...channelInfo }, { quoted: msg });
    }

    const menuText = `╔╭━━〔 *𝔼𝕔𝕝ɪᴘꜱᴇ 𝕄𝔻* 〕━━╮

│ ✦ Mᴏᴅᴇ : ${global.botMode || 'public'}
│ ✦ Pʟᴜɢɪɴs : 655
│ ✦ Vᴇʀsɪᴏɴ : 1.2.6
│ ✦ Year : 2025 - 2026
│ ✦ Under Maintainance : true
│ ✦ Uᴘᴛɪᴍᴇ : ${uptimeString}
│ ✦ Tɪᴍᴇ Nᴏᴡ : ${currentTime}
│ ✦ Dᴀᴛᴇ Tᴏᴅᴀʏ : ${currentDate}
│ ✦ Pʟᴀᴛғᴏʀᴍ : ${platformName}
│ ✦ Tɪᴍᴇ Zᴏɴᴇ : Africa/Lagos
│ ✦ Sᴇʀᴠᴇʀ Rᴀᴍ : ${memoryPercent}% Used
╰─────────────────╯

*Reply with "next" to see all support links.*

╭━━━✦❮ 🛡️ ANTIGROUP COMMANDS ❯✦━⊷
┃✪  ${prefix}antilink
┃✪  ${prefix}antitag
┃✪  ${prefix}antimention
┃✪  ${prefix}antichannellink
┃✪  ${prefix}antitelegramlink
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 👥 GROUP MANAGEMENT ❯✦━⊷
┃✪  ${prefix}announce
┃✪  ${prefix}info
┃✪  ${prefix}grouplink
┃✪  ${prefix}getallmembers
┃✪  ${prefix}broadcast
┃✪  ${prefix}chatbot
┃✪  ${prefix}delete
┃✪  ${prefix}demote
┃✪  ${prefix}gdesc
┃✪  ${prefix}gname
┃✪  ${prefix}groupinfo
┃✪  ${prefix}kick
┃✪  ${prefix}lock
┃✪  ${prefix}promote
┃✪  ${prefix}remove
┃✪  ${prefix}groupstatus
┃✪  ${prefix}tagall
┃✪  ${prefix}unlock
┃✪  ${prefix}open
┃✪  ${prefix}warn
┃✪  ${prefix}welcome
┃✪  ${prefix}goodbye
┃✪  ${prefix}antilink
┃✪  ${prefix}antitag
┃✪  ${prefix}groupmanage
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🛠️ BASIC TOOLS ❯✦━⊷
┃✪  ${prefix}echo
┃✪  ${prefix}log
┃✪  ${prefix}ping
┃✪  ${prefix}profile
┃✪  ${prefix}setusername
┃✪  ${prefix}time
┃✪  ${prefix}uptime
┃✪  ${prefix}userinfo
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🛠️ IMAGE TOOLS (UNDER MAINTENANCE) ❯✦━⊷
┃✪  ${prefix}txt2cartoon   
┃✪  ${prefix}txt2pixelart  
┃✪  ${prefix}txt2sketch    
┃✪  ${prefix}txt2abstractimg 
┃✪  ${prefix}txt2minimalistimg 
┃✪  ${prefix}txt2vintage 
┃✪  ${prefix}txt2steampunk 
┃✪  ${prefix}txt2horror    
┃✪  ${prefix}txt2scifi     
╰━━━━━━━━━━━━━━━━━⊷


╭━━━✦❮ 📢 CHANNEL TOOLS ❯✦━⊷
┃✪  ${prefix}newsletter
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ FOREX TOOLS ❯✦━⊷
┃✪  ${prefix}currencylist
┃✪  ${prefix}forex
┃✪  ${prefix}fxexchange
┃✪  ${prefix}fxpairs
┃✪  ${prefix}fxstatus
┃✪  ${prefix}stocktickers
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🤖 AI CHAT COMMANDS ❯✦━⊷
┃✪  ${prefix}aimodels (list all)
┃✪  ${prefix}ai4chat
┃✪  ${prefix}gpt41
┃✪  ${prefix}gpt41nano
┃✪  ${prefix}gpt41mini
┃✪  ${prefix}gpt4o
┃✪  ${prefix}gpt4omini
┃✪  ${prefix}gpt-4
┃✪  ${prefix}gpt4turbo
┃✪  ${prefix}gpt35turbo
┃✪  ${prefix}gpt5
┃✪  ${prefix}gpt5nano
┃✪  ${prefix}chatgpt
┃✪  ${prefix}chatgpt4o
┃✪  ${prefix}chataibot
┃✪  ${prefix}copilot2
┃✪  ${prefix}copilotthink
┃✪  ${prefix}gemini
┃✪  ${prefix}claude
┃✪  ${prefix}grok2
┃✪  ${prefix}deepseek
┃✪  ${prefix}metaai
┃✪  ${prefix}qwen
┃✪  ${prefix}dream
┃✪  ${prefix}story
┃✪  ${prefix}translate
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🧠 AI REASONING MODELS ❯✦━⊷
┃✪  ${prefix}o1
┃✪  ${prefix}o1mini
┃✪  ${prefix}o3
┃✪  ${prefix}o3mini
┃✪  ${prefix}o4mini
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎨 AI IMAGE GENERATOR ❯✦━⊷
┃✪  ${prefix}ai4chatimg
┃✪  ${prefix}dalle
┃✪  ${prefix}txt2img
┃✪  ${prefix}aidocimg
┃✪  ${prefix}flux[self]
┃✪  ${prefix}pollination
┃✪  ${prefix}grok
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎌 ANIME REACTIONS ❯✦━⊷
┃✪  ${prefix}hug
┃✪  ${prefix}slap
┃✪  ${prefix}pat
┃✪  ${prefix}kiss
┃✪  ${prefix}punch
┃✪  ${prefix}cry
┃✪  ${prefix}animekill
┃✪  ${prefix}bite
┃✪  ${prefix}yeet
┃✪  ${prefix}bully
┃✪  ${prefix}bonk
┃✪  ${prefix}wink
┃✪  ${prefix}poke
┃✪  ${prefix}cuddle
┃✪  ${prefix}wave
┃✪  ${prefix}dance
┃✪  ${prefix}blush
┃✪  ${prefix}smile
┃✪  ${prefix}smug
┃✪  ${prefix}highfive
┃✪  ${prefix}lick
┃✪  ${prefix}neko
┃✪  ${prefix}nom
┃✪  ${prefix}glomp
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🐙 GITHUB TOOLS ❯✦━⊷
┃✪  ${prefix}github
┃✪  ${prefix}gitcommits
┃✪  ${prefix}gitforks
┃✪  ${prefix}gitissues
┃✪  ${prefix}gitpulls
┃✪  ${prefix}gitreleases
┃✪  ${prefix}gitsearch
┃✪  ${prefix}gitstats
┃✪  ${prefix}gittrending
┃✪  ${prefix}gitrepo
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🖼️ IMAGE ANALYZING ❯✦━⊷
┃✪  ${prefix}vision
┃✪  ${prefix}remini
┃✪  ${prefix}colorize
┃✪  ${prefix}dehaze
┃✪  ${prefix}bing (self)
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎬 AI VIDEO GENERATOR ❯✦━⊷
┃✪  ${prefix}txt2vid (self)
┃✪  ${prefix}sora2 (self)
┃✪  ${prefix}bing
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎵 AI MUSIC GENERATOR ❯✦━⊷
┃✪  ${prefix}sonu
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎙️ VOICE & AUDIO ❯✦━⊷
┃✪  ${prefix}stt
┃✪  ${prefix}tts
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎮 GAMES & FUN ❯✦━⊷
┃✪  ${prefix}answer
┃✪  ${prefix}brutal
┃✪  ${prefix}character
┃✪  ${prefix}hangman
┃✪  ${prefix}joke
┃✪  ${prefix}myscore
┃✪  ${prefix}quiz
┃✪  ${prefix}riddle
┃✪  ${prefix}roll
┃✪  ${prefix}ship
┃✪  ${prefix}trivia
┃✪  ${prefix}shayari
┃✪  ${prefix}roseday
┃✪  ${prefix}hack (self)
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🐺 WEREWOLF GAME ❯✦━⊷
┃✪  ${prefix}wolf create
┃✪  ${prefix}wolf join
┃✪  ${prefix}wolf start
┃✪  ${prefix}wolf players
┃✪  ${prefix}wolf vote [number]
┃✪  ${prefix}wolf exit
┃✪  ${prefix}wolf role
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🔗 WORD CHAIN GAMES ❯✦━⊷
┃✪  ${prefix}wcg
┃✪  ${prefix}wcg join
┃✪  ${prefix}wcg start
┃✪  ${prefix}wcg end
┃✪  ${prefix}wcg <word>
┃✪  ${prefix}wrg
┃✪  ${prefix}wrg start
┃✪  ${prefix}wrg end
┃✪  ${prefix}wrg <word>
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎨 CREATIVITY & ART ❯✦━⊷
┃✪  ${prefix}quote
┃✪  ${prefix}wallpaper
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 👤 PERSONAL STUFF ❯✦━⊷
┃✪  ${prefix}getpp
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ ✨ IMAGE EFFECTS ❯✦━⊷
┃✪  ${prefix}resize
┃✪  ${prefix}rotate
┃✪  ${prefix}brightness
┃✪  ${prefix}contrast
┃✪  ${prefix}flip
┃✪  ${prefix}greyscale
┃✪  ${prefix}bw
┃✪  ${prefix}invert
┃✪  ${prefix}negative
┃✪  ${prefix}sepia
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🏷️ STICKER CREATOR ❯✦━⊷
┃✪  ${prefix}attp
┃✪  ${prefix}emojimix
┃✪  ${prefix}photo2
┃✪  ${prefix}scrop2
┃✪  ${prefix}gif
┃✪  ${prefix}simage
┃✪  ${prefix}sticker
┃✪  ${prefix}sticker2
┃✪  ${prefix}take2
┃✪  ${prefix}url2
┃✪  ${prefix}write2
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎵 MUSIC & MEDIA ❯✦━⊷
┃✪  ${prefix}play
┃✪  ${prefix}play2
┃✪  ${prefix}song
┃✪  ${prefix}lyric
┃✪  ${prefix}audio
┃✪  ${prefix}video
┃✪  ${prefix}pexel
┃✪  ${prefix}avatar
┃✪  ${prefix}yt video
┃✪  ${prefix}yt audio
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🆕 NEWLY ADDED <under fixing ❯✦━⊷
┃✪  ${prefix}shazam
┃✪  ${prefix}song2
┃✪  ${prefix}fancy
┃✪  ${prefix}privacy
┃✪  ${prefix}privacysettings
┃✪  ${prefix}pin
┃✪  ${prefix}unpin
┃✪  ${prefix}star
┃✪  ${prefix}unstar
┃✪  ${prefix}onwa
┃✪  ${prefix}checkid
┃✪  ${prefix}checkno
┃✪  ${prefix}wacheck
┃✪  ${prefix}archive
┃✪  ${prefix}archivechat
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 📥 DOWNLOADERS ❯✦━⊷
┃✪  ${prefix}tiktok
┃✪  ${prefix}facebook
┃✪  ${prefix}instagram
┃✪  ${prefix}twitter
┃✪  ${prefix}yt
┃✪  ${prefix}movie
┃✪  ${prefix}pastebin
┃✪  ${prefix}mediafire
┃✪  ${prefix}googledrive
┃✪  ${prefix}snackdl
┃✪  ${prefix}aiodl
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 📚 MANGA COMMANDS ❯✦━⊷
┃✪  ${prefix}mangahome
┃✪  ${prefix}mangasearch
┃✪  ${prefix}mangainfo
┃✪  ${prefix}mangaread
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 📥 XVIDEO DOWNLOADER ❯✦━⊷
┃✪  ${prefix}xvideo
┃✪  ${prefix}xx1
┃✪  ${prefix}xx2
┃✪  ${prefix}xxv1
┃✪  ${prefix}xxv2
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎌 HENTAI NSFW ❯✦━⊷
┃✪  ${prefix}hentai
┃✪  ${prefix}hentaivid
┃✪  ${prefix}hneko
┃✪  ${prefix}hwaifu
┃✪  ${prefix}ahegao
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🔞 NSFW (18+) ❯✦━⊷
┃✪  ${prefix}nsfw
┃✪  ${prefix}69
┃✪  ${prefix}anal
┃✪  ${prefix}ass
┃✪  ${prefix}bdsm
┃✪  ${prefix}black
┃✪  ${prefix}boobs
┃✪  ${prefix}bottomless
┃✪  ${prefix}collared
┃✪  ${prefix}cum
┃✪  ${prefix}cumslut
┃✪  ${prefix}dick
┃✪  ${prefix}domination
┃✪  ${prefix}dp
┃✪  ${prefix}easter
┃✪  ${prefix}extreme
┃✪  ${prefix}feet
┃✪  ${prefix}finger
┃✪  ${prefix}futa
┃✪  ${prefix}gay
┃✪  ${prefix}gif
┃✪  ${prefix}groupfuck
┃✪  ${prefix}kiss
┃✪  ${prefix}lick
┃✪  ${prefix}nekonsfw
┃✪  ${prefix}oral
┃✪  ${prefix}pegged
┃✪  ${prefix}pornhub
┃✪  ${prefix}puffies
┃✪  ${prefix}pussy
┃✪  ${prefix}real
┃✪  ${prefix}suck
┃✪  ${prefix}tattoo
┃✪  ${prefix}tiny
┃✪  ${prefix}toys
┃✪  ${prefix}trap
┃✪  ${prefix}waifunsfw
┃✪  ${prefix}xmas
┃✪  ${prefix}yaoi
┃✪  ${prefix}yuri
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ ☠️ BUG/CRASH COMMANDS ❯✦━⊷
┃✪  ${prefix}crash 
┃✪  ${prefix}xioscrash 
┃✪  ${prefix}pmbug 
┃✪  ${prefix}unlimitedbug 
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🔐 ENCRYPTION & SECURITY ❯✦━⊷
┃✪  ${prefix}base64
┃✪  ${prefix}decrypt
┃✪  ${prefix}hash
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🐙 GITHUB TOOLS ❯✦━⊷
┃✪  ${prefix}gitcommits
┃✪  ${prefix}gitforks
┃✪  ${prefix}github
┃✪  ${prefix}gitissues
┃✪  ${prefix}gitpulls
┃✪  ${prefix}gitreleases
┃✪  ${prefix}gitrepo
┃✪  ${prefix}repo
┃✪  ${prefix}gitsearch
┃✪  ${prefix}gitstats
┃✪  ${prefix}gittrending
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🎨 LOGO CREATORS ❯✦━⊷
┃✪  ${prefix}fire
┃✪  ${prefix}neon
┃✪  ${prefix}hacker
┃✪  ${prefix}dragonball
┃✪  ${prefix}naruto
┃✪  ${prefix}didong
┃✪  ${prefix}wall
┃✪  ${prefix}summer
┃✪  ${prefix}neonlight
┃✪  ${prefix}greenneon
┃✪  ${prefix}glitch
┃✪  ${prefix}devil
┃✪  ${prefix}boom
┃✪  ${prefix}water
┃✪  ${prefix}snow
┃✪  ${prefix}transformer
┃✪  ${prefix}thunder
┃✪  ${prefix}phub
┃✪  ${prefix}harrypotter
┃✪  ${prefix}foggyglass
┃✪  ${prefix}whitegold
┃✪  ${prefix}lightglow
┃✪  ${prefix}thor
┃✪  ${prefix}pubg
┃✪  ${prefix}avatar
┃✪  ${prefix}aov
┃✪  ${prefix}castle
┃✪  ${prefix}dragon
┃✪  ${prefix}overwatch
┃✪  ${prefix}pentakill
┃✪  ${prefix}purple
┃✪  ${prefix}gold
┃✪  ${prefix}arena
┃✪  ${prefix}incandescent
┃✪  ${prefix}comic3d
┃✪  ${prefix}blackpink
┃✪  ${prefix}silver3d
┃✪  ${prefix}colorneon
┃✪  ${prefix}balloon3d
┃✪  ${prefix}paint3d
┃✪  ${prefix}wetglass
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🖋️ TATTOO EFFECTS ❯✦━⊷
┃✪  ${prefix}tattoo
┃✪  ${prefix}arrowtattoo
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🔍 SEARCH & INFO ❯✦━⊷
┃✪  ${prefix}dictionary
┃✪  ${prefix}images
┃✪  ${prefix}google
┃✪  ${prefix}movie-details
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 💡 UTILITY TOOLS ❯✦━⊷
┃✪  ${prefix}menu
┃✪  ${prefix}vv
┃✪  ${prefix}owner
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🔗 URL TOOLS ❯✦━⊷
┃✪  ${prefix}catbox
┃✪  ${prefix}expand
┃✪  ${prefix}qrcode
┃✪  ${prefix}trt2
┃✪  ${prefix}shorten
┃✪  ${prefix}urlcheck
┃✪  ${prefix}urlpreview
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🙏 RELIGIOUS & SPIRITUAL ❯✦━⊷
┃✪  ${prefix}quran
┃✪  ${prefix}bible
┃✪  ${prefix}holybook
┃✪  ${prefix}biblelist
┃✪  ${prefix}holybooks
┃✪  ${prefix}surah
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🔄 BOT MODES ❯✦━⊷
┃✪  ${prefix}mode
┃✪  ${prefix}self
┃✪  ${prefix}public
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ ℹ️ BOT INFO ❯✦━⊷
┃✪  ${prefix}xmd
┃✪  ${prefix}alive
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🔄AUTOMATION COMMANDS ❯✦━⊷
┃✪  ${prefix}autoreact 
┃✪  ${prefix}autorecording 
┃✪  ${prefix}autotyping 
┃✪  ${prefix}autoviewstatus 
┃✪  ${prefix}autogreet 
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🛡️ ANTI-COMMANDS ❯✦━⊷
┃✪  ${prefix}anticall 
┃✪  ${prefix}antivideocall
┃✪  ${prefix}antidelete 
┃✪  ${prefix}antilink
┃✪  ${prefix}antibug
┃✪  ${prefix}antispam
┃✪  ${prefix}cleartmp 
╰━━━━━━━━━━━━━━━━━⊷
┃✪  ${prefix}datafile 
┃✪  ${prefix}files 
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ ⚙️ SELF SETTINGS ❯✦━⊷
┃✪  ${prefix}settings 
┃✪  ${prefix}emojitoggle 
┃✪  ${prefix}goodmorning
┃✪  ${prefix}goodnight
┃✪  ${prefix}keepon
┃✪  ${prefix}keepoff
┃✪  ${prefix}reboot
┃✪  ${prefix}checkupdate
┃✪  ${prefix}update
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🤖 OWNER COMMANDS ❯✦━⊷
┃✪  ${prefix}block 
┃✪  ${prefix}blacklist
┃✪  ${prefix}fullpp 
┃✪  ${prefix}unblock 
┃✪  ${prefix}vv2 
┃✪  ${prefix}save
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 📸 SCREENSHOTS ❯✦━⊷
┃✪  ${prefix}jpg
┃✪  ${prefix}png
┃✪  ${prefix}screenscrop
┃✪  ${prefix}screenshot
┃✪  ${prefix}screenswidth
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🖼️IMAGE SEARCH & GENERATION ❯✦━⊷
┃✪  ${prefix}image
┃✪  ${prefix}messi
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ ⚽FOOTBALL LIVE ❯✦━⊷
┃✪  ${prefix}cl_matchday
┃✪  ${prefix}cl_news
┃✪  ${prefix}cl_table
┃✪  ${prefix}cl_top_scorer
┃✪  ${prefix}liga_portugal_highlights
┃✪  ${prefix}liga_portugal_matchday
┃✪  ${prefix}liga_portugal_news
┃✪  ${prefix}liga_portugal_table
┃✪  ${prefix}liga_portugal_top_assist
┃✪  ${prefix}liga_portugal_top_scorer
┃✪  ${prefix}wc_matchday
┃✪  ${prefix}wc_news
┃✪  ${prefix}wc_table
┃✪  ${prefix}wc_top_scorer
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 💻 CODE RUNNER & TOOLS ❯✦━⊷
┃✪  ${prefix}run
┃✪  ${prefix}carbon
┃✪  ${prefix}C
┃✪  ${prefix}run-carbon
┃✪  ${prefix}debinary
┃✪  ${prefix}decode
┃✪  ${prefix}decodebinary
┃✪  ${prefix}ebinary
┃✪  ${prefix}encode
┃✪  ${prefix}encodebinary
┃✪  ${prefix}obfuscate
┃✪  ${prefix}obfu
┃✪  ${prefix}run-c
┃✪  ${prefix}runcc
┃✪  ${prefix}runc
┃✪  ${prefix}run-c++
┃✪  ${prefix}c++
┃✪  ${prefix}runc++
┃✪  ${prefix}run-java
┃✪  ${prefix}java
┃✪  ${prefix}runjava
┃✪  ${prefix}run-js
┃✪  ${prefix}node
┃✪  ${prefix}javascript
┃✪  ${prefix}run-py
┃✪  ${prefix}python
┃✪  ${prefix}runpy
┃✪  ${prefix}scrap
┃✪  ${prefix}get
┃✪  ${prefix}find
┃✪  ${prefix}web
┃✪  ${prefix}inspectweb
┃✪  ${prefix}webinspect
┃✪  ${prefix}webscrap
╰━━━━━━━━━━━━━━━━━⊷

╭━━━✦❮ 🐚 SHELL COMMANDS ❯✦━⊷
┃✪  $<command>
┃✪  ${prefix}shell
┃ 
┃  _Examples:_
┃  • $ls -la
┃  • $pwd
┃  • $whoami
┃  • $date
╰━━━━━━━━━━━━━━━━━⊷

╔══════════════════════════════════╗
║   📞 NEED HELP? CONTACT SUPPORT  ║
║  🌐 www.eclipse-support.zone.id  ║
╚══════════════════════════════════╝

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝔼𝕔𝕝ɪᴘꜱᴇ 𝕄𝔻©

━━━━━━━━━━━━━━━━━━━━━━
📱 *GitHub:* https://github.com/horlapookie/Eclipse-MD
━━━━━━━━━━━━━━━━━━━━━━`;

    await sock.sendMessage(from, { 
        image: { url: mediaUrls.menuImage },
        caption: menuText,
        ...channelInfo
    }, { quoted: msg });
  }
};
