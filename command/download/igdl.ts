import { setting } from '../../setting.ts';

export default {
  name: 'igdl',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    const lower = text.trim().toLowerCase();
    if (!lower.startsWith('igdl ') && lower !== 'igdl') return;

    const url = text.slice(4).trim();
    if (!url) {
      await client.message.send(replyTarget, 'Masukkan link Instagram.', { quote: event });
      return;
    }

    try {
      const response = await fetch(`${setting.YAPARI_BASE_URL}api/download/instagram?url=${encodeURIComponent(url)}`, {
        headers: { 'X-API-Key': setting.YAPARI_API_KEY }
      });

      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

      const data = await response.json();
      if (!data.success || !data.results) throw new Error('Data tidak ditemukan');

      const { results } = data;
      const caption = results.caption || '';

      const fetchMedia = async (mediaUrl: string) => {
          const res = await fetch(mediaUrl);
          if (!res.ok) throw new Error('Gagal mengunduh file media');
          return Buffer.from(await res.arrayBuffer());
      };

      if (results.slides && results.slides.length > 0) {
        for (let i = 0; i < results.slides.length; i++) {
          const slide = results.slides[i];
          const isVideo = slide.media_type === 'video';
          const mediaUrl = slide.url || slide.video_url || slide.thumbnails?.full;
          if (!mediaUrl) continue;
          
          const buffer = await fetchMedia(mediaUrl);
          const cap = i === 0 ? caption : '';
          
          await client.message.send(replyTarget, {
            type: isVideo ? 'video' : 'image',
            media: buffer,
            mimetype: isVideo ? 'video/mp4' : 'image/jpeg',
            caption: cap
          }, { quote: event });
        }
      } else if (results.video_url || results.video) {
        const mediaUrl = results.video_url || results.video;
        const buffer = await fetchMedia(mediaUrl);
        await client.message.send(replyTarget, {
          type: 'video',
          media: buffer,
          mimetype: 'video/mp4',
          caption: caption
        }, { quote: event });
      } else if (results.thumbnails && results.thumbnails.full) {
        const buffer = await fetchMedia(results.thumbnails.full);
        await client.message.send(replyTarget, {
          type: 'image',
          media: buffer,
          mimetype: 'image/jpeg',
          caption: caption
        }, { quote: event });
      } else {
        throw new Error('Media tidak ditemukan');
      }
    } catch (error: any) {
      console.error('[igdl] Error:', error);
      await client.message.send(replyTarget, `Gagal mengunduh Instagram. Error: ${error.message || 'Unknown'}`, { quote: event });
    }
  }
}
