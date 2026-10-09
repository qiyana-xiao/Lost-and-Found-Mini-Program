import type { Item, Message, ItemType, ItemStatus } from './types';
import { auth } from './auth';

const ITEMS_KEY = 'lf_items';
const MSGS_KEY = 'lf_messages';
const RATE_KEY = 'lf_rate';
const PAGE_SIZE = 20;

function readItems(): Item[] {
  try { return JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); } catch { return []; }
}
function writeItems(items: Item[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}
function readMessages(): Message[] {
  try { return JSON.parse(localStorage.getItem(MSGS_KEY) || '[]'); } catch { return []; }
}
function writeMessages(msgs: Message[]) {
  localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
}
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function checkRate() {
  const uid = auth.getUid();
  const raw = localStorage.getItem(RATE_KEY);
  const store: Record<string, number[]> = raw ? JSON.parse(raw) : {};
  const now = Date.now();
  const times = (store[uid] || []).filter(t => now - t < 60_000);
  if (times.length >= 3) throw new Error('发布频率过高，请1分钟后再试');
  times.push(now);
  store[uid] = times;
  localStorage.setItem(RATE_KEY, JSON.stringify(store));
}

export interface ListParams {
  type?: ItemType | 'all';
  category?: string;
  keyword?: string;
  page?: number;
  uid?: string;
}

export const db = {
  getList({ type = 'all', category, keyword, page = 1, uid }: ListParams = {}) {
    let items = readItems().sort((a, b) => b.createdAt - a.createdAt);
    if (type && type !== 'all') items = items.filter(i => i.type === type);
    if (category && category !== '全部') items = items.filter(i => i.category === category);
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(kw) ||
        i.description.toLowerCase().includes(kw) ||
        i.location.toLowerCase().includes(kw)
      );
    }
    if (uid) items = items.filter(i => i.uid === uid);
    const total = items.length;
    const list = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { list, total, hasMore: page * PAGE_SIZE < total };
  },

  getDetail(id: string): Item | null {
    return readItems().find(i => i.id === id) || null;
  },

  addItem(data: Omit<Item, 'id' | 'uid' | 'viewCount' | 'createdAt' | 'updatedAt' | 'status'>): Item {
    checkRate();
    const items = readItems();
    const now = Date.now();
    const item: Item = { ...data, id: genId(), uid: auth.getUid(), viewCount: 0, status: 'open', createdAt: now, updatedAt: now };
    writeItems([item, ...items]);
    return item;
  },

  updateItem(id: string, data: Partial<Omit<Item, 'id' | 'uid' | 'createdAt'>>) {
    const items = readItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('条目不存在');
    if (items[idx].uid !== auth.getUid()) throw new Error('无权限');
    items[idx] = { ...items[idx], ...data, updatedAt: Date.now() };
    writeItems(items);
    return items[idx];
  },

  incrementView(id: string) {
    const items = readItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) { items[idx].viewCount++; writeItems(items); }
  },

  addMessage(itemId: string, content: string, contact: string): Message {
    const msgs = readMessages();
    const msg: Message = { id: genId(), itemId, uid: auth.getUid(), content, contact, createdAt: Date.now() };
    writeMessages([...msgs, msg]);
    return msg;
  },

  getMessages(itemId: string): Message[] {
    return readMessages().filter(m => m.itemId === itemId).sort((a, b) => a.createdAt - b.createdAt);
  },

  closeItem(id: string) {
    return this.updateItem(id, { status: 'closed' as ItemStatus });
  },

  deleteItem(id: string) {
    const items = readItems();
    const item = items.find(i => i.id === id);
    if (!item) throw new Error('条目不存在');
    if (item.uid !== auth.getUid()) throw new Error('无权限');
    writeItems(items.filter(i => i.id !== id));
    const msgs = readMessages().filter(m => m.itemId !== id);
    writeMessages(msgs);
  },

  getStats(uid: string) {
    const items = readItems().filter(i => i.uid === uid);
    return {
      total: items.length,
      closed: items.filter(i => i.status === 'closed').length,
      lost: items.filter(i => i.type === 'lost').length,
      found: items.filter(i => i.type === 'found').length,
    };
  },

  seedDemo() {
    if (readItems().length > 0) return;
    const demoUid = 'demo_user_001';
    const demos: Omit<Item, 'id' | 'viewCount'>[] = [
      { uid: demoUid, type: 'lost', title: '蓝色双肩包一个', category: '其他', location: '图书馆三楼', lostTime: '2026-09-16', description: '黑色拉链，内有书本和钱包，急需找回！', images: [], contact: '13800138001', status: 'open', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
      { uid: demoUid, type: 'found', title: '捡到学生证一张', category: '证件卡片', location: '食堂一楼', lostTime: '2026-09-15', description: '姓名王同学，请联系认领', images: [], contact: '13900139002', status: 'open', createdAt: Date.now() - 172800000, updatedAt: Date.now() - 172800000 },
      { uid: demoUid, type: 'lost', title: 'AirPods Pro耳机', category: '电子产品', location: '操场附近', lostTime: '2026-09-14', description: '白色充电盒，刻有"XM"字样', images: [], contact: 'wx: xm_2024', status: 'open', createdAt: Date.now() - 259200000, updatedAt: Date.now() - 259200000 },
      { uid: demoUid, type: 'found', title: '捡到钥匙一串', category: '钱包钥匙', location: '篮球场', lostTime: '2026-09-13', description: '共四把，有一个小熊挂饰', images: [], contact: '13700137003', status: 'open', createdAt: Date.now() - 345600000, updatedAt: Date.now() - 345600000 },
      { uid: demoUid, type: 'lost', title: '数学分析课本（上册）', category: '书籍文具', location: '教学楼B204', lostTime: '2026-09-12', description: '封面有我的名字贴纸', images: [], contact: '13600136004', status: 'closed', createdAt: Date.now() - 432000000, updatedAt: Date.now() - 432000000 },
    ];
    writeItems(demos.map(d => ({ ...d, id: genId(), viewCount: Math.floor(Math.random() * 50) })));
  },
};

db.seedDemo();
