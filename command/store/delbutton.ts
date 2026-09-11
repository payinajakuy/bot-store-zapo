import { readDatabasePayment, writeDatabasePayment } from '../../utils.ts';

export default {
  name: 'delbutton',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;
    
    if (!text.toLowerCase().startsWith('delbutton ')) return;

    if (isAdmin === 'Bukan admin' && isAdmin !== 'Bukan grup') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.', { quote: event });
      return;
    }

    const key = text.slice(10).trim();
    if (!key) {
      await client.message.send(replyTarget, "Contoh: delbutton key", { quote: event });
      return;
    }

    let _db = readDatabasePayment();
    const payment = _db.find(item => item.key === key && item.id === replyTarget);

    if (!payment) {
      await client.message.send(replyTarget, `Key "${key}" tidak ditemukan di grup ini.`, { quote: event });
      return;
    }

    payment.buttonData = [];
    writeDatabasePayment(_db);

    await client.message.send(replyTarget, `Semua tombol untuk key "${key}" berhasil dihapus.`, { quote: event });
  }
};
