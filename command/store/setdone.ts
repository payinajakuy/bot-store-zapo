import { saveGroupConfig } from '../../utils';

export default {
  name: 'setdone',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase().startsWith('setdone')) {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      const customText = text.substring(7).trim();
      
      if (!customText) {
        await client.message.send(replyTarget, 'Harap masukkan teks balasan. Contoh:\nsetdone Pesanan @pesanan telah selesai oleh @tagdiri', { quote: event });
        return;
      }

      saveGroupConfig(replyTarget, 'doneText', customText);
      await client.message.send(replyTarget, 'Teks done berhasil disimpan!', { quote: event });
    }
  }
};
