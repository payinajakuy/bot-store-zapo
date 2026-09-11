import { setting } from '../../setting.ts';
import webpmux from 'node-webpmux';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

ffmpeg.setFfmpegPath(ffmpegStatic as string);

async function addExif(webpBuffer: Buffer, packname: string, author: string): Promise<Buffer> {
    const img = new webpmux.Image();
    await img.load(webpBuffer);

    const json = {
        "sticker-pack-id": "bratv2-zapo",
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

async function convertMp4ToWebp(mp4Buffer: Buffer): Promise<Buffer> {
    const tmpIn = path.join(os.tmpdir(), `in_${Date.now()}.mp4`);
    const tmpOut = path.join(os.tmpdir(), `out_${Date.now()}.webp`);
    
    fs.writeFileSync(tmpIn, mp4Buffer);

    return new Promise((resolve, reject) => {
        ffmpeg(tmpIn)
            .outputOptions([
                '-vcodec', 'libwebp',
                '-vf', `scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,format=rgba`,
                '-loop', '0',
                '-preset', 'default',
                '-an',
                '-vsync', '0'
            ])
            .toFormat('webp')
            .save(tmpOut)
            .on('end', () => {
                const outBuf = fs.readFileSync(tmpOut);
                fs.unlinkSync(tmpIn);
                fs.unlinkSync(tmpOut);
                resolve(outBuf);
            })
            .on('error', (err: any) => {
                if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
                if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
                reject(err);
            });
    });
}

export default {
  name: 'bratv2',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    const lower = text.trim().toLowerCase();
    if (!lower.startsWith('bratv2 ') && lower !== 'bratv2') return;

    const query = text.slice(6).trim();
    if (!query) {
      await client.message.send(replyTarget, 'Masukkan teksnya. Contoh: bratv2 Hello World', { quote: event });
      return;
    }

    try {
      const response = await fetch(`${setting.YAPARI_BASE_URL}api/maker/bratv2?text=${encodeURIComponent(query)}`, {
        headers: {
          'X-API-Key': setting.YAPARI_API_KEY
        }
      });

      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

      const arrayBuffer = await response.arrayBuffer();
      const mp4Buffer = Buffer.from(arrayBuffer);

      let webpBuffer = await convertMp4ToWebp(mp4Buffer);
      webpBuffer = await addExif(webpBuffer, "Bratv2 Sticker", "Zapo Bot");

      await client.message.send(replyTarget, {
        type: 'sticker',
        media: webpBuffer,
        mimetype: 'image/webp'
      }, { quote: event });

    } catch (error: any) {
      console.error('[bratv2] Error:', error);
      await client.message.send(replyTarget, `Gagal membuat bratv2. Error: ${error.message || 'Unknown'}`, { quote: event });
    }
  }
}
