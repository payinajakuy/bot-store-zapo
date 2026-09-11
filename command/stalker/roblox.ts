import axios from 'axios';
import { setting } from '../../setting.ts';

export default {
  name: 'cekroblox',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    if (!text.toLowerCase().startsWith('cekroblox')) return;

    const username = text.slice(10).trim();
    if (!username) {
      await client.message.send(replyTarget, 'Mohon masukkan username Roblox yang ingin dicari.\nContoh: cekroblox RichXlyzz', { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, `Sedang mencari informasi untuk username: *${username}*...`, { quote: event });

      const apiUrl = `${setting.YAPARI_BASE_URL}api/stalker/roblox?username=${username}`;
      const response = await axios.get(apiUrl, {
        headers: {
          'X-API-Key': setting.YAPARI_API_KEY
        }
      });

      if (response.data && response.data.success && response.data.results) {
        const data = response.data.results;
        
        let gamesText = '';
        if (data.games && data.games.length > 0) {
            gamesText = `\n\n🎮 *Games (${data.games.length}):*\n`;
            data.games.forEach((g: any, i: number) => {
                gamesText += `${i + 1}. ${g.name}\n`;
            });
        }

        const createdDate = new Date(data.created).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

        const messageText = `*ROBLOX STALKER*\n\n` +
          `👤 *Username:* ${data.username}\n` +
          `🏷️ *Display Name:* ${data.display_name}\n` +
          `🆔 *ID:* ${data.id}\n` +
          `📅 *Dibuat:* ${createdDate}\n` +
          `🌐 *Status:* ${data.presence}\n` +
          `📍 *Lokasi Terakhir:* ${data.last_location || 'Unknown'}\n` +
          `👥 *Teman:* ${data.friends_count}\n` +
          `📈 *Followers:* ${data.followers_count}\n` +
          `📉 *Following:* ${data.following_count}\n` +
          `⛔ *Banned:* ${data.is_banned ? 'Ya' : 'Tidak'}\n` +
          `✅ *Verified:* ${data.has_verified_badge ? 'Ya' : 'Tidak'}` +
          `${gamesText}\n\n` +
          `🔗 *Profile URL:* ${data.profile_url}`;

        // Send response with image
        try {
          const imageBuffer = (await axios.get(data.avatar_full, { responseType: 'arraybuffer' })).data;
          await client.message.send(replyTarget, {
            type: 'image',
            media: Buffer.from(imageBuffer),
            mimetype: 'image/png',
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
      console.error('[roblox] Error:', err.message);
      await client.message.send(replyTarget, 'Terjadi kesalahan saat mengambil data dari API.', { quote: event });
    }
  }
};
