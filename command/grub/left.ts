import { getGroupConfig, saveGroupConfig, processTemplate } from '../../utils';

export default {
  name: 'left',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    const lowerText = text.trim().toLowerCase();
    if (lowerText === 'left on' || lowerText === 'left off') {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      const isEnabled = lowerText === 'left on';
      saveGroupConfig(replyTarget, 'leftEnabled', isEnabled);
      await client.message.send(replyTarget, `Fitur left berhasil di${isEnabled ? 'aktifkan' : 'matikan'}.`, { quote: event });
    }
  },
  async executeGroup(ctx: any) {
    const { client, groupJid, action, participants } = ctx;
    
    // Zapo/Baileys menggunakan 'remove' atau 'leave' ketika ada member keluar
    if (action === 'remove' || action === 'leave') {
      const config = getGroupConfig(groupJid);
      if (!config.leftEnabled) return;
      
      const leftText = config.leftText || 'Selamat tinggal @usertag dari grup @groupname! 👋';
      
      for (const participantRaw of participants) {
        // participants bisa berupa string JID atau objek { id, ... }
        const participantJid: string = typeof participantRaw === 'string'
          ? participantRaw
          : (participantRaw?.id || participantRaw?.jid || participantRaw?.participant || '');

        if (!participantJid) continue;

        const mockCtx = {
          client,
          event: {},
          senderJid: participantJid,
          replyTarget: groupJid
        };
        
        const { text: responseText, mentions } = await processTemplate(leftText, mockCtx);
        
        await client.message.send(groupJid, responseText, {
          mentions: mentions
        });
      }
    }
  }
};
