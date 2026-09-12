import { setting } from '../../setting.ts';

export default {
  name: 'owner',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, event } = ctx;

    if (text.trim().toLowerCase() !== 'owner') return;

    const ownerNumber = setting.OWNER;
    const ownerName = setting.OWNER_NAME; // Mengambil nama owner dari setting.ts

    // Format standar vCard untuk WhatsApp
    const vcard = 'BEGIN:VCARD\n' +
                  'VERSION:3.0\n' +
                  `FN:${ownerName}\n` +
                  'ORG:Zapo Bot;\n' +
                  `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
                  'END:VCARD';

    const msg = {
      contactMessage: {
        displayName: ownerName,
        vcard: vcard
      }
    };

    try {
      await client.message.send(replyTarget, msg, { quote: event });
      
      // Kirim pesan tambahan sebagai sapaan (opsional)
      await client.message.send(replyTarget, 'Itu adalah kontak Owner / Developer bot ini. Silakan chat jika ada keperluan penting! 😉');
    } catch (err: any) {
      console.error('[owner] Error:', err);
      await client.message.send(replyTarget, `Gagal mengirim kontak owner. Error: ${err.message}`, { quote: event });
    }
  }
};
