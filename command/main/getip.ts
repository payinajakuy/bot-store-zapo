import axios from 'axios';

export default {
  name: 'getip',
  execute: async (ctx: any) => {
    const { client, text, replyTarget } = ctx;

    if (text.trim().toLowerCase() !== 'getip') return;

    try {
      await client.message.send(replyTarget, 'Sedang mengecek IP server...');

      let ipv4 = 'Tidak tersedia';
      let ipv6 = 'Tidak tersedia';

      // Cek IPv4
      try {
        const res4 = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
        if (res4.data && res4.data.ip) ipv4 = res4.data.ip;
      } catch (e) {
        console.error('[getip] IPv4 fetch error');
      }

      // Cek IPv6
      try {
        const res6 = await axios.get('https://api6.ipify.org?format=json', { timeout: 5000 });
        if (res6.data && res6.data.ip) ipv6 = res6.data.ip;
      } catch (e) {
        console.error('[getip] IPv6 fetch error');
      }

      const responseText = `🌐 *Info IP Server*\n\nIPv4: ${ipv4}\nIPv6: ${ipv6}`;
      await client.message.send(replyTarget, responseText);
    } catch (err) {
      console.error('[getip] Error:', err);
      await client.message.send(replyTarget, 'Terjadi kesalahan saat mengambil IP server.');
    }
  }
};
