import { saveGroupConfig } from '../../utils';

export default {
  name: 'setopen',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    // Command only works in group
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase().startsWith('setopen')) {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      // Ambil teks setelah kata "setopen"
      const customText = text.substring(7).trim();
      
      if (!customText) {
        await client.message.send(replyTarget, 'Harap masukkan teks balasan. Contoh:\nsetopen Grup @groupname telah dibuka oleh @tagdiri', { quote: event });
        return;
      }

      saveGroupConfig(replyTarget, 'openText', customText);
      await client.message.send(replyTarget, 'Teks open berhasil disimpan!', { quote: event });
    }
  }
};
