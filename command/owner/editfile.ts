import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { downloadMediaMessage } from 'zapo-js';
import { setting } from '../../setting.ts';

// File inti yang jika diedit akan memicu restart bot
const CORE_FILES = ['index.ts', 'setting.ts', 'utils.ts'];

export default {
  name: 'editfile',
  execute: async (ctx: any) => {
    const { client, text, event, replyTarget, senderJid } = ctx;

    const lower = text.trim().toLowerCase();
    if (!lower.startsWith('editfile')) return;

    // Cek apakah owner
    const senderNumber = senderJid.split('@')[0];
    if (senderNumber !== setting.OWNER) {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Owner bot.', { quote: event });
      return;
    }

    // Nama file target diambil setelah "editfile "
    const targetFileName = text.slice('editfile'.length).trim();

    if (!targetFileName) {
      await client.message.send(replyTarget,
        '📋 *Format editfile*\n\n' +
        'Kirim file baru sambil ketik caption:\n' +
        '`editfile namafile.ts`\n\n' +
        'Atau reply pesan yang ada file-nya lalu ketik:\n' +
        '`editfile namafile.ts`\n\n' +
        '*File yang didukung:*\n' +
        '• `index.ts` → restart bot otomatis\n' +
        '• `setting.ts` → restart bot otomatis\n' +
        '• `utils.ts` → restart bot otomatis\n' +
        '• `command/folder/file.ts` → hot-reload otomatis',
        { quote: event });
      return;
    }

    // Validasi ekstensi
    if (!targetFileName.endsWith('.ts') && !targetFileName.endsWith('.js')) {
      await client.message.send(replyTarget, '❌ File harus berekstensi .ts atau .js', { quote: event });
      return;
    }

    // Tentukan path file target
    const cwd = process.cwd();
    let targetPath: string;
    const isCore = CORE_FILES.includes(targetFileName);

    if (isCore) {
      // File inti ada di root project
      targetPath = path.join(cwd, targetFileName);
    } else {
      // File command ada di folder command/
      const commandDir = path.join(cwd, 'command');
      targetPath = path.join(commandDir, targetFileName);
      // Keamanan: pastikan path masih di dalam command/
      if (!targetPath.startsWith(commandDir)) {
        await client.message.send(replyTarget, '❌ Path tidak valid.', { quote: event });
        return;
      }
    }

    // Cari file dokumen: dari pesan saat ini atau pesan yang di-reply
    let docMessage = event.message?.documentMessage
      ? event.message
      : event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.documentMessage
        ? event.message.extendedTextMessage.contextInfo.quotedMessage
        : null;

    // Cek juga imageMessage sebagai fallback (kadang ts dikirim sebagai image)
    if (!docMessage && event.message?.imageMessage) {
      docMessage = event.message;
    }

    if (!docMessage) {
      await client.message.send(replyTarget,
        '❌ Tidak ada file yang ditemukan!\n\nKirim file .ts / .js sambil ketik caption `editfile namafile.ts`,\natau reply pesan berisi file tersebut lalu ketik `editfile namafile.ts`.',
        { quote: event });
      return;
    }

    try {
      await client.message.send(replyTarget, `⏳ Sedang mengunduh dan menerapkan file *${targetFileName}*...`, { quote: event });

      // Download file dari WhatsApp
      const stream = await downloadMediaMessage(docMessage as any);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const fileContent = Buffer.concat(chunks);

      // Buat direktori jika belum ada
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      // Tulis file baru menimpa yang lama
      fs.writeFileSync(targetPath, fileContent);

      if (isCore) {
        // File inti → perlu restart bot
        await client.message.send(replyTarget,
          `✅ File *${targetFileName}* berhasil diperbarui!\n\n🔄 Bot akan restart dalam 3 detik...`,
          { quote: event });

        // Tunggu 3 detik agar pesan terkirim, lalu restart
        setTimeout(() => {
          console.log(`[editfile] Restarting bot karena ${targetFileName} diperbarui...`);
          const child = spawn('npm', ['start'], {
            cwd,
            detached: true,
            stdio: 'ignore',
            shell: true
          });
          child.unref();
          process.exit(0);
        }, 3000);
      } else {
        // File command → hot-reload otomatis dari fs.watch
        await client.message.send(replyTarget,
          `✅ File *command/${targetFileName}* berhasil diperbarui!\n\n🔁 Hot-reload akan memuat ulang fitur secara otomatis dalam beberapa detik...`,
          { quote: event });
      }

    } catch (err: any) {
      console.error('[editfile] Error:', err);
      await client.message.send(replyTarget, `❌ Gagal menerapkan file.\nError: ${err.message}`, { quote: event });
    }
  }
};
