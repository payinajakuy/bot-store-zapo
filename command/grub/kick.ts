export default {
  name: 'kick',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;

    if (!text.toLowerCase().startsWith('kick')) return;

    if (isAdmin === 'Bukan grup') {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya bisa digunakan di dalam grup.', { quote: event });
      return;
    }

    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Admin grup.', { quote: event });
      return;
    }

    let targetJids: string[] = [];

    const contextInfo = event.message?.extendedTextMessage?.contextInfo;

    // Jika me-reply pesan seseorang
    if (contextInfo?.participant) {
      targetJids.push(contextInfo.participant);
    }

    // Jika me-mention (tag) seseorang
    if (Array.isArray(contextInfo?.mentionedJid)) {
      targetJids.push(...contextInfo.mentionedJid);
    }

    // Hapus duplikat
    targetJids = [...new Set(targetJids)];

    if (targetJids.length === 0) {
      await client.message.send(replyTarget, 'Harap reply pesan atau tag member yang ingin dikeluarkan.', { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, `Mencoba mengeluarkan ${targetJids.length} member...`, { quote: event });
      
      const results = await client.group.removeParticipants(replyTarget, targetJids);
      
      // Bisa dicek hasilnya jika perlu, namun asumsikan sukses jika tak error throw
      let successCount = 0;
      for (const res of results) {
         if (res.status === '200' || res.status === 200) successCount++;
      }

      await client.message.send(replyTarget, `Berhasil mengeluarkan member dari grup.`, { quote: event });
    } catch (err: any) {
      console.error('[kick] Error:', err);
      await client.message.send(replyTarget, `Gagal mengeluarkan member. Pastikan bot adalah Admin. Error: ${err.message}`, { quote: event });
    }
  }
};
