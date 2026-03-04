import axios from "axios";
import {
proto,
generateWAMessageFromContent,
prepareWAMessageMedia
} from "@whiskeysockets/baileys";

global.movieSubCache = global.movieSubCache || {};

export default {
name: "movie",
aliases: ["sm","silent"],
category: "download",
description: "Search movies",

async execute(m,{sock,args,settings}){

const from = m.key.remoteJid
const PREFIX = settings?.prefix || "."
const query = args.join(" ")

const reply = (text)=>sock.sendMessage(from,{text},{quoted:m})

if(!query)
return reply(`🎬 Usage:\n${PREFIX}movie <movie name>`)

await sock.sendMessage(from,{react:{text:"🔎",key:m.key}})

try{

const {data} = await axios.get(
"https://darkvibe314-silent-movies-api.hf.space/api/search",
{params:{query}}
)

if(!data?.results?.length)
return reply("❌ No movies found.")

const results = data.results.slice(0,5)
const cards = []

for(const movie of results){

const title = (movie.title || "Unknown").slice(0,50)
const isSeries = movie.subjectType === 2

global.movieSubCache[movie.subjectId] =
movie.subtitles || "None"

const subText = movie.subtitles
? movie.subtitles.split(",").slice(0,3).join(", ")+"..."
: "None"

const desc =
`⭐ IMDb: ${movie.imdbRatingValue || "N/A"}
🎭 Genre: ${movie.genre || "N/A"}
📅 Year: ${movie.releaseDate?.split("-")[0] || "Unknown"}
📌 Type: ${isSeries ? "Series 📺":"Movie 🎬"}
💬 Subs: ${subText}`

const cover =
movie.cover?.url ||
"https://i.ibb.co/99KrSHn2/c4cd381ffed6.jpg"

const media = await prepareWAMessageMedia(
{image:{url:cover}},
{upload:sock.waUploadToServer}
)

let buttons = []

if(isSeries){

buttons.push({
name:"quick_reply",
buttonParamsJson:JSON.stringify({
display_text:"📺 Download",
id:`${PREFIX}dlmovie ${movie.subjectId} 1 1`
})
})

buttons.push({
name:"quick_reply",
buttonParamsJson:JSON.stringify({
display_text:"📝 Subtitles",
id:`${PREFIX}smsubs ${movie.subjectId} 1 1`
})
})

}else{

buttons.push({
name:"quick_reply",
buttonParamsJson:JSON.stringify({
display_text:"🎬 Download",
id:`${PREFIX}dlmovie ${movie.subjectId} null null`
})
})

buttons.push({
name:"quick_reply",
buttonParamsJson:JSON.stringify({
display_text:"📝 Subtitles",
id:`${PREFIX}smsubs ${movie.subjectId} null null`
})
})

}

cards.push({
body: proto.Message.InteractiveMessage.Body.create({
text: desc
}),
header: proto.Message.InteractiveMessage.Header.create({
title:`🎬 ${title}`,
hasMediaAttachment:true,
imageMessage:media.imageMessage
}),
nativeFlowMessage:
proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons
})
})

}

const interactiveMessage =
proto.Message.InteractiveMessage.create({

body: proto.Message.InteractiveMessage.Body.create({
text:`🎥 Results for: ${query}\nSwipe ➡️`
}),

carouselMessage:
proto.Message.InteractiveMessage.CarouselMessage.create({
cards,
messageVersion:1
})

})

const outMsg = generateWAMessageFromContent(
from,
{
viewOnceMessage:{
message:{
messageContextInfo:{
deviceListMetadata:{},
deviceListMetadataVersion:2
},
interactiveMessage
}
}
},
{quoted:m}
)

await sock.relayMessage(from,outMsg.message,{
messageId: outMsg.key.id
})

await sock.sendMessage(from,{
react:{text:"✅",key:m.key}
})

}catch(e){

console.log("[MOVIE ERROR]",e)

reply("❌ Movie search failed.")

}

}
}