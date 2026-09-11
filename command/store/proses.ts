import { getGroupConfig, processTemplate } from '../../utils';

export default {
  name: 'proses',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    const args = text.trim().split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === 'proses' || cmd === 'p') {
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
        const prosesText = config.prosesText || 'Pesanan @pesanan sedang diproses oleh admin!';
        
        const { text: responseText, mentions } = await processTemplate(prosesText, ctx, pesananText);
        
        await client.message.send(replyTarget, responseText, {
          quote: event,
          mentions: mentions
        });
      } catch (err) {
        await client.message.send(replyTarget, 'Terjadi kesalahan saat memproses.', { quote: event });
      }
    }
  }
};
