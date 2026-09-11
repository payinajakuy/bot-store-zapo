import fs from 'fs';
import path from 'path';
import { setting } from '../../setting.ts';

const dbPath = path.join(process.cwd(), 'database', 'sewa.json');

export default {
  name: 'listsewa',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, senderJid, event } = ctx;

    if (text.trim().toLowerCase() !== 'listsewa') return;

    // Cek apakah owner
    const senderNumber = senderJid.split('@')[0];
    if (senderNumber !== setting.OWNER) {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Owner bot.', { quote: event });
      return;
    }

    if (!fs.existsSync(dbPath)) {
      await client.message.send(replyTarget, '📋 Belum ada grup yang sedang disewa.', { quote: event });
      return;
    }

    try {
      const db: any[] = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

      if (db.length === 0) {
        await client.message.send(replyTarget, '📋 Belum ada grup yang sedang disewa.', { quote: event });
        return;
      }

      const now = Date.now();
      let dbUpdated = false;
      let msg = `📋 *Daftar Grup Sewa Bot*\n\n`;

      for (let index = 0; index < db.length; index++) {
        const item = db[index];
        
        // Jika nama belum tersimpan, fetch dari API
        if (!item.name) {
          try {
            const meta = await client.group.queryGroupMetadata(item.id);
            item.name = meta.subject || '';
            db[index].name = item.name;
            dbUpdated = true;
          } catch {
            item.name = '';
          }
        }

        const expiredAt = new Date(item.expiredAt);
        const remainingMs = item.expiredAt - now;
        const isExpired = remainingMs <= 0;

        let sisaWaktu = '';
        if (isExpired) {
          sisaWaktu = '⛔ Sudah habis';
        } else {
          const totalMenit = Math.floor(remainingMs / 60000);
          const hari = Math.floor(totalMenit / 1440);
          const jam = Math.floor((totalMenit % 1440) / 60);
          const menit = totalMenit % 60;
          const parts = [];
          if (hari > 0) parts.push(`${hari} hari`);
          if (jam > 0) parts.push(`${jam} jam`);
          if (menit > 0) parts.push(`${menit} menit`);
          sisaWaktu = `⏳ Sisa: ${parts.join(' ') || '< 1 menit'}`;
        }

        const namaGrup = item.name || item.id;
        msg += `${index + 1}. *${namaGrup}*\n`;
        msg += `   🆔 ${item.id}\n`;
        msg += `   📅 Berakhir: ${expiredAt.toLocaleString('id-ID')}\n`;
        msg += `   ${sisaWaktu}\n\n`;
      }

      // Simpan nama yang baru di-fetch ke database
      if (dbUpdated) {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      }

      msg += `Total: *${db.length} grup*`;

      await client.message.send(replyTarget, msg, { quote: event });

    } catch (err: any) {
      console.error('[listsewa] Error:', err);
      await client.message.send(replyTarget, 'Terjadi kesalahan saat membaca data sewa.', { quote: event });
    }
  }
};
