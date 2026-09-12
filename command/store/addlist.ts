import { addListItem } from '../../utils.ts';
import { downloadMediaMessage } from 'zapo-js';
import FormData from 'form-data';
import axios from 'axios';
import { setting } from '../../setting.ts';

export default {
  name: 'addlist',
  execute: async (ctx: any) => {
    const { client, event, text, replyTarget, isAdmin } = ctx;

    if (!text.toLowerCase().startsWith('addlist')) return;

    if (isAdmin === 'Bukan grup') return;
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.');
      return;
    }

    // Hapus kata 'addlist ' di awal secara case-insensitive tanpa merusak baris baru (enter)
    const content = text.replace(/^addlist\s+/i, '').trim();
    if (!content.includes('@')) {
      await client.message.send(replyTarget, 'Format salah! Gunakan: addlist Judul@Isinya');
      return;
    }

    const [key, ...responseParts] = content.split('@');
    const responseText = responseParts.join('@'); 
    const keyLower = key.trim().toLowerCase();

    // Check for image inside the message itself or in a quoted message
    let isImage = false;
    let targetMessage = event.message;

    if (event.message?.imageMessage) {
        isImage = true;
    } else if (event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        isImage = true;
        targetMessage = event.message.extendedTextMessage.contextInfo.quotedMessage;
    }

    let imageUrl = '-';

    if (isImage) {
      if (!setting.IMGBB_API_KEY || setting.IMGBB_API_KEY === 'TARO_API_KEY_IMGBB_DISINI') {
        await client.message.send(replyTarget, 'Gagal: Imgbb API Key belum diatur di setting.ts.');
        return;
      }
      
      try {
        await client.message.send(replyTarget, 'Sedang mengunggah gambar, mohon tunggu...');
        
        // Zapo's downloadMediaMessage expects either WaIncomingMessageEvent or Proto.IMessage.
        // targetMessage is already a Proto.IMessage, so we can pass it directly.
        const stream = await downloadMediaMessage(targetMessage as any);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const formData = new FormData();
        formData.append('image', buffer.toString('base64'));
        formData.append('key', setting.IMGBB_API_KEY);

        const uploadRes = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: formData.getHeaders()
        });

        if (uploadRes.data && uploadRes.data.data && uploadRes.data.data.url) {
            imageUrl = uploadRes.data.data.url;
        } else {
            throw new Error('Gagal mendapatkan URL gambar');
        }
      } catch (err) {
        console.error('Upload Error:', err);
        await client.message.send(replyTarget, 'Gagal mengunggah gambar ke Imgbb.');
        return;
      }
    }

    addListItem(replyTarget, keyLower, responseText, isImage, imageUrl);
    await client.message.send(replyTarget, `Berhasil menambahkan list dengan key: *${keyLower}*`);
  }
}
