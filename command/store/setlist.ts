import { saveGroupConfig } from '../../utils.ts';

export default {
  name: 'setlist',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin } = ctx;

    if (!text.toLowerCase().startsWith('setlist ')) return;

    if (isAdmin === 'Bukan grup') return;
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.');
      return;
    }

    const parts = text.trim().split(/\s+/);
    const content = parts.slice(1).join(' ');
    
    if (content) {
      if (content.split('|||').length !== 2) {
        await client.message.send(replyTarget, 'Format salah! Harus ada 2 bagian yang dipisahkan oleh "|||".\nContoh: setlist TextAtas ||| TextBawah');
        return;
      }
      saveGroupConfig(replyTarget, 'listFormat', content);
      await client.message.send(replyTarget, 'Berhasil mengatur format list grup ini.');
    } else {
      saveGroupConfig(replyTarget, 'listFormat', '');
      await client.message.send(replyTarget, 'Berhasil mengosongkan format list grup ini (kembali ke default).');
    }
  }
}
