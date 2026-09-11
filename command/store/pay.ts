import { readDatabasePayment } from '../../utils.ts';
import fs from 'fs';

export default {
  name: 'pay',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;
    
    if (text.trim().toLowerCase() !== 'pay') return;

    if (!replyTarget.endsWith('@g.us')) {
      await client.message.send(replyTarget, 'Perintah ini hanya bisa digunakan di grup.', { quote: event });
      return;
    }

    // Juga cek dari event.key.remoteJid langsung sebagai fallback
    const groupJid = event?.key?.remoteJid || replyTarget;

    console.log('[pay] replyTarget:', replyTarget);
    console.log('[pay] groupJid:', groupJid);

    let _db = readDatabasePayment();
    let payments = _db.filter(item => item.id === replyTarget || item.id === groupJid);

    console.log('[pay] total payments found:', payments.length);

    if (payments.length === 0) {
      await client.message.send(replyTarget, "Tidak ada data pembayaran yang ditemukan di grup ini.", { quote: event });
      return;
    }

    try {
      for (const payment of payments) {
        const buttons = (payment.buttonData || []).map((btn: any) => ({
          name: btn.name,
          buttonParamsJson: btn.buttonParamsJson
        }));

        const hasImage = payment.imageUrl && fs.existsSync(payment.imageUrl);
        console.log('[pay] sending payment:', payment.key, '| hasImage:', hasImage, '| buttons:', buttons.length);

        if (hasImage && buttons.length > 0) {
          // Kirim gambar + tombol interaktif
          const rawMsg = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                  body: { text: payment.paymentData },
                  footer: { text: `💳 ${payment.key.toUpperCase()}` },
                  header: {
                    hasMediaAttachment: true,
                    imageMessage: {
                      url: payment.imageUrl,
                      mimetype: 'image/jpeg'
                    }
                  },
                  nativeFlowMessage: { buttons }
                }
              }
            }
          };
          await client.message.send(replyTarget, rawMsg, { quote: event });

        } else if (hasImage) {
          // Gambar saja tanpa tombol
          await client.message.send(replyTarget, {
            image: fs.readFileSync(payment.imageUrl),
            caption: `💳 *${payment.key.toUpperCase()}*\n\n${payment.paymentData}`
          }, { quote: event });

        } else {
          // Teks saja tanpa gambar
          const rawMsg = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                  body: { text: `💳 *${payment.key.toUpperCase()}*\n\n${payment.paymentData}` },
                  footer: { text: '' },
                  header: { hasMediaAttachment: false },
                  nativeFlowMessage: { buttons }
                }
              }
            }
          };
          await client.message.send(replyTarget, rawMsg, { quote: event });
        }

        await new Promise(r => setTimeout(r, 500));
      }

    } catch (err: any) {
      console.error('[pay] Error:', err);
      await client.message.send(replyTarget, 'Gagal menampilkan pembayaran: ' + (err.message || String(err)), { quote: event });
    }
  }
};
