import axios from 'axios';
import yts from 'yt-search';

const getVideoId = (url) => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/[^\/\n\s]+\/|(?:v|e(?:mbed)?)\/|[^v\r\s]+\/|user\/[^\/\n\s]+|embed\/|videoseries\?list=)|(?:youtu\.)?be(?:\.com)?\/(?:watch\?v=|v\/|u\/\w\/|embed\/|watch\?v%3D|watch\?v-|watch\/|v=)?)((\w|-){11}).*/;
  const match = url.match(regex);
  if (match) {
    return match[1];
  }
  return null;
};

const Ytdl = {
  search: async (query) => {
    try {
      const { videos } = await yts(query);
      return {
        status: true,
        creator: "@Kenisawa_Devolper",
        data: videos.map(video => ({
          title: video.title,
          url: `https://youtu.be/${video.videoId}`,
          img: video.image,
          author: {
            name: video.author.name,
            url: video.author.url,
          },
        })),
      };
    } catch (error) {
      return {
        status: false,
        msg: "لا يمكن الحصول على البيانات!",
        err: error.message,
      };
    }
  },

  mp3: async (query, { mp3 = '128' } = {}) => {
    try {
      const searchResult = await Ytdl.search(query);
      if (!searchResult.status || searchResult.data.length === 0) {
        throw new Error("لم يتم العثور على الأغنية المطلوبة.");
      }
      const videoData = searchResult.data[0]; // نحصل على أول نتيجة من البحث
      const videoId = getVideoId(videoData.url);
      const data = new URLSearchParams({ videoid: videoId, downtype: 'mp3', vquality: mp3 });

      const response = await axios.post('https://api-cdn.saveservall.xyz/ajax-v2.php', data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      });

      const mp3Link = response.data.url;
      return {
        status: true,
        creator: "@Kenisawa_devolper",
        msg: "تم تنزيل المحتوى بنجاح!",
        title: videoData.title,
        thumbnail: videoData.img,
        url: videoData.url,
        media: mp3Link,
      };

    } catch (error) {
      return {
        status: false,
        msg: "لا يمكن الحصول على البيانات!",
        err: error.message,
      };
    }
  },
};

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw m.reply(`مثال للاستخدام: ${usedPrefix + command} <اسم الأغنية>`);

  let result;
  if (command === 'اغنية') {
    result = await Ytdl.mp3(text);
  } else {
    result = await Ytdl.search(text);
  }

  if (!result.status) throw result.msg;

  if (command === 'اغنية') {
    const doc = {
      audio: { url: result.media },
      mimetype: 'audio/mp4',
      fileName: `${result.title}.mp3`,
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          mediaType: 2,
          mediaUrl: result.url,
          title: result.title,
          sourceUrl: result.url,
          thumbnail: await (await conn.getFile(result.thumbnail)).data
        }
      }
    };
    conn.sendPresenceUpdate('recording', m.chat);

    await conn.sendMessage(m.chat, doc, { quoted: m });
  } else {
    let searchResults = result.data.map((v, i) => `${i + 1}. *${v.title}*\n   Link: ${v.url}`).join('\n\n');
    await conn.sendMessage(m.chat, { text: searchResults }, { quoted: m });
  }
};

handler.help = ['اغنية', 'ytsearch'];
handler.tags = ['downloader'];
handler.command = /^اغنية$/i;

export default handler;
