import { getGroupConfig, processTemplate } from '../../utils';

export default {
  name: 'gagal',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    const args = text.trim().split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === 'gagal' || cmd === 'g') {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      let pesananText = args.slice(1).join(' ').trim();
      if (!pesananText) {
        const quotedMsg = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        pesananText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
      }
      
      try {
        const config = getGroupConfig(replyTarget);
        const gagalText = config.gagalText || 'Pesanan @pesanan gagal diproses.';
        
        const { text: responseText, mentions } = await processTemplate(gagalText, ctx, pesananText);
        
        await client.message.send(replyTarget, responseText, {
          quote: event,
          mentions: mentions
        });
      } catch (err) {
        await client.message.send(replyTarget, 'Terjadi kesalahan.', { quote: event });
      }
    }
  }
};
