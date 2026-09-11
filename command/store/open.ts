import { getGroupConfig, processTemplate } from '../../utils';

export default {
  name: 'open',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    // Command only works in group
    if (!replyTarget.endsWith('@g.us')) return;

    if (text.trim().toLowerCase() === 'open') {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      try {
        // Zapo API: announcement = false means members can send messages
        await client.group.setSetting(replyTarget, 'announcement', false);
        
        const config = getGroupConfig(replyTarget);
        const openText = config.openText || 'Grup telah dibuka oleh admin!';
        
        const { text: responseText, mentions } = await processTemplate(openText, ctx);
        
        await client.message.send(replyTarget, responseText, {
          quote: event,
          mentions: mentions
        });
      } catch (err) {
        await client.message.send(replyTarget, 'Gagal membuka grup. Pastikan bot adalah admin.', { quote: event });
      }
    }
  }
};
