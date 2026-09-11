export default {
  name: 'hidetag',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin, event } = ctx;

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    
    // Pastikan command persis "hidetag" atau "h" (harus diikuti spasi atau end of string)
    // "h" saja ✅ | "h pesan" ✅ | "hahaha" ❌ | "hidetag" ✅ | "hidetag pesan" ✅
    const isHidetag = lower === 'hidetag' || lower.startsWith('hidetag ');
    const isH = lower === 'h' || lower.startsWith('h ');
    
    if (!isHidetag && !isH) return;

    // Hanya bisa dijalankan di grup
    if (isAdmin === 'Bukan grup') {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya bisa digunakan di dalam grup.', { quote: event });
      return;
    }

    // Hanya untuk admin grup
    if (isAdmin === 'Bukan admin') {
      await client.message.send(replyTarget, 'Maaf, perintah ini hanya untuk Admin grup.', { quote: event });
      return;
    }

    // Ambil isi teks setelah command
    const prefixLength = isHidetag ? 'hidetag'.length : 'h'.length;
    const content = trimmed.slice(prefixLength).trim();

    try {
      // Ambil metadata grup untuk mendapatkan list peserta
      const meta = await client.group.queryGroupMetadata(replyTarget);
      
      if (!meta || !meta.participants) {
        await client.message.send(replyTarget, 'Gagal mengambil data member grup.', { quote: event });
        return;
      }

      // Ambil semua JID dari member grup dan filter yang undefined
      const mentions: string[] = meta.participants
        .map((p: any) => p?.id)
        .filter((id: any) => typeof id === 'string');

      // Kirim pesan custom (jika ada), jika kosong kirim spasi
      // Karena ini hidetag, kita tidak menyertakan @nama di dalam teks
      const messageToSend = content ? content : ' ';

      // Kirim pesan dengan mentions all
      await client.message.send(replyTarget, messageToSend, {
        mentions: mentions
      });

    } catch (err: any) {
      console.error('[hidetag] Error:', err);
      await client.message.send(replyTarget, `Gagal melakukan hidetag: ${err.message}`, { quote: event });
    }
  }
};
