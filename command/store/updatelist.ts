import { getListItem, addListItem } from '../../utils.ts';
import { downloadMediaMessage } from 'zapo-js';
import FormData from 'form-data';
import axios from 'axios';
import { setting } from '../../setting.ts';

export default {
  name: 'updatelist',
  execute: async (ctx: any) => {
    const { client, event, text, replyTarget, isAdmin } = ctx;

    if (!text.toLowerCase().startsWith('updatelist ')) return;

    if (isAdmin === 'Bukan grup') return;
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.');
      return;
    }

    const content = text.slice(11).trim(); 
    if (!content.includes('@')) {
      await client.message.send(replyTarget, 'Format salah! Gunakan: updatelist Judul@Isinya');
      return;
    }

    const [key, ...responseParts] = content.split('@');
    const responseText = responseParts.join('@'); 
    const keyLower = key.trim().toLowerCase();
    
    const existing = getListItem(replyTarget, keyLower);
    if (!existing) {
      await client.message.send(replyTarget, `List dengan key *${keyLower}* tidak ditemukan. Gunakan addlist untuk membuat baru.`);
      return;
    }

    let isImage = false;
    let targetMessage = event.message;

    if (event.message?.imageMessage) {
      isImage = true;
    } else if (event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
      isImage = true;
      targetMessage = event.message.extendedTextMessage.contextInfo.quotedMessage;
    }

    let imageUrl = existing.image_url;

    if (isImage) {
      if (!setting.IMGBB_API_KEY || setting.IMGBB_API_KEY === 'TARO_API_KEY_IMGBB_DISINI') {
        await client.message.send(replyTarget, 'Gagal: Imgbb API Key belum diatur di setting.ts.');
        return;
      }
      
      try {
        await client.message.send(replyTarget, 'Sedang mengunggah gambar baru, mohon tunggu...');
        
        const mediaEvent = { message: targetMessage };
        
        const stream = await downloadMediaMessage(mediaEvent as any);
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
    } else {
      if (responseText.includes('-noimage')) {
        isImage = false;
        imageUrl = '-';
      } else {
        isImage = existing.isImage;
      }
    }

    const finalResponse = responseText.replace('-noimage', '').trim();
    addListItem(replyTarget, keyLower, finalResponse, isImage, imageUrl);
    await client.message.send(replyTarget, `Berhasil mengubah list dengan key: *${keyLower}*`);
  }
}
