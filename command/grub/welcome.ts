import { getGroupConfig, saveGroupConfig, processTemplate } from '../../utils';

export default {
  name: 'welcome',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, isAdmin } = ctx;
    
    if (!replyTarget.endsWith('@g.us')) return;

    const lowerText = text.trim().toLowerCase();
    if (lowerText === 'welcome on' || lowerText === 'welcome off') {
      if (isAdmin !== 'Ya (Admin)') {
        await client.message.send(replyTarget, 'Maaf, fitur ini hanya untuk admin grup.', { quote: event });
        return;
      }
      
      const isEnabled = lowerText === 'welcome on';
      saveGroupConfig(replyTarget, 'welcomeEnabled', isEnabled);
      await client.message.send(replyTarget, `Fitur welcome berhasil di${isEnabled ? 'aktifkan' : 'matikan'}.`, { quote: event });
    }
  },
  async executeGroup(ctx: any) {
    const { client, groupJid, action, participants } = ctx;
    
    // Zapo/Baileys menggunakan 'add' atau 'join' ketika ada member masuk
    if (action === 'add' || action === 'join') {
      const config = getGroupConfig(groupJid);
      if (!config.welcomeEnabled) return;
      
      const welcomeText = config.welcomeText || 'Halo @usertag, selamat datang di grup @groupname! 🎉';
      
      for (const participantRaw of participants) {
        // participants bisa berupa string JID atau objek { id, ... }
        const participantJid: string = typeof participantRaw === 'string'
          ? participantRaw
          : (participantRaw?.id || participantRaw?.jid || participantRaw?.participant || '');

        if (!participantJid) continue;

        // Buat mock context agar processTemplate dapat mengurai @usertag dan @groupname
        const mockCtx = {
          client,
          event: {}, // Tidak ada pesan yang direply
          senderJid: participantJid,
          replyTarget: groupJid
        };
        
        const { text: responseText, mentions } = await processTemplate(welcomeText, mockCtx);
        
        await client.message.send(groupJid, responseText, {
          mentions: mentions
        });
      }
    }
  }
};
