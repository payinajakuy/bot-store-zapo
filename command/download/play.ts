import axios from 'axios';
import { setting } from '../../setting.ts';

export default {
  name: 'play',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    const lower = text.trim().toLowerCase();
    if (!lower.startsWith('play ') && lower !== 'play') return;

    const query = text.slice(4).trim();

    if (!query) {
      await client.message.send(replyTarget, '📋 *Format Perintah*\n\n`play <judul lagu>`\n\nContoh:\n`play Karena Kucinta Kau`', { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, `🔍 Sedang mencari lagu: *${query}*...`, { quote: event });

      // 1. Search YouTube
      const searchUrl = `${setting.YAPARI_BASE_URL}api/search/yts?q=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchUrl, {
        headers: { 'X-API-Key': setting.YAPARI_API_KEY },
        timeout: 30000
      });

      if (!searchRes.data?.success || !searchRes.data?.results?.items || searchRes.data.results.items.length === 0) {
        await client.message.send(replyTarget, '❌ Gagal menemukan lagu tersebut di YouTube.', { quote: event });
        return;
      }

      // Ambil hasil pencarian pertama
      const item = searchRes.data.results.items[0];
      const videoUrl = item.url;

      await client.message.send(replyTarget, `⏳ Sedang mengunduh audio: *${item.judul}*...`, { quote: event });

      // 2. Download YouTube Video/Audio
      const downloadUrl = `${setting.YAPARI_BASE_URL}api/download/youtube?url=${encodeURIComponent(videoUrl)}`;
      const downloadRes = await axios.get(downloadUrl, {
        headers: { 'X-API-Key': setting.YAPARI_API_KEY },
        timeout: 60000
      });

      if (!downloadRes.data?.success || !downloadRes.data?.results) {
        await client.message.send(replyTarget, '❌ Gagal mengambil data download dari YouTube.', { quote: event });
        return;
      }

      const data = downloadRes.data.results;
      const audios = data.audios;

      if (!audios || audios.length === 0) {
        await client.message.send(replyTarget, '❌ Tidak ditemukan format audio untuk lagu ini.', { quote: event });
        return;
      }

      // Pilih audio (ambil yang pertama, biasanya m4a 130kbps atau 129kbps)
      const audio = audios[0];
      const audioUrl = audio.url;

      // 3. Kirim Thumbnail & Deskripsi terlebih dahulu
      const fmt = (n: number) => n >= 1000000 
        ? (n / 1000000).toFixed(1) + 'M' 
        : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

      const caption = `🎵 *${item.judul}*\n\n` +
        `👤 *Channel:* ${item.channel}\n` +
        `⏱️ *Durasi:* ${item.durasi}\n` +
        `👁️ *Views:* ${fmt(item.views)}\n` +
        `📅 *Diunggah:* ${item.diunggah}\n\n` +
        `🎧 Sedang mengunduh audio. _(Server membatasi kecepatan, proses ini bisa memakan waktu 1-3 menit. Mohon bersabar...)_`;

      // Coba kirim gambar
      try {
        const imageRes = await axios.get(item.thumbnail, { responseType: 'arraybuffer' });
        await client.message.send(replyTarget, {
          type: 'image',
          media: Buffer.from(imageRes.data),
          mimetype: 'image/jpeg',
          caption: caption
        }, { quote: event });
      } catch (imgErr) {
        // Fallback jika gagal ambil gambar
        await client.message.send(replyTarget, caption, { quote: event });
      }

      // 4. Download Audio Buffer dan Kirim
      // Gunakan timeout 5 menit (300000ms) karena link Google Video di-throttle saat IP berbeda
      const audioBufferRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 300000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const audioBuffer = Buffer.from(audioBufferRes.data);

      await client.message.send(replyTarget, {
        type: 'audio',
        media: audioBuffer,
        mimetype: audio.format === 'm4a' ? 'audio/mp4' : 'audio/webm',
        ptt: false // set true jika ingin sebagai voice note
      }, { quote: event });

    } catch (err: any) {
      console.error('[play] Error:', err.message);
      await client.message.send(replyTarget, `❌ Terjadi kesalahan: ${err.message}`, { quote: event });
    }
  }
};
