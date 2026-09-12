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

    await client.message.send(replyTarget, 'Menjalankan update bos ku...', { quote: event });

    try {
      // 1. Auto-commit perubahan lokal (seperti setting.ts atau file lain) agar tidak bentrok
      try {
        await execAsync('git add .');
        await execAsync('git commit -m "Auto-commit lokal sebelum update dari GitHub"');
      } catch (e) {
        // Abaikan jika tidak ada perubahan lokal atau belum menjadi repo git
      }

      let stdout = '';
      let stderr = '';

      try {
        const result = await execAsync('git pull origin main --no-edit -X theirs');
        stdout = result.stdout;
        stderr = result.stderr;
        
        // Proteksi: Kembalikan setting.ts ke versi lokal kita (sebelum pull)
        try {
          await execAsync('git checkout HEAD@{1} -- setting.ts');
          await execAsync('git commit -m "Auto-restore setting.ts lokal"');
        } catch (e) {
          // Abaikan jika tidak ada perbedaan
        }
      } catch (pullError: any) {
        const errMsg = pullError.message || '';
        // Cek jika error karena folder belum menjadi git repository (misal panel baru via ZIP)
        if (errMsg.includes('not a git repository')) {
          await client.message.send(replyTarget, 'Mendeteksi pemasangan via ZIP. Menginisialisasi sistem Update otomatis... ⏳', { quote: event });
          
          try {
            await execAsync('git init');
            await execAsync('git remote add origin https://github.com/payinajakuy/bot-store-zapo.git');
            await execAsync('git fetch');
            await execAsync('git branch -M main');
            await execAsync('git reset --hard origin/main');
            
            await client.message.send(replyTarget, '*INISIALISASI & UPDATE BERHASIL* ✅\n\nBot berhasil disinkronkan dengan GitHub. File sudah versi terbaru!', { quote: event });
            return;
          } catch (initErr: any) {
            throw new Error(`Gagal menginisialisasi sistem Git: ${initErr.message}`);
          }
        } else {
          throw pullError; // Error lain lempar ke catch utama
        }
      }
      
      if (stdout.includes('Already up to date.')) {
        await client.message.send(replyTarget, '*UPDATE BERHASIL*\n\n✅ Bot sudah berada di versi terbaru. Tidak ada file yang ditambahkan atau diubah dari Server.', { quote: event });
        return;
      }

      let msg = `*UPDATE BERHASIL*\n\n✨ *Berikut adalah file yang berhasil diupdate/ditambahkan:*\n\n`;
      try {
        const { stdout: diffOut } = await execAsync('git diff --name-status HEAD@{1} HEAD');
        if (diffOut) {
          const changes = diffOut.trim().split('\n').map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
               const status = parts[0];
               const file = parts[1];
               let statusText = '📝 Diubah';
               if (status.startsWith('A')) statusText = '➕ Ditambah';
               else if (status.startsWith('D')) statusText = '❌ Dihapus';
               return `- ${statusText}: ${file}`;
            }
            return line;
          }).join('\n');
          msg += changes;
        } else {
          msg += `\`\`\`${stdout.trim()}\`\`\``;
        }
      } catch (e) {
        msg += `\`\`\`${stdout.trim()}\`\`\``;
      }
      
      await client.message.send(replyTarget, msg, { quote: event });

    } catch (err: any) {
      console.error('[update] Error:', err);
      let errMsg = `*GAGAL MELAKUKAN UPDATE*\n\n`;
      errMsg += `\`\`\`${err.message || err}\`\`\`\n`;
      await client.message.send(replyTarget, errMsg, { quote: event });
    }
  }
};
