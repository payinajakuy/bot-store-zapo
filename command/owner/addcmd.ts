import fs from 'fs';
import path from 'path';
import { setting } from '../../setting.ts';

const commandDir = path.join(process.cwd(), 'command');

export default {
  name: 'addcmd',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, senderJid, event } = ctx;

    if (!text.trim().toLowerCase().startsWith('addcmd')) return;

    // Cek apakah owner
    const senderNumber = senderJid.split('@')[0];
    if (senderNumber !== setting.OWNER) {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Owner bot.', { quote: event });
      return;
    }

    // Format: addcmd folder/namafile.ts|isi kode
    const afterCmd = text.slice('addcmd'.length).trim();
    const separatorIdx = afterCmd.indexOf('|');

    if (separatorIdx === -1) {
      await client.message.send(replyTarget,
        '📋 *Format addcmd*\n\n`addcmd folder/namafile.ts|isi kode`\n\nContoh:\n`addcmd owner/testing.ts|export default { name: "testing", execute: async (ctx) => { await ctx.client.message.send(ctx.replyTarget, "Hello!") } }`',
        { quote: event });
      return;
    }

    const filePath = afterCmd.slice(0, separatorIdx).trim();
    const kode = afterCmd.slice(separatorIdx + 1).trim();

    if (!filePath || !kode) {
      await client.message.send(replyTarget, '❌ Nama file atau kode tidak boleh kosong.', { quote: event });
      return;
    }

    // Pastikan hanya bisa masuk ke folder command/ (keamanan)
    const targetPath = path.join(commandDir, filePath);
    if (!targetPath.startsWith(commandDir)) {
      await client.message.send(replyTarget, '❌ Path tidak valid.', { quote: event });
      return;
    }

    // Pastikan ekstensi .ts atau .js
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) {
      await client.message.send(replyTarget, '❌ File harus berekstensi .ts atau .js', { quote: event });
      return;
    }

    // Cek jika file sudah ada
    if (fs.existsSync(targetPath)) {
      await client.message.send(replyTarget, `❌ File *${filePath}* sudah ada!\nGunakan *editcmd* untuk mengubah file yang sudah ada.`, { quote: event });
      return;
    }

    try {
      // Buat direktori jika belum ada
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, kode, 'utf8');

      await client.message.send(replyTarget,
        `✅ Fitur baru berhasil dibuat!\n📁 Path: command/${filePath}\n\nBot akan otomatis memuat fitur baru ini dalam beberapa detik...`,
        { quote: event });
    } catch (err: any) {
      console.error('[addcmd] Error:', err);
      await client.message.send(replyTarget, `❌ Gagal membuat file.\nError: ${err.message}`, { quote: event });
    }
  }
};
