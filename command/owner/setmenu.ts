import fs from 'fs';
import path from 'path';

export default {
  name: 'setmenu',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, isAdmin } = ctx;

    const lower = text.trim().toLowerCase();
    if (lower !== 'setmenu1' && lower !== 'setmenu2') return;

    if (isAdmin === 'Bukan admin' && isAdmin !== 'Bukan grup') {
      await client.message.send(replyTarget, 'Perintah ini hanya untuk Admin / Owner.');
      return;
    }

    const mode = lower === 'setmenu1' ? '1' : '2';
    const settingPath = path.join(process.cwd(), 'setmenu.json');
    
    let setting: any = { setmenu: '1' };
    if (fs.existsSync(settingPath)) {
      try {
        setting = JSON.parse(fs.readFileSync(settingPath, 'utf8'));
      } catch (e) {}
    }

    setting.setmenu = mode;
    fs.writeFileSync(settingPath, JSON.stringify(setting, null, 2));

    await client.message.send(replyTarget, `Berhasil mengubah menu ke mode *${mode === '1' ? 'TEKS BIASA' : 'INTERAKTIF BUTTON'}*`);
  }
};
