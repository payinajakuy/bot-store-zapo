import { saveGroupConfig } from '../../utils';

export default {
  name: 'setclose',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    // Command only works in group
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase().startsWith('setclose')) {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      // Ambil teks setelah kata "setclose"
      const customText = text.substring(8).trim();
      
      if (!customText) {
        await client.message.send(replyTarget, 'Harap masukkan teks balasan. Contoh:\nsetclose Grup @groupname telah ditutup oleh @tagdiri', { quote: event });
        return;
      }

      saveGroupConfig(replyTarget, 'closeText', customText);
      await client.message.send(replyTarget, 'Teks close berhasil disimpan!', { quote: event });
    }
  }
};
