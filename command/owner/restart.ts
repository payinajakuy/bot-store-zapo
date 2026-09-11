import { spawn } from 'child_process';
import path from 'path';
import { setting } from '../../setting.ts';

export default {
  name: 'restart',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, senderJid, event } = ctx;

    if (text.trim().toLowerCase() !== 'restart') return;

    // Cek apakah owner
    const senderNumber = senderJid.split('@')[0];
    if (senderNumber !== setting.OWNER) {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Owner bot.', { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, '🔄 Bot sedang restart... Tunggu beberapa detik ya!', { quote: event });

      // Beri waktu agar pesan terkirim dulu
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Spawn proses baru (npm start) secara detached agar tetap hidup
      const botDir = path.join(process.cwd());
      const child = spawn('npm', ['start'], {
        cwd: botDir,
        detached: true,
        stdio: 'ignore',
        shell: true
      });

      // Lepaskan proses anak dari proses induk
      child.unref();

      // Matikan proses saat ini
      process.exit(0);
    } catch (err: any) {
      console.error('[restart] Error:', err);
      await client.message.send(replyTarget, '❌ Gagal restart bot.', { quote: event });
    }
  }
};
