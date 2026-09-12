import { downloadMediaMessage } from 'zapo-js';
import axios from 'axios';
import FormData from 'form-data';
import { setting } from '../../setting.ts';

export default {
  name: 'hd',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    const msgText = (text || '').trim().toLowerCase();
    if (msgText !== 'hd' && msgText !== 'remini') return;

    const message = event.message;
    if (!message) return;

    // Cek apakah pesan berisi gambar atau me-reply gambar
    const isImage = message.imageMessage || message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!isImage) {
      await client.message.send(replyTarget, 'Harap kirim atau reply sebuah foto dengan caption "hd" atau "remini".', { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, 'Sedang memproses gambar (HD/Remini), proses ini butuh waktu beberapa detik... ⏳', { quote: event });

      // Ambil objek message gambar
      const mediaMessage = message.imageMessage 
        ? message 
        : message.extendedTextMessage?.contextInfo?.quotedMessage;

      // Download gambar ke stream
      const stream = await downloadMediaMessage(mediaMessage as any);
      
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // 1. Upload ke Imgbb untuk mendapatkan URL gambar
      const formData = new FormData();
      formData.append('image', buffer.toString('base64'));
      formData.append('key', setting.IMGBB_API_KEY);

      const uploadRes = await axios.post('https://api.imgbb.com/1/upload', formData, {
        headers: formData.getHeaders()
      });

      if (!uploadRes.data?.data?.url) {
        throw new Error('Gagal mendapatkan URL gambar dari server sementara.');
      }

      const imageUrl = uploadRes.data.data.url;

      // 2. Kirim ke API Yapari untuk Upscale
      // Sesuaikan penggunaan YAPARI_BASE_URL (pastikan URL tidak mengandung double slash di '/api/')
      const baseUrl = setting.YAPARI_BASE_URL.endsWith('/') 
        ? setting.YAPARI_BASE_URL 
        : `${setting.YAPARI_BASE_URL}/`;
        
      const yapariUrl = `${baseUrl}api/tools/upscale?url=${encodeURIComponent(imageUrl)}`;
      
      const yapariRes = await axios.get(yapariUrl, {
        headers: {
          'X-API-Key': setting.YAPARI_API_KEY
        }
      });

      if (!yapariRes.data?.success || !yapariRes.data?.results?.url) {
        throw new Error('Gagal memperbesar gambar dari server AI.');
      }

      const resultUrl = yapariRes.data.results.url;

      // 3. Download hasil gambar menjadi buffer agar pasti bisa terkirim
      const imageResult = await axios.get(resultUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResult.data);

      // 4. Kirim hasil
      await client.message.send(replyTarget, { 
        type: 'image', 
        media: imageBuffer, 
        mimetype: 'image/jpeg',
        caption: 'Ini dia hasilnya! Gambar berhasil diperbesar/HD ✨' 
      }, { quote: event });

    } catch (err: any) {
      console.error('[hd] Error:', err);
      // Agar error lebih informatif, ambil response error dari axios jika ada
      const errMsg = err.response?.data?.message || err.message;
      await client.message.send(replyTarget, `Gagal memproses gambar. Error: ${errMsg}`, { quote: event });
    }
  }
};
