import axios from 'axios';
import { setting } from '../../setting.ts';

export default {
  name: 'tiktok',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    const lower = text.trim().toLowerCase();
    if (!lower.startsWith('tiktok') && !lower.startsWith('tt')) return;

    const prefix = lower.startsWith('tt') ? 'tt' : 'tiktok';
    const url = text.trim().slice(prefix.length).trim();

    if (!url) {
      await client.message.send(replyTarget,
        '📋 *Format Perintah*\n\n`tiktok <link>`\natau: `tt <link>`\n\nContoh:\n`tt https://vm.tiktok.com/ZMhBqkqRj/`',
        { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, '⏳ Sedang mengambil video TikTok...', { quote: event });

      const apiUrl = `${setting.YAPARI_BASE_URL}api/download/tiktok?url=${encodeURIComponent(url)}`;
      const res = await axios.get(apiUrl, {
        headers: { 'X-API-Key': setting.YAPARI_API_KEY },
        timeout: 30000
      });

      if (!res.data?.success || !res.data?.results) {
        await client.message.send(replyTarget, '❌ Gagal mengambil data video. Pastikan link TikTok valid.', { quote: event });
        return;
      }

      const data = res.data.results;
      const author = data.author;
      const stats = data.stats;
      const video = data.video;
      const music = data.music;

      // Format durasi
      const durMenit = Math.floor(data.duration / 60);
      const durDetik = data.duration % 60;
      const durStr = durMenit > 0 ? `${durMenit}m ${durDetik}s` : `${durDetik}s`;

      // Format angka
      const fmt = (n: number) => n >= 1000000
        ? (n / 1000000).toFixed(1) + 'M'
        : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

      const caption = `🎵 *${data.title?.trim() || 'TikTok Video'}*\n\n` +
        `👤 *Author:* ${author?.nickname || '-'} (@${author?.username || '-'})\n` +
        `⏱️ *Durasi:* ${durStr}\n` +
        `🌏 *Region:* ${data.region || '-'}\n\n` +
        `❤️ ${fmt(stats?.likes || 0)}  💬 ${fmt(stats?.comments || 0)}  ` +
        `🔁 ${fmt(stats?.shares || 0)}  👁️ ${fmt(stats?.views || 0)}\n\n` +
        `🎶 *Musik:* ${music?.title || '-'} - ${music?.author || '-'}`;

      // Pilih video: no_watermark > hd > watermark
      const videoUrl = video?.no_watermark || video?.hd || video?.watermark;

      if (!videoUrl) {
        // Kirim teks saja jika tidak ada URL video
        await client.message.send(replyTarget, caption, { quote: event });
        return;
      }

      // Download video sebagai buffer
      const videoRes = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const videoBuffer = Buffer.from(videoRes.data);

      await client.message.send(replyTarget, {
        type: 'video',
        media: videoBuffer,
        mimetype: 'video/mp4',
        caption: caption
      }, { quote: event });

    } catch (err: any) {
      console.error('[tiktok] Error:', err.message);
      await client.message.send(replyTarget,
        `❌ Gagal mengunduh video TikTok.\nError: ${err.message}`,
        { quote: event });
    }
  }
};
