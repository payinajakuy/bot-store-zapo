import fs from 'fs';
import path from 'path';

const commandDir = path.join(process.cwd(), 'command');

// Auto-generate emoji dari nama folder (fallback jika tidak dikenal)
function getCategoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    main: '🤖', stalker: '🔍', owner: '👑',
    store: '🗃️', grub: '👥', game: '🎮',
    info: 'ℹ️', tools: '🔧', fun: '🎉',
  };
  return map[cat.toLowerCase()] ?? '📂';
}

// Auto-capitalize nama folder sebagai label
function getCategoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getCommandsFromDir(): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  if (!fs.existsSync(commandDir)) return result;

  const categories = fs.readdirSync(commandDir).filter(f =>
    fs.statSync(path.join(commandDir, f)).isDirectory()
  );

  for (const cat of categories) {
    const catPath = path.join(commandDir, cat);
    const files = fs.readdirSync(catPath).filter(f => {
      // Hanya file .ts/.js yang bukan temp file hot-reload
      return (f.endsWith('.ts') || f.endsWith('.js'))
        && !f.includes('_hrtmp_')
        && !f.endsWith('.bak');
    });

    const cmdNames = files.map(f => path.basename(f, path.extname(f)));
    if (cmdNames.length > 0) {
      result[cat] = cmdNames;
    }
  }

  return result;
}

export default {
  name: 'menu',
  execute: async (ctx: any) => {
    const { client, text, replyTarget, pushName, event } = ctx;

    if (text.trim().toLowerCase() !== 'menu') return;

    const cmds = getCommandsFromDir();
    const categories = Object.keys(cmds).sort();
    const totalCmd = Object.values(cmds).reduce((sum, arr) => sum + arr.length, 0);

    const settingPath = path.join(process.cwd(), 'setmenu.json');
    let mode = '1';
    if (fs.existsSync(settingPath)) {
      try {
        mode = JSON.parse(fs.readFileSync(settingPath, 'utf8')).setmenu || '1';
      } catch (e) {}
    }

    let msgText = `Hai *${pushName}* 👋\n`;
    msgText += `Saya siap membantu Anda!\n\n`;
    msgText += `┌─「 🤖 *Info Bot* 」\n`;
    msgText += `│ Total Fitur: ${totalCmd}\n`;
    msgText += `└─\n\n`;

    if (mode === '2') {
      const sections: any[] = [];
      
      for (const cat of categories) {
        const label = getCategoryLabel(cat);
        const rows = cmds[cat].map(cmd => ({
          title: cmd,
          description: `Fitur ${cmd}`,
          id: cmd
        }));
        
        sections.push({
          title: label.toUpperCase(),
          rows
        });
      }

      const buttonParamsJson = JSON.stringify({
        title: "📖 MENU UTAMA",
        sections
      });

      const rawMsg = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: {
              body: { text: msgText + 'Berikut adalah daftar fitur yang tersedia:\nSilakan klik tombol di bawah.' },
              footer: { text: '© Zapo Bot' },
              header: {
                title: "📋 MENU BOT",
                subtitle: "",
                hasMediaAttachment: false
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson
                  }
                ]
              }
            }
          }
        }
      };

      await client.message.send(replyTarget, rawMsg, { quote: event });

    } else {
      for (const cat of categories) {
        const emoji = getCategoryEmoji(cat);
        const label = getCategoryLabel(cat);
        
        msgText += `┌── ${emoji} *${label.toUpperCase()}*\n`;
        cmds[cat].forEach((cmd, i) => {
          const isLast = i === cmds[cat].length - 1;
          msgText += `${isLast ? '└' : '├'}── ${cmd}\n`;
        });
        msgText += `\n`;
      }
      msgText += `━━━━━━━━━━━━━━━━━━\n`;
      msgText += `Ketik nama fitur untuk menggunakannya.`;

      await client.message.send(replyTarget, msgText, { quote: event });
    }
  }
};
