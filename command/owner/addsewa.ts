import fs from 'fs';
import path from 'path';
import { setting } from '../../setting.ts';

const dbPath = path.join(process.cwd(), 'database', 'sewa.json');

// Ensure database exists
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]));
}

// Format durasi
function parseDuration(durationStr: string): number {
    const match = durationStr.match(/^(\d+)(d|h|m)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    const now = Date.now();
    if (unit === 'd') return now + (value * 24 * 60 * 60 * 1000);
    if (unit === 'h') return now + (value * 60 * 60 * 1000);
    if (unit === 'm') return now + (value * 60 * 1000);

    return 0;
}

export default {
    name: 'addsewa',
    execute: async (ctx: any) => {
        const { client, text, replyTarget, senderJid, event } = ctx;

        if (!text.trim().toLowerCase().startsWith('addsewa')) return;

        // Cek apakah owner
        const senderNumber = senderJid.split('@')[0];
        if (senderNumber !== setting.OWNER) {
            await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Owner bot.', { quote: event });
            return;
        }

        const args = text.trim().split(/\s+/).slice(1);
        if (args.length < 2) {
            await client.message.send(replyTarget, '📋 *Format Perintah addsewa*\n\nContoh: addsewa 30d https://chat.whatsapp.com/...\n\nDurasi yang tersedia:\n• *30d* = 30 hari\n• *12h* = 12 jam\n• *30m* = 30 menit', { quote: event });
            return;
        }

        const durationStr = args[0];
        const link = args[1];

        const expiredAt = parseDuration(durationStr);
        if (expiredAt === 0) {
            await client.message.send(replyTarget, 'Format durasi salah! Gunakan: d (hari), h (jam), m (menit).\nContoh: 30d', { quote: event });
            return;
        }

        // Ekstrak kode invite
        let inviteCode = link;
        if (link.includes('chat.whatsapp.com/')) {
            inviteCode = link.split('chat.whatsapp.com/')[1].split('/')[0].split('?')[0];
        }

        try {
            let groupId: string;
            let groupName: string = '';

            try {
                // Coba join group
                const res = await client.group.joinGroupViaInvite(inviteCode);
                groupId = res.jid;
                groupName = res.subject || '';
            } catch (joinErr: any) {
                // 409 = conflict = bot sudah ada di grup, query metadata untuk dapat JID & nama
                if (joinErr.message && joinErr.message.includes('409')) {
                    try {
                        const groupInfo = await client.group.queryGroupInviteInfo(inviteCode);
                        groupId = groupInfo.jid;
                        groupName = groupInfo.subject || '';
                    } catch {
                        // queryGroupInviteInfo bisa gagal jika bot sudah member, fallback: biarkan user isi manual
                        await client.message.send(replyTarget, '⚠️ Bot sudah ada di grup ini tapi gagal ambil info grup.\nCoba gunakan: addsewa 30d <JID grup langsung>', { quote: event });
                        return;
                    }
                    await client.message.send(replyTarget, `ℹ️ Bot sudah ada di grup *${groupName}*.\nData sewa akan diperbarui.`, { quote: event });
                } else {
                    throw joinErr;
                }
            }

            // Simpan ke database (dengan nama grup)
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const existingIndex = db.findIndex((x: any) => x.id === groupId);
            if (existingIndex !== -1) {
                db[existingIndex].expiredAt = expiredAt;
                db[existingIndex].name = groupName;
            } else {
                db.push({ id: groupId, name: groupName, expiredAt: expiredAt });
            }

            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

            const dateStr = new Date(expiredAt).toLocaleString('id-ID');
            await client.message.send(replyTarget, `✅ Berhasil!\nGrup: *${groupName}*\nDurasi sewa sampai: ${dateStr}`, { quote: event });

            // Sapaan di dalam grup
            await client.message.send(groupId, `Halo semua! Bot telah disewa untuk bergabung di grup ini sampai ${dateStr}.`);

        } catch (err: any) {
            console.error('[addsewa] Error:', err);
            await client.message.send(replyTarget, `❌ Gagal bergabung ke grup.\nPastikan link valid dan bot tidak di-ban dari grup tersebut.\n\nError: ${err.message}`, { quote: event });
        }
    },

    init: async (client: any) => {
        // Interval pengecekan masa sewa habis setiap 1 menit (60000 ms)
        setInterval(async () => {
            if (!fs.existsSync(dbPath)) return;

            try {
                const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                const now = Date.now();

                const activeGroups = [];
                let updated = false;

                for (const group of db) {
                    if (group.expiredAt && group.expiredAt < now) {
                        // Sewa habis, keluar grup
                        try {
                            await client.message.send(group.id, 'Masa sewa bot di grup ini telah habis. Terima kasih! Bot akan keluar otomatis 👋');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            await client.group.leaveGroup([group.id]);
                        } catch (err) {
                            console.error(`Gagal keluar dari grup ${group.id}:`, err);
                        }
                        updated = true;
                    } else {
                        activeGroups.push(group);
                    }
                }

                if (updated) {
                    fs.writeFileSync(dbPath, JSON.stringify(activeGroups, null, 2));
                }
            } catch (err) {
                console.error('[Sewa Interval] Error reading db:', err);
            }
        }, 60000); // Cek tiap menit
    }
};
