import { readDatabasePayment, writeDatabasePayment } from '../../utils.ts';
import fs from 'fs';

export default {
  name: 'delpay',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;
    
    if (!text.toLowerCase().startsWith('delpay ')) return;

    if (isAdmin === 'Bukan admin' && isAdmin !== 'Bukan grup') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.', { quote: event });
      return;
    }

    const key = text.slice(7).trim();
    if (!key) {
      await client.message.send(replyTarget, "Harap kirimkan format yang benar: delpay <key>", { quote: event });
      return;
    }

    let _db = readDatabasePayment();
    const paymentIndex = _db.findIndex(item => item.key === key && item.id === replyTarget);

    if (paymentIndex === -1) {
      const availableKeys = _db
        .filter(item => item.id === replyTarget)
        .map((item, index) => `${index + 1}. ${item.key}`);

      if (availableKeys.length === 0) {
        await client.message.send(replyTarget, "Tidak ada data pembayaran yang tersedia di grup ini.", { quote: event });
        return;
      }
      await client.message.send(replyTarget, `Key "${key}" tidak ditemukan.\n\nKey yang tersedia:\n${availableKeys.join('\n')}`, { quote: event });
      return;
    }

    const deletedPayment = _db.splice(paymentIndex, 1)[0];

    if (deletedPayment.imageUrl && fs.existsSync(deletedPayment.imageUrl)) {
      try {
        fs.unlinkSync(deletedPayment.imageUrl);
      } catch (err) {
        console.error("Gagal menghapus file gambar payment:", err);
      }
    }

    writeDatabasePayment(_db);
    await client.message.send(replyTarget, `Data pembayaran dengan key "${key}" berhasil dihapus.`, { quote: event });
  }
};
