import { readDatabasePayment, writeDatabasePayment, PaymentItem } from '../../utils.ts';
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from 'zapo-js';

const PAYMENT_DIR = path.join(process.cwd(), 'database', 'payments');
if (!fs.existsSync(PAYMENT_DIR)) fs.mkdirSync(PAYMENT_DIR, { recursive: true });

export default {
  name: 'setpay',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;
    
    if (!text.toLowerCase().startsWith('setpay ')) return;

    if (isAdmin === 'Bukan admin' && isAdmin !== 'Bukan grup') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.', { quote: event });
      return;
    }

    const content = text.slice(7).trim();
    const parts = content.split('@');
    if (parts.length < 2) {
      await client.message.send(replyTarget, "Harap kirimkan format yang benar (contoh: setpay gopay@Silakan transfer kesini...).", { quote: event });
      return;
    }

    const paymentMethod = parts[0].trim();
    const paymentData = parts.slice(1).join('@').trim();

    let isImage = false;
    let targetMessage = event.message;

    if (event.message?.imageMessage) {
        isImage = true;
    } else if (event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        isImage = true;
        targetMessage = event.message.extendedTextMessage.contextInfo.quotedMessage;
    }

    if (!isImage) {
      await client.message.send(replyTarget, 'Fotonya Mana? Kirim atau reply gambar dengan caption setpay.', { quote: event });
      return;
    }

    let paymentDataId = `${replyTarget.split('@')[0]}_${paymentMethod}.jpg`.replace(/[^a-zA-Z0-9_.]/g, '_');
    const imagePath = path.join(PAYMENT_DIR, paymentDataId);

    try {
      const stream = await downloadMediaMessage(targetMessage as any);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk);
      fs.writeFileSync(imagePath, Buffer.concat(chunks));
    } catch (err) {
      console.error('[setpay] Error downloading image:', err);
      await client.message.send(replyTarget, 'Gagal mendownload gambar pembayaran.', { quote: event });
      return;
    }

    let _db = readDatabasePayment();
    const existingIndex = _db.findIndex(item => item.id === replyTarget && item.key === paymentMethod);
    
    const obj_add: PaymentItem = {
      id: replyTarget,
      key: paymentMethod,
      paymentData: paymentData,
      imageUrl: imagePath,
      buttonData: existingIndex !== -1 ? _db[existingIndex].buttonData : []
    };

    if (existingIndex !== -1) {
      _db[existingIndex] = obj_add;
    } else {
      _db.push(obj_add);
    }
    
    writeDatabasePayment(_db);
    await client.message.send(replyTarget, `Pembayaran dengan metode *${paymentMethod}* berhasil disimpan.`, { quote: event });
  }
};
