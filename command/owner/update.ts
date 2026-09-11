import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default {
  name: 'update',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;

    if (text.trim().toLowerCase() !== 'update') return;

    if (isAdmin === 'Bukan admin' && isAdmin !== 'Bukan grup') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin / Owner.', { quote: event });
      return;
    }

    await client.message.send(replyTarget, 'Menjalankan update ...', { quote: event });

    try {
      // Kita gunakan git stash agar perubahan lokal (seperti setting.ts) 
      // yang belum dicommit tidak tertimpa/conflict, lalu pull, lalu kembalikan.
      // Database sudah aman karena ada di .gitignore.
      
      let cmd = 'git pull origin main';
      
      const { stdout, stderr } = await execAsync(cmd);
      
      let msg = `*UPDATE BERHASIL*\n\n`;
      if (stdout) msg += `\`\`\`${stdout}\`\`\`\n`;
      
      await client.message.send(replyTarget, msg, { quote: event });

    } catch (err: any) {
      console.error('[update] Error:', err);
      let errMsg = `*GAGAL MELAKUKAN UPDATE*\n\n`;
      errMsg += `\`\`\`${err.message || err}\`\`\`\n`;
      await client.message.send(replyTarget, errMsg, { quote: event });
    }
  }
};
