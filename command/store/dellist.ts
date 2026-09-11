import { delListItem } from '../../utils.ts';

export default {
  name: 'dellist',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin } = ctx;

    if (!text.toLowerCase().startsWith('dellist ')) return;

    if (isAdmin === 'Bukan grup') return;
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.');
      return;
    }

    const key = text.slice(8).trim().toLowerCase(); 
    if (!key) {
      await client.message.send(replyTarget, 'Format salah! Gunakan: dellist <nama list>');
      return;
    }

    const success = delListItem(replyTarget, key);
    if (success) {
      await client.message.send(replyTarget, `Berhasil menghapus list dengan key: *${key}*`);
    } else {
      await client.message.send(replyTarget, `Gagal menghapus list. Key *${key}* tidak ditemukan.`);
    }
  }
}
