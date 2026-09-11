import axios from 'axios';
import { setting } from '../../setting.ts';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

// Helper to fetch image buffer
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(res.data);
  } catch (e) {
    return null;
  }
}

export default {
  name: 'cekff',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    if (!text.toLowerCase().startsWith('cekff')) return;

    const uid = text.slice(6).trim();
    if (!uid) {
      await client.message.send(replyTarget, 'Mohon masukkan UID Free Fire yang ingin dicari.\nContoh: cekff 961710434', { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, `Sedang mencari informasi Free Fire untuk UID: *${uid}*...`, { quote: event });

      const apiUrl = `${setting.YAPARI_BASE_URL}api/stalker/freefire?uid=${uid}`;
      const response = await axios.get(apiUrl, {
        headers: {
          'X-API-Key': setting.YAPARI_API_KEY
        }
      });

      if (response.data && response.data.success && response.data.results && response.data.results.player) {
        const player = response.data.results.player;
        const pet = response.data.results.pet;
        const social = response.data.results.social;
        
        // --- Create Canvas ---
        const width = 800;
        const height = 450;
        const canvas = createCanvas(width, height);
        const ctxCanvas = canvas.getContext('2d');

        // Draw Background
        ctxCanvas.fillStyle = '#1e1e24';
        ctxCanvas.fillRect(0, 0, width, height);
        
        // Draw Header
        ctxCanvas.fillStyle = '#ff4a4a';
        ctxCanvas.fillRect(0, 0, width, 50);
        
        ctxCanvas.fillStyle = '#ffffff';
        ctxCanvas.font = 'bold 24px sans-serif';
        ctxCanvas.fillText('FREE FIRE PROFILE', 20, 35);

        // Draw Player Info Text
        ctxCanvas.fillStyle = '#ffffff';
        ctxCanvas.font = '20px sans-serif';
        
        let startY = 90;
        const lineSpacing = 30;
        
        const texts = [
          `Nickname: ${player.nickname || '-'}`,
          `Account ID: ${player.accountId}`,
          `Region: ${player.region}`,
          `Level: ${player.level} (EXP: ${player.exp})`,
          `Likes: ${player.liked}`,
          `Rank Points: ${player.rankingPoints} | CS Rank: ${player.csRankingPoints}`,
          `Create At: ${new Date(Number(player.createAt) * 1000).toLocaleDateString('id-ID')}`
        ];

        if (pet) {
            texts.push(`Pet: ${pet.name || '-'} (${pet.speciesName || '-'}) - Lv ${pet.level || 0}`);
        }
        
        if (social && social.signature) {
            texts.push(`Signature: ${social.signature.replace(/\[.*?\]/g, '').substring(0, 30)}`);
        }

        texts.forEach(txt => {
          ctxCanvas.fillText(txt, 20, startY);
          startY += lineSpacing;
        });

        // Fetch and Draw Icons (Right Side)
        const iconPromises: Promise<{img: any, x: number, y: number, w: number, h: number}>[] = [];
        let currentX = 400;
        let currentY = 70;
        const iconSize = 80;
        const padding = 10;

        const addIconToDraw = async (url: string | null) => {
            if (!url) return;
            const buf = await fetchImageBuffer(url);
            if (buf) {
                try {
                    const img = await loadImage(buf);
                    iconPromises.push(Promise.resolve({ img, x: currentX, y: currentY, w: iconSize, h: iconSize }));
                    
                    currentX += iconSize + padding;
                    if (currentX > width - iconSize - padding) {
                        currentX = 400;
                        currentY += iconSize + padding;
                    }
                } catch (e) {
                    console.error('Failed to load image for canvas', e);
                }
            }
        };

        // Collect URLs to draw
        const urlsToDraw = [];
        if (player.titleIconUrl) urlsToDraw.push(player.titleIconUrl);
        if (player.equippedCharacterIconUrl) urlsToDraw.push(player.equippedCharacterIconUrl);
        if (pet && pet.skinIconUrl) urlsToDraw.push(pet.skinIconUrl);

        if (player.equippedSkinIconUrls && Array.isArray(player.equippedSkinIconUrls)) {
            urlsToDraw.push(...player.equippedSkinIconUrls.slice(0, 6)); // max 6 outfit parts
        }
        if (player.equippedWeaponSkinIconUrls && Array.isArray(player.equippedWeaponSkinIconUrls)) {
            urlsToDraw.push(...player.equippedWeaponSkinIconUrls.slice(0, 2)); // max 2 weapons
        }

        // Draw background for icons area
        ctxCanvas.fillStyle = '#2b2b36';
        ctxCanvas.fillRect(380, 60, 400, 370);

        // Load and draw all icons
        for (const url of urlsToDraw) {
            await addIconToDraw(url);
        }

        const iconsToDraw = await Promise.all(iconPromises);
        iconsToDraw.forEach(item => {
            // Draw placeholder rect
            ctxCanvas.fillStyle = '#3f3f4e';
            ctxCanvas.fillRect(item.x, item.y, item.w, item.h);
            // Draw image
            ctxCanvas.drawImage(item.img, item.x, item.y, item.w, item.h);
        });

        // Convert canvas to buffer
        const finalBuffer = canvas.toBuffer('image/png');

        const messageText = `*FREE FIRE STALKER*\n\n` +
          `👤 *Nickname:* ${player.nickname}\n` +
          `🆔 *UID:* ${player.accountId}\n` +
          `📈 *Level:* ${player.level}\n` +
          `👍 *Likes:* ${player.liked}`;

        // Send response with image
        await client.message.send(replyTarget, {
            type: 'image',
            media: finalBuffer,
            mimetype: 'image/png',
            caption: messageText
        }, { quote: event });
        
      } else {
        await client.message.send(replyTarget, `Tidak dapat menemukan informasi untuk UID *${uid}*.`, { quote: event });
      }
    } catch (err: any) {
      console.error('[cekff] Error:', err.message);
      await client.message.send(replyTarget, 'Terjadi kesalahan saat mengambil data dari API.', { quote: event });
    }
  }
};
