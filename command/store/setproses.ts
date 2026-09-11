import { saveGroupConfig } from '../../utils';

export default {
  name: 'setproses',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase().startsWith('setproses')) {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      const customText = text.substring(9).trim();
      
      if (!customText) {
        await client.message.send(replyTarget, 'Harap masukkan teks balasan. Contoh:\nsetproses Pesanan @pesanan sedang diproses oleh @tagdiri', { quote: event });
        return;
      }

      saveGroupConfig(replyTarget, 'prosesText', customText);
      await client.message.send(replyTarget, 'Teks proses berhasil disimpan!', { quote: event });
    }
  }
};
