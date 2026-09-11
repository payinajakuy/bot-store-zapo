import { saveGroupConfig } from '../../utils.ts';

export default {
  name: 'setsimbol',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin } = ctx;

    if (!text.toLowerCase().startsWith('setsimbol ')) return;

    if (isAdmin === 'Bukan grup') return;
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.');
      return;
    }

    const content = text.slice(10).trim(); 
    if (!content) {
      await client.message.send(replyTarget, 'Format salah! Gunakan: setsimbol <karakter>');
      return;
    }

    saveGroupConfig(replyTarget, 'listSimbol', content);
    await client.message.send(replyTarget, `Berhasil mengatur simbol list menjadi: ${content}`);
  }
}
