import { downloadMediaMessage } from 'zapo-js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

import os from 'os';

// Mengatur path untuk ffmpeg:
// - Di Windows (laptop), gunakan ffmpeg-static
// - Di Linux (Panel Pterodactyl), gunakan ffmpeg bawaan sistem agar tidak terjadi error ENOENT / musl libc
if (os.platform() === 'win32') {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
} else {
  ffmpeg.setFfmpegPath('ffmpeg'); // Menggunakan ffmpeg dari PATH sistem
}

export default {
  name: 'sticker',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    const msgText = (text || '').trim().toLowerCase();
    if (msgText !== 'sticker' && msgText !== 's') return;

    const message = event.message;
    if (!message) return;

    // Cek apakah pesan berisi gambar/video atau me-reply gambar/video
    const isImage = message.imageMessage || message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    const isVideo = message.videoMessage || message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (!isImage && !isVideo) {
      await client.message.send(replyTarget, 'Harap kirim foto/video dengan caption "s" atau reply foto/video dengan pesan "s".', { quote: event });
      return;
    }

    try {
      // Mengirim respon indikator loading
      await client.message.send(replyTarget, 'Sedang membuat stiker, mohon tunggu... ⏳', { quote: event });

      // Menentukan target media: pesan asli atau pesan yang di-reply
      const mediaMessage = (message.imageMessage || message.videoMessage) 
        ? message 
        : message.extendedTextMessage?.contextInfo?.quotedMessage;

      // Mendownload media menjadi stream
      const stream = await downloadMediaMessage(mediaMessage);
      
      // Mengubah stream menjadi buffer
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      let tempInput = '';
      let tempOutput = '';

      try {
        const ext = isVideo ? 'mp4' : 'jpg';
        const timestamp = Date.now();
        tempInput = path.join(process.cwd(), `temp_${timestamp}.${ext}`);
        tempOutput = path.join(process.cwd(), `temp_${timestamp}.webp`);
        
        fs.writeFileSync(tempInput, buffer);

      // Konversi media ke format webp menggunakan ffmpeg
      await new Promise((resolve, reject) => {
        let command = ffmpeg(tempInput)
          .on('error', (err: any) => reject(err))
          .on('end', () => resolve(true))
          .addOutputOptions([
            '-vcodec', 'libwebp',
            // Scale dan pad media ke ukuran persegi (512x512) dengan background transparan (rgba)
            '-vf', "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, format=rgba",
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-vsync', '0'
          ])
          .toFormat('webp');
          
        // Batasi durasi jika video/GIF agak panjang, misal max 10 detik
        if (isVideo) {
           command = command.setDuration(10);
        }
        
        command.save(tempOutput);
      });

      // Membaca file webp yang telah dikonversi
      const webpBuffer = fs.readFileSync(tempOutput);

      // Mengirimkan stiker
      await client.message.send(replyTarget, { type: 'sticker', media: webpBuffer }, { quote: event });

      } finally {
        // Membersihkan file sementara
        try {
          if (tempInput && fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
          if (tempOutput && fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        } catch (cleanupErr) {
          console.error('[sticker] Gagal menghapus file sementara:', cleanupErr);
        }
      }
      
    } catch (err: any) {
      console.error('[sticker] Error:', err);
      await client.message.send(replyTarget, `Gagal membuat stiker. Terjadi kesalahan sistem. Error: ${err.message}`, { quote: event });
    }
  }
};
