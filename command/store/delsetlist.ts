import { saveGroupConfig } from '../../utils.ts';

export default {
  name: 'delsetlist',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin } = ctx;

    if (text.trim().toLowerCase() !== 'delsetlist') return;

    if (isAdmin === 'Bukan grup') return;
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.');
      return;
    }

    saveGroupConfig(replyTarget, 'listFormat', '');
    saveGroupConfig(replyTarget, 'listSimbol', '-');
    
    await client.message.send(replyTarget, 'Berhasil mereset format list dan simbol ke setelan awal.');
  }
}
