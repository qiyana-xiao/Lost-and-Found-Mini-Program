export type ItemType = 'lost' | 'found';
export type ItemStatus = 'open' | 'closed';

export const CATEGORIES = [
  '全部', '电子产品', '证件卡片', '钱包钥匙', '书籍文具',
  '衣物配饰', '运动器材', '食品饮料', '其他',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<string, string> = {
  '电子产品': '📱', '证件卡片': '🪪', '钱包钥匙': '🔑', '书籍文具': '📚',
  '衣物配饰': '👕', '运动器材': '⚽', '食品饮料': '🍱', '其他': '📦',
};

export interface Item {
  id: string;
  uid: string;
  type: ItemType;
  title: string;
  category: string;
  location: string;
  lostTime: string;
  description: string;
  images: string[];
  contact: string;
  status: ItemStatus;
  viewCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  itemId: string;
  uid: string;
  content: string;
  contact: string;
  createdAt: number;
}

export interface User {
  uid: string;
  nickname: string;
  avatar: string;
}
