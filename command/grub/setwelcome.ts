import { saveGroupConfig } from '../../utils';

export default {
  name: 'setwelcome',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase().startsWith('setwelcome')) {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      const customText = text.substring(10).trim();
      
      if (!customText) {
        await client.message.send(replyTarget, 'Harap masukkan teks sambutan. Contoh:\nsetwelcome Halo @tagdiri, selamat datang di @groupname!', { quote: event });
        return;
      }

      saveGroupConfig(replyTarget, 'welcomeText', customText);
      await client.message.send(replyTarget, 'Teks welcome berhasil disimpan!', { quote: event });
    }
  }
};
