import type { User } from './types';

const KEY = 'lf_user';

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const auth = {
  getUser(): User {
    const stored = localStorage.getItem(KEY);
    if (stored) return JSON.parse(stored);
    const user: User = { uid: genId(), nickname: '匿名用户', avatar: '' };
    localStorage.setItem(KEY, JSON.stringify(user));
    return user;
  },
  getUid(): string {
    return this.getUser().uid;
  },
  updateUser(patch: Partial<Pick<User, 'nickname' | 'avatar'>>) {
    const user = { ...this.getUser(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(user));
    return user;
  },
};
