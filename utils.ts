import fs from 'fs';
import path from 'path';

const DATABASE_DIR = path.join(process.cwd(), 'database');
if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}
const CONFIG_PATH = path.join(DATABASE_DIR, 'group_configs.json');
const LIST_DB_PATH = path.join(DATABASE_DIR, 'db_list.json');

export interface ListItem {
  id: string;
  key: string;
  response: string;
  isImage: boolean;
  image_url: string;
}

function readListDB(): ListItem[] {
  if (!fs.existsSync(LIST_DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(LIST_DB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveListDB(data: ListItem[]) {
  fs.writeFileSync(LIST_DB_PATH, JSON.stringify(data, null, 3));
}

export function getListItems(jid: string): ListItem[] {
  const db = readListDB();
  return db.filter(item => item.id === jid);
}

export function getListItem(jid: string, key: string): ListItem | undefined {
  const db = readListDB();
  return db.find(item => item.id === jid && item.key === key);
}

export function addListItem(jid: string, key: string, response: string, isImage: boolean = false, image_url: string = "-") {
  const db = readListDB();
  const index = db.findIndex(item => item.id === jid && item.key === key);
  const newItem: ListItem = { id: jid, key, response, isImage, image_url };
  if (index !== -1) {
    db[index] = newItem;
  } else {
    db.push(newItem);
  }
  saveListDB(db);
}

export function delListItem(jid: string, key: string): boolean {
  let db = readListDB();
  const initialLength = db.length;
  db = db.filter(item => !(item.id === jid && item.key === key));
  if (db.length !== initialLength) {
    saveListDB(db);
    return true;
  }
  return false;
}

export function resetListItems(jid: string): number {
  let db = readListDB();
  const initialLength = db.length;
  // Simpan item yang BUKAN milik grup ini
  db = db.filter(item => item.id !== jid);
  const deletedCount = initialLength - db.length;
  
  if (deletedCount > 0) {
    saveListDB(db);
  }
  return deletedCount;
}

export function getGroupConfig(jid: string) {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return data[jid] || {};
  } catch {
    return {};
  }
}

export function saveGroupConfig(jid: string, key: string, value: any) {
  let data: any = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {}
  }
  if (!data[jid]) data[jid] = {};
  data[jid][key] = value;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

export async function processTemplate(text: string, ctx: any, pesananText: string = '') {
  const { client, event, senderJid, replyTarget } = ctx;
  
  // Dapatkan nama grup
  let groupName = 'Grup';
  try {
    const groupMeta = await client.group.queryGroupMetadata(replyTarget);
    if (groupMeta && groupMeta.subject) groupName = groupMeta.subject;
  } catch (err) {}
  
  // Dapatkan ID orang yang di-reply (jika ada)
  const quotedMessage = event.message?.extendedTextMessage?.contextInfo;
  const tagReply = quotedMessage?.participant || '';
  const tagReplyJid = tagReply ? (tagReply.includes('@') ? tagReply : `${tagReply}@s.whatsapp.net`) : '';
  
  const now = new Date();
  const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');
  const detik = String(now.getSeconds()).padStart(2, '0');
  const hari = hariArr[now.getDay()];
  const tanggal = String(now.getDate()).padStart(2, '0');
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  const namabulan = bulanArr[now.getMonth()];
  const tahun = String(now.getFullYear());

  const validSenderJid = typeof senderJid === 'string' ? senderJid : (senderJid && senderJid.id ? senderJid.id : '');
  const senderNumber = validSenderJid ? validSenderJid.split('@')[0] : '';

  // @usertag: untuk welcome/left — participant yang join atau keluar (sama dengan senderJid di ctx tersebut)
  const userNumber = senderNumber;

  let processed = text
    .replace(/@groupname/g, groupName)
    .replace(/@tagdiri/g, `@${senderNumber}`)
    .replace(/@usertag/g, userNumber ? `@${userNumber}` : '')
    .replace(/@tagreply/g, tagReplyJid ? `@${tagReplyJid.split('@')[0]}` : '')
    .replace(/@jam/g, jam)
    .replace(/@menit/g, menit)
    .replace(/@detik/g, detik)
    .replace(/@hari/g, hari)
    .replace(/@tanggal/g, tanggal)
    .replace(/@bulan/g, bulan)
    .replace(/@namabulan/g, namabulan)
    .replace(/@tahun/g, tahun)
    .replace(/@pesanan/g, pesananText);

  const mentions: string[] = [];
  if (text.includes('@tagdiri') && validSenderJid) mentions.push(validSenderJid);
  if (text.includes('@usertag') && validSenderJid) mentions.push(validSenderJid);
  if (text.includes('@tagreply') && tagReplyJid) mentions.push(tagReplyJid);

  return { text: processed, mentions };
}
