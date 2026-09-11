import { saveGroupConfig } from '../../utils';

export default {
  name: 'setleft',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase().startsWith('setleft')) {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      const customText = text.substring(7).trim();
      
      if (!customText) {
        await client.message.send(replyTarget, 'Harap masukkan teks perpisahan. Contoh:\nsetleft Selamat tinggal @tagdiri dari @groupname!', { quote: event });
        return;
      }

      saveGroupConfig(replyTarget, 'leftText', customText);
      await client.message.send(replyTarget, 'Teks left berhasil disimpan!', { quote: event });
    }
  }
};
