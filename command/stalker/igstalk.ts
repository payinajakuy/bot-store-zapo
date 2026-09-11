import axios from 'axios';
import { setting } from '../../setting.ts';

export default {
  name: 'igstalk',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    if (!text.toLowerCase().startsWith('igstalk ')) return;

    const username = text.slice(8).trim();
    if (!username) {
      await client.message.send(replyTarget, 'Mohon masukkan username Instagram yang ingin dicari.\nContoh: igstalk cristiano', { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, `Sedang mencari informasi Instagram untuk username: *${username}*...`, { quote: event });

      const apiUrl = `${setting.YAPARI_BASE_URL}api/stalker/instagram?username=${username}`;
      const response = await axios.get(apiUrl, {
        headers: {
          'X-API-Key': setting.YAPARI_API_KEY
        }
      });

      if (response.data && response.data.success && response.data.results) {
        const data = response.data.results;
        
        const messageText = `*INSTAGRAM STALKER*\n\n` +
          `👤 *Username:* ${data.username}\n` +
          `🏷️ *Name:* ${data.name}\n` +
          `🔗 *Profile URL:* ${data.profile_url}`;

        // Send response with image
        try {
          const imageBuffer = (await axios.get(data.avatar, { responseType: 'arraybuffer' })).data;
          await client.message.send(replyTarget, {
            type: 'image',
            media: Buffer.from(imageBuffer),
            mimetype: 'image/jpeg',
            caption: messageText
          }, { quote: event });
        } catch (imgErr) {
          // Fallback if image fails
          await client.message.send(replyTarget, messageText, { quote: event });
        }
      } else {
        await client.message.send(replyTarget, `Tidak dapat menemukan informasi untuk username *${username}*.`, { quote: event });
      }
    } catch (err: any) {
      console.error('[igstalk] Error:', err.message);
      await client.message.send(replyTarget, 'Terjadi kesalahan saat mengambil data dari API.', { quote: event });
    }
  }
};
