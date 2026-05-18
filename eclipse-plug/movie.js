import axios from "axios";
import {
proto,
generateWAMessageFromContent,
prepareWAMessageMedia
} from "@whiskeysockets/baileys";

const MOVIE_API = "https://mv-api.silent7.app/api";
const MOVIE_API_KEY = "silenttech";

global.movieSubCache = global.movieSubCache || {};

export default {
name: "movie",
aliases: ["sm","silent"],
category: "download",
description: "Search movies/series",

async execute(m,{sock,args,settings}){

const from = m.key.remoteJid;
const PREFIX = settings?.prefix || ".";
const query = args.join(" ");

const reply = (text)=>sock.sendMessage(from,{text},{quoted:m});

if(!query)
return reply(`🎬 Usage:\n${PREFIX}movie <movie name>`);

await sock.sendMessage(from,{react:{text:"🔎",key:m.key}});

try{

const {data} = await axios.get(
`${MOVIE_API}/search`,
{params:{api:MOVIE_API_KEY,q:query},timeout:20000}
);

const items = data?.payload?.items;
if(!items?.length)
return reply("❌ No movies found.");

const results = items.filter(i=>i.hasResource).slice(0,5);
if(!results.length)
return reply("❌ No downloadable movies found for that query.");

const cards = [];

for(const movie of results){

const title = (movie.title || "Unknown").slice(0,50);
const isSeries = movie.subjectType === 2;

global.movieSubCache[movie.subjectId] = movie.subtitles || "None";

const subText = movie.subtitles
? movie.subtitles.split(",").slice(0,3).join(", ")+"..."
: "None";

const resource = movie.resourceDetectors?.[0];
const episodes = resource?.totalEpisode || 1;

const desc =
`⭐ IMDb: ${movie.imdbRatingValue || "N/A"}
🎭 Genre: ${movie.genre || "N/A"}
📅 Year: ${movie.releaseDate?.split("-")[0] || "Unknown"}
📌 Type: ${isSeries ? `Series 📺 (${episodes} eps)`:"Movie 🎬"}
🌍 Country: ${movie.countryName || "N/A"}
💬 Subs: ${subText}`;

const cover = movie.cover?.url || "https://i.ibb.co/99KrSHn2/c4cd381ffed6.jpg";

const media = await prepareWAMessageMedia(
{image:{url:cover}},
{upload:sock.waUploadToServer}
);

const buttons = [];

if(isSeries){
buttons.push({
name:"quick_reply",
buttonParamsJson:JSON.stringify({
display_text:"📺 Episodes",
id:`${PREFIX}dlmovie ${movie.subjectId} series`
})
});
} else {
buttons.push({
name:"quick_reply",
buttonParamsJson:JSON.stringify({
display_text:"🎬 Download",
id:`${PREFIX}dlmovie ${movie.subjectId} movie`
})
});
}

buttons.push({
name:"quick_reply",
buttonParamsJson:JSON.stringify({
display_text:"ℹ️ Details",
id:`${PREFIX}dlmovie ${movie.subjectId} info`
})
});

cards.push({
body: proto.Message.InteractiveMessage.Body.create({text:desc}),
header: proto.Message.InteractiveMessage.Header.create({
title:`🎬 ${title}`,
hasMediaAttachment:true,
imageMessage:media.imageMessage
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({buttons})
});
}

const interactiveMessage = proto.Message.InteractiveMessage.create({
body: proto.Message.InteractiveMessage.Body.create({
text:`🎥 Results for: *${query}*\nSwipe ➡️ to browse`
}),
carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
cards,
messageVersion:1
})
});

const outMsg = generateWAMessageFromContent(from,{
viewOnceMessage:{message:{
messageContextInfo:{deviceListMetadata:{},deviceListMetadataVersion:2},
interactiveMessage
}}
},{quoted:m});

await sock.relayMessage(from,outMsg.message,{messageId:outMsg.key.id});
await sock.sendMessage(from,{react:{text:"✅",key:m.key}});

}catch(e){
console.error("[MOVIE ERROR]",e?.message||e);
reply("❌ Movie search failed. Please try again.");
}
}
}
