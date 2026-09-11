import fs from 'fs';
import path from 'path';
import { setting } from '../../setting.ts';

const dbPath = path.join(process.cwd(), 'database', 'sewa.json');

export default {
    name: 'delsewa',
    execute: async (ctx: any) => {
        const { client, text, replyTarget, senderJid, event } = ctx;

        if (!text.trim().toLowerCase().startsWith('delsewa')) return;

        // Cek apakah owner
        const senderNumber = senderJid.split('@')[0];
        if (senderNumber !== setting.OWNER) {
            await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Owner bot.', { quote: event });
            return;
        }

        const args = text.trim().split(/\s+/).slice(1);
        if (args.length < 1) {
            await client.message.send(replyTarget, '📋 *Format untuk  delsewa ini*\n\nContoh: delsewa https://chat.whatsapp.com/...\natau: delsewa 120363XXXX@g.us', { quote: event });
            return;
        }

        const linkOrJid = args[0];
        let targetGroupId = linkOrJid;

        // Jika yang diinputkan adalah link, kita harus ekstrak invite code, lalu dapatkan group info
        // karena di database yang disimpan adalah JID.
        if (linkOrJid.includes('chat.whatsapp.com/')) {
            const inviteCode = linkOrJid.split('chat.whatsapp.com/')[1].split('/')[0].split('?')[0];
            try {
                const groupInfo = await client.group.queryGroupInviteInfo(inviteCode);
                if (groupInfo && groupInfo.jid) {
                    targetGroupId = groupInfo.jid;
                } else {
                    await client.message.send(replyTarget, 'Gagal mengambil informasi dari link grup tersebut.', { quote: event });
                    return;
                }
            } catch (err) {
                await client.message.send(replyTarget, 'Gagal memproses link grup, pastikan link valid.', { quote: event });
                return;
            }
        }

        if (!fs.existsSync(dbPath)) {
            await client.message.send(replyTarget, 'Database sewa kosong.', { quote: event });
            return;
        }

        try {
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const existingIndex = db.findIndex((x: any) => x.id === targetGroupId);

            if (existingIndex !== -1) {
                // Hapus dari DB
                db.splice(existingIndex, 1);
                fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

                await client.message.send(replyTarget, `Berhasil menghapus sewa untuk grup: ${targetGroupId}`, { quote: event });

                // Pamit dan keluar
                try {
                    await client.message.send(targetGroupId, 'Sewa bot telah dibatalkan oleh Owner. Bot pamit keluar 👋');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await client.group.leaveGroup([targetGroupId]);
                } catch (leaveErr) {
                    console.error(`Gagal keluar grup (Mungkin bot sudah dikeluarkan):`, leaveErr);
                }
            } else {
                await client.message.send(replyTarget, 'Grup tersebut tidak ditemukan di daftar sewa bot.', { quote: event });
            }
        } catch (err: any) {
            console.error('[delsewa] Error:', err);
            await client.message.send(replyTarget, 'Terjadi kesalahan sistem saat menghapus sewa.', { quote: event });
        }
    }
};
