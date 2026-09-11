import { createPinoLogger, createStore, WaClient, isLidJid, fetchLatestWaWebVersion } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'
import qrcode from 'qrcode-terminal'
import * as readline from 'readline'
import fs from 'fs'
import path from 'path'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve))
}

async function startBot() {
  if (!fs.existsSync('.auth')) {
    fs.mkdirSync('.auth', { recursive: true })
  }

  const hasAuth = fs.existsSync('.auth/state.sqlite') && fs.statSync('.auth/state.sqlite').size > 0;
  let method = '';
  let phoneNumber = '';

  if (!hasAuth) {
    method = await question('\nPilih metode login:\n1. QR Code\n2. Pairing Code\nMasukkan pilihan (1/2): ')
    if (method === '2') {
      phoneNumber = await question('Masukkan nomor telepon bot (dengan kode negara, contoh: 6281234567890): ')
    }
  } else {
    console.log('\nSesi sebelumnya ditemukan, langsung menyambungkan...');
  }
  rl.close()

  const logger = await createPinoLogger({ level: 'info', pretty: true })

  const store = createStore({
    backends: {
      sqlite: createSqliteStore({ path: '.auth/state.sqlite', driver: 'auto' })
    },
    providers: {
      auth: 'sqlite',
      signal: 'sqlite',
      preKey: 'sqlite',
      session: 'sqlite',
      identity: 'sqlite',
      senderKey: 'sqlite',
      appState: 'sqlite',
      privacyToken: 'sqlite',
      messages: 'sqlite',
      threads: 'sqlite',
      contacts: 'sqlite'
    }
  })

  let waVersion: readonly number[] = [2, 3000, 10179];
  try {
    const res = await fetchLatestWaWebVersion();
    if (res && res.parts) {
      waVersion = res.parts;
    }
    logger.info(`Menggunakan WA Web versi: ${waVersion.join('.')}`);
  } catch (err) {
    logger.warn(`Gagal mengambil versi WA Web terbaru, menggunakan fallback v${waVersion.join('.')}`);
  }

  const client = new WaClient(
    {
      store,
      sessionId: 'default',
      version: waVersion.join('.'),
      markOnlineOnConnect: true,
      keepAliveIntervalMs: 10000,
      deviceBrowser: 'chrome',
      recoverFromClientTooOld: true,
      connectTimeoutMs: 15_000,
      nodeQueryTimeoutMs: 30_000
    },
    logger
  )

  let pairingCodeRequested = false;

  client.on('auth_qr', async ({ qr }) => {
    if (method === '1') {
      qrcode.generate(qr, { small: true })
    } else if (method === '2' && phoneNumber && !pairingCodeRequested) {
      pairingCodeRequested = true;
      let code;
      const CF = '123456789ABCDEFGHJKLMNPQRSTVWXYZ';
      const randomCode = Array.from({ length: 8 }, () => CF[Math.floor(Math.random() * CF.length)]).join('');
      
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          code = await client.auth.requestPairingCode(phoneNumber, true, randomCode);
          break;
        } catch (err) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (code) {
        logger.info(`Kode Pairing Anda: ${code.match(/.{1,4}/g)?.join('-') || code}`)
        logger.info(`Masukkan kode ini di HP Anda: WhatsApp -> Perangkat Tertaut -> Tautkan dengan nomor telepon.`)
      } else {
        logger.error(`Gagal meminta kode pairing setelah beberapa percobaan.`)
      }
    }
  })

  client.on('auth_paired', ({ credentials }) => {
    logger.info(`Berhasil login sebagai ${credentials.meJid}`)
  })

  client.on('connection', (event) => {
    logger.info(`Status Koneksi: ${event.status} ${event.reason || ''}`)
  })

  // Memuat fitur (plugins) secara dinamis
  const commands: any[] = [];
  const commandDir = path.join(process.cwd(), 'command');

  async function importCommand(fullPath: string, bustCache = false): Promise<any | null> {
    let tempPath: string | null = null;
    try {
      let importPath = fullPath;

      if (bustCache) {
        // Buat salinan file sementara dengan nama unik agar tsx tidak pakai cache lama
        const ext = path.extname(fullPath);
        tempPath = `${fullPath.slice(0, -ext.length)}_hrtmp_${Date.now()}${ext}`;
        fs.copyFileSync(fullPath, tempPath);
        importPath = tempPath;
      }

      const fileUrl = `file://${importPath.replace(/\\/g, '/')}`;
      const cmd = await import(fileUrl);

      if (cmd.default) {
        if (cmd.default.execute || cmd.default.init) return cmd.default;
        if (cmd.default.default && (cmd.default.default.execute || cmd.default.default.init)) return cmd.default.default;
      }
      const found = Object.values(cmd).find((c: any) => c && c.name && (c.execute || c.init));
      return found || null;
    } catch (e) {
      logger.error(`Gagal memuat ${path.basename(fullPath)}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    } finally {
      // Hapus file sementara
      if (tempPath && fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    }
  }

  async function loadCommands(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        await loadCommands(fullPath);
      } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
        const cmd = await importCommand(fullPath);
        if (cmd) commands.push(cmd);
      }
    }
  }
  await loadCommands(commandDir);

  // Inisialisasi background tasks
  for (const cmd of commands) {
    if (typeof cmd.init === 'function') {
      try {
        await cmd.init(client);
      } catch (err) {
        logger.error(`Error inisialisasi fitur ${cmd.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // === HOT-RELOAD: Watch folder command/ untuk perubahan ===
  const reloadPending = new Map<string, ReturnType<typeof setTimeout>>();

  fs.watch(commandDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (!filename.endsWith('.ts') && !filename.endsWith('.js')) return;

    const fullPath = path.join(commandDir, filename);

    // Debounce: batalkan timer sebelumnya jika ada, tunggu 500ms setelah event terakhir
    if (reloadPending.has(fullPath)) {
      clearTimeout(reloadPending.get(fullPath)!);
    }

    const timer = setTimeout(async () => {
      reloadPending.delete(fullPath);

      if (!fs.existsSync(fullPath)) {
        // Hapus semua duplikat command dengan path ini
        const toRemove = commands.reduce((acc: number[], c: any, i: number) => {
          if (c._filePath === fullPath) acc.push(i);
          return acc;
        }, []);
        for (let i = toRemove.length - 1; i >= 0; i--) commands.splice(toRemove[i], 1);
        if (toRemove.length > 0) logger.info(`[Hot-Reload] Fitur dihapus: ${filename}`);
        return;
      }

      const newCmd = await importCommand(fullPath, true); // bustCache=true agar selalu muat versi baru
      if (!newCmd) return;
      newCmd._filePath = fullPath;

      // Hapus SEMUA entri lama (by name atau by path) untuk cegah duplikat
      for (let i = commands.length - 1; i >= 0; i--) {
        if (commands[i].name === newCmd.name || commands[i]._filePath === fullPath) {
          commands.splice(i, 1);
        }
      }

      // Tambahkan versi baru
      commands.push(newCmd);
      logger.info(`[Hot-Reload] ✅ Fitur diperbarui: ${newCmd.name} (${filename})`);

      // Jalankan init jika ada
      if (typeof newCmd.init === 'function') {
        try { await newCmd.init(client); } catch (err) {
          logger.error(`Error init hot-reload ${newCmd.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }, 500);

    reloadPending.set(fullPath, timer);
  });

  logger.info(`[Hot-Reload] Memantau perubahan di folder: command/`);


  // Meneruskan event perubahan grup (member join/leave) ke plugin
  client.on('group', async (event) => {
    const ctx = {
      client,
      event,
      groupJid: event.groupJid,
      action: event.action,
      participants: (event as any).participants || []
    };

    for (const cmd of commands) {
      if (typeof cmd.executeGroup === 'function') {
        try {
          await cmd.executeGroup(ctx);
        } catch (err) {
          logger.error(`Error pada fitur group ${cmd.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  });

  client.on('message', async (event) => {
    const text =
      event.message?.conversation ?? event.message?.extendedTextMessage?.text
    
    if (!text) return;
    
    // Tentukan JID target untuk membalas, memprioritaskan JID nomor telepon (PN) daripada LID
    let replyTarget = event.key.remoteJid;
    if (isLidJid(replyTarget) && event.key.remoteJidAlt && !isLidJid(event.key.remoteJidAlt)) {
      replyTarget = event.key.remoteJidAlt;
    }
    
    const isGroup = event.key.remoteJid.endsWith('@g.us');
    let senderPrimary = isGroup ? event.key.participant : event.key.remoteJid;
    let senderAlt = isGroup ? event.key.participantAlt : event.key.remoteJidAlt;
    
    let jid = '-';
    let lid = '-';
    
    if (senderPrimary && isLidJid(senderPrimary)) {
      lid = senderPrimary;
      if (senderAlt && !isLidJid(senderAlt)) jid = senderAlt;
    } else if (senderPrimary && !isLidJid(senderPrimary)) {
      jid = senderPrimary;
      if (senderAlt && isLidJid(senderAlt)) lid = senderAlt;
    }

    let isAdmin = 'Bukan grup';
    if (isGroup) {
      isAdmin = 'Bukan admin'; // Default jika di dalam grup
      try {
        // Zapo menggunakan client.group.queryGroupMetadata()
        const group = await client.group.queryGroupMetadata(event.key.remoteJid);
        if (group && group.participants) {
          // Cari partisipan berdasarkan JID atau LID pengirim
          const participant = group.participants.find((p: any) => p.id === senderPrimary || p.id === senderAlt || p.jid === senderPrimary || p.jid === senderAlt);
          if (participant?.isAdmin || participant?.isSuperAdmin) {
            isAdmin = 'Ya (Admin)';
          }
        }
      } catch (err) {
        // Jika gagal mengambil metadata, abaikan saja
      }
    }

    console.log('\n================================');
    console.log(`Jid   : ${jid}`);
    console.log(`Lid   : ${lid}`);
    console.log(`Pesan : ${text}`);
    console.log(`Admin : ${isAdmin}`);
    console.log('================================\n');

    // Mengambil nama pengirim (pushName)
    const pushName = (event as any).pushName || (event.message as any)?.pushName || 'User';

    const ctx = {
      client,
      event,
      text,
      replyTarget,
      senderJid: jid,
      senderLid: lid,
      isAdmin,
      pushName
    };

    // Eksekusi semua fitur (plugins)
    for (const cmd of commands) {
      if (typeof cmd.execute === 'function') {
        try {
          await cmd.execute(ctx);
        } catch (err) {
          logger.error(`Error pada fitur ${cmd.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  })

  await client.connect()
}

startBot().catch(err => console.error("Error starting bot:", err))
