import { getGroupConfig, processTemplate } from '../../utils';

export default {
  name: 'close',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    // Command only works in group
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase() === 'close') {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      try {
        // Zapo API: announcement = true means only admins can send messages
        await client.group.setSetting(replyTarget, 'announcement', true);
        
        const config = getGroupConfig(replyTarget);
        const closeText = config.closeText || 'Grup telah ditutup oleh admin!';
        
        const { text: responseText, mentions } = await processTemplate(closeText, ctx);
        
        await client.message.send(replyTarget, responseText, {
          quote: event,
          mentions: mentions
        });
      } catch (err) {
        await client.message.send(replyTarget, 'Gagal menutup grup. Pastikan bot adalah admin.', { quote: event });
      }
    }
  }
};
