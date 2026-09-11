import fs from 'fs';
import path from 'path';
import { setting } from '../../setting.ts';

const commandDir = path.join(process.cwd(), 'command');

export default {
  name: 'editcmd',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, senderJid, event } = ctx;

    if (!text.trim().toLowerCase().startsWith('editcmd')) return;

    // Cek apakah owner
    const senderNumber = senderJid.split('@')[0];
    if (senderNumber !== setting.OWNER) {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Owner bot.', { quote: event });
      return;
    }

    // Format: editcmd folder/namafile.ts|isi kode baru
    const afterCmd = text.slice('editcmd'.length).trim();
    const separatorIdx = afterCmd.indexOf('|');

    if (separatorIdx === -1) {
      await client.message.send(replyTarget,
        '📋 *Format editcmd*\n\n`editcmd folder/namafile.ts|isi kode baru`\n\nContoh:\n`editcmd owner/testing.ts|export default { name: "testing", execute: async (ctx) => { await ctx.client.message.send(ctx.replyTarget, "Updated!") } }`',
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

    // Cek jika file belum ada
    if (!fs.existsSync(targetPath)) {
      await client.message.send(replyTarget, `❌ File *${filePath}* tidak ditemukan!\nGunakan *addcmd* untuk membuat file baru.`, { quote: event });
      return;
    }

    try {
      // Backup kode lama (opsional, simpan sebagai .bak)
      const oldCode = fs.readFileSync(targetPath, 'utf8');
      fs.writeFileSync(`${targetPath}.bak`, oldCode, 'utf8');

      // Tulis kode baru
      fs.writeFileSync(targetPath, kode, 'utf8');

      await client.message.send(replyTarget,
        `✅ Fitur *${filePath}* berhasil diperbarui!\n\nBot akan otomatis memuat ulang fitur ini dalam beberapa detik...\n_(Backup kode lama disimpan di ${filePath}.bak)_`,
        { quote: event });
    } catch (err: any) {
      console.error('[editcmd] Error:', err);
      await client.message.send(replyTarget, `❌ Gagal mengubah file.\nError: ${err.message}`, { quote: event });
    }
  }
};
