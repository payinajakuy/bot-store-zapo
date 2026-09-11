import { getListItems, getGroupConfig, processTemplate } from '../../utils.ts';

export default {
  name: 'list',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin } = ctx;

    if (isAdmin === 'Bukan grup') return;

    if (text.trim().toLowerCase() !== 'list') return;

    try {
      const listItems = getListItems(replyTarget);
      if (listItems.length === 0) {
        await client.message.send(replyTarget, { text: 'Belum ada list di grup ini.' });
        return;
      }

      const config = getGroupConfig(replyTarget);
      const simbol = config.listSimbol || '-';
      const format: string = config.listFormat || '';
      
      let header = 'Berikut daftar list yang tersedia:';
      let footer = 'Silakan ketik nama list untuk melihat detailnya.';
      if (format && format.includes('|||')) {
          const parts = format.split('|||');
          header = parts[0].trim();
          footer = parts[1].trim();
      }

      // Mengurutkan item dari A sampai Z
      listItems.sort((a, b) => a.key.localeCompare(b.key));

      let listString = '';
      for (const item of listItems) {
          listString += `${simbol} ${item.key}\n`;
      }

      const finalText = `${header}\n\n${listString}\n${footer}`;
      const { text: processedText, mentions } = await processTemplate(finalText, ctx);

      await client.message.send(replyTarget, processedText, { mentions });
    } catch (err) {
      console.error('[list] Error:', err);
      await client.message.send(replyTarget, 'Terjadi kesalahan saat menampilkan list.');
    }
  }
}
