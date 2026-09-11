import { resetListItems } from '../../utils.ts';

export default {
  name: 'resetlist',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;

    if (!text.toLowerCase().startsWith('resetlist')) return;

    if (isAdmin === 'Bukan grup') return;
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin.', { quote: event });
      return;
    }

    try {
      const deletedCount = resetListItems(replyTarget);
      
      if (deletedCount > 0) {
        await client.message.send(replyTarget, `✅ Berhasil menghapus *${deletedCount}* list di grup ini.`, { quote: event });
      } else {
        await client.message.send(replyTarget, `❌ Tidak ada list yang tersimpan di grup ini.`, { quote: event });
      }
    } catch (err: any) {
      console.error('[resetlist] Error:', err);
      await client.message.send(replyTarget, `❌ Gagal mereset list: ${err.message}`, { quote: event });
    }
  }
}
