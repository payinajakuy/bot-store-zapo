import { getListItem } from '../../utils.ts';
import axios from 'axios';

// Daftar perintah yang harus diabaikan oleh autoresponder
const RESERVED_COMMANDS = [
  'addlist', 'dellist', 'updatelist',
  'setlist', 'setsimbol', 'delsetlist',
  'list', 'open', 'close', 'setopen', 'setclose',
  'proses', 'done', 'gagal', 'setproses', 'setdone', 'setgagal',
  'welcome', 'left', 'setwelcome', 'setleft',
];

export default {
  name: 'autoresponder',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin } = ctx;

    // Hanya jalankan di grup
    if (isAdmin === 'Bukan grup') return;

    const textLower = text.trim().toLowerCase();

    // Jangan intercept perintah-perintah yang sudah ada
    if (RESERVED_COMMANDS.some(cmd => textLower === cmd || textLower.startsWith(cmd + ' '))) return;
    // Juga block shorthand p, d, g
    if (textLower === 'p' || textLower === 'd' || textLower === 'g') return;
    if (textLower.startsWith('p ') || textLower.startsWith('d ') || textLower.startsWith('g ')) return;
    
    // Cari apakah teks tersebut adalah key di database list untuk grup ini
    const item = getListItem(replyTarget, textLower);
    
    if (item) {
      try {
        const responseText = item.response;
        
        if (item.isImage && item.image_url !== '-') {
          // Gunakan proxy images.weserv.nl untuk bypass pemblokiran ISP pada i.ibb.co
          const proxiedUrl = `https://wsrv.nl/?url=${encodeURIComponent(item.image_url)}`;
          
          const imageRes = await axios.get(proxiedUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(imageRes.data);
          
          await client.message.send(replyTarget, {
            type: 'image',
            media: imageBuffer,
            mimetype: 'image/jpeg',
            caption: responseText
          });
        } else {
          await client.message.send(replyTarget, responseText);
        }
      } catch (err) {
        console.error('[autoresponder] Error:', err);
      }
    }
  }
}
