import { readDatabasePayment, writeDatabasePayment } from '../../utils.ts';

export default {
  name: 'setwdpay',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;
    
    if (!text.toLowerCase().startsWith('setwdpay ')) return;

    if (isAdmin === 'Bukan admin' && isAdmin !== 'Bukan grup') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.', { quote: event });
      return;
    }

    const content = text.slice(9).trim();
    const parts = content.split('@');
    if (parts.length < 2) {
      await client.message.send(replyTarget, 'Format yang benar: setwdpay key@Teks Pembayaran Baru', { quote: event });
      return;
    }

    const key = parts[0].trim();
    const newWording = parts.slice(1).join('@').trim();

    let _db = readDatabasePayment();
    const payment = _db.find(item => item.key === key && item.id === replyTarget);

    if (!payment) {
      await client.message.send(replyTarget, `Key "${key}" tidak ditemukan di grup ini.`, { quote: event });
      return;
    }

    payment.paymentData = newWording;
    writeDatabasePayment(_db);

    await client.message.send(replyTarget, `Teks (wording) untuk key "${key}" berhasil diubah.`, { quote: event });
  }
};
