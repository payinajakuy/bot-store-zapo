import { setting } from '../../setting.ts';
import webpmux from 'node-webpmux';
import { loadImage, createCanvas } from '@napi-rs/canvas';

async function addExif(webpBuffer: Buffer, packname: string, author: string): Promise<Buffer> {
    const img = new webpmux.Image();
    await img.load(webpBuffer);

    const json = {
        "sticker-pack-id": "brat-zapo",
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        "emojis": ["🤍"]
    };

    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuf = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuf]);
    exif.writeUInt32LE(jsonBuf.length, 14);

    img.exif = exif;
    return await img.save(null);
}

export default {
  name: 'brat',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    const lower = text.trim().toLowerCase();
    if (!lower.startsWith('brat ') && lower !== 'brat') return;

    let query = text.slice(4).trim();
    if (!query) {
      await client.message.send(replyTarget, 'Masukkan teksnya. Contoh: brat Hello World', { quote: event });
      return;
    }

    let color = '#ffffff';
    const firstWord = query.split(' ')[0];
    if (firstWord.startsWith('#') && (firstWord.length === 4 || firstWord.length === 7)) {
        color = firstWord;
        query = query.slice(firstWord.length).trim();
    }

    if (!query) return;

    try {
      const response = await fetch(`${setting.YAPARI_BASE_URL}api/maker/brat?text=${encodeURIComponent(query)}&color=${encodeURIComponent(color)}`, {
        headers: {
          'X-API-Key': setting.YAPARI_API_KEY
        }
      });

      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

      const arrayBuffer = await response.arrayBuffer();
      const pngBuffer = Buffer.from(arrayBuffer);

      const img = await loadImage(pngBuffer);
      const canvas = createCanvas(512, 512);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 512, 512);
      const webpBuffer = await canvas.encode('webp');

      const bufferWithExif = await addExif(webpBuffer, "Brat Sticker", "Zapo Bot");

      await client.message.send(replyTarget, {
        type: 'sticker',
        media: bufferWithExif,
        mimetype: 'image/webp'
      }, { quote: event });
    } catch (error: any) {
      console.error('[brat] Error:', error);
      await client.message.send(replyTarget, `Gagal membuat sticker brat. Error: ${error.message || 'Unknown'}`, { quote: event });
    }
  }
}