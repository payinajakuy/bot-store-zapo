import { readDatabasePayment, writeDatabasePayment } from '../../utils.ts';

export default {
  name: 'setbuttonurl',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;
    
    if (!text.toLowerCase().startsWith('setbuttonurl ')) return;

    if (isAdmin === 'Bukan admin' && isAdmin !== 'Bukan grup') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.', { quote: event });
      return;
    }

    const content = text.slice(13).trim();
    const parts = content.split('@');
    if (parts.length < 3) {
      await client.message.send(replyTarget, "Harap kirimkan format yang benar: setbuttonurl key@Nama Tombol@URL", { quote: event });
      return;
    }

    const key = parts[0].trim();
    const displayName = parts[1].trim();
    const url = parts.slice(2).join('@').trim();

    let _db = readDatabasePayment();
    const paymentData = _db.find(item => item.key === key && item.id === replyTarget);
    if (!paymentData) {
      await client.message.send(replyTarget, `Key "${key}" tidak ditemukan di grup ini.`, { quote: event });
      return;
    }

    const button = {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: displayName,
        url: url
      })
    };

    if (!paymentData.buttonData) {
      paymentData.buttonData = [];
    }

    paymentData.buttonData.push(button);
    writeDatabasePayment(_db);

    await client.message.send(replyTarget, `Tombol URL dengan teks "${displayName}" dan URL "${url}" telah berhasil diset untuk key "${key}".`, { quote: event });
  }
};
