import { saveGroupConfig } from '../../utils';

export default {
  name: 'setgagal',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase().startsWith('setgagal')) {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      const customText = text.substring(8).trim();
      
      if (!customText) {
        await client.message.send(replyTarget, 'Harap masukkan teks balasan. Contoh:\nsetgagal Pesanan @pesanan gagal diproses oleh @tagdiri', { quote: event });
        return;
      }

      saveGroupConfig(replyTarget, 'gagalText', customText);
      await client.message.send(replyTarget, 'Teks gagal berhasil disimpan!', { quote: event });
    }
  }
};
