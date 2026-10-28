import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../lib/db';
import { auth } from '../lib/auth';
import type { Item } from '../lib/types';
import { CATEGORY_EMOJI } from '../lib/types';
import { formatTime } from '../lib/utils';

export function Mine() {
  const nav = useNavigate();
  const user = auth.getUser();
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState({ total: 0, closed: 0, lost: 0, found: 0 });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingNick, setEditingNick] = useState(false);
  const [nick, setNick] = useState(user.nickname);

  const reload = () => {
    const uid = auth.getUid();
    const { list } = db.getList({ uid, page: 1 });
    setItems(list);
    setStats(db.getStats(uid));
  };

  useEffect(() => { reload(); }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这条信息吗？')) return;
    setDeleting(id);
    db.deleteItem(id);
    reload();
    setDeleting(null);
  };

  const saveNick = () => {
    auth.updateUser({ nickname: nick.trim() || '匿名用户' });
    setEditingNick(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-4 pt-5 pb-4">
          <h1 className="font-serif text-2xl font-semibold mb-4">我的</h1>

          {/* Profile */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
              {nick.slice(0, 1)}
            </div>
            <div className="flex-1">
              {editingNick ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="flex-1 text-base font-semibold border-b-2 border-primary bg-transparent"
                    value={nick}
                    onChange={e => setNick(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveNick(); if (e.key === 'Escape') setEditingNick(false); }}
                    maxLength={15}
                  />
                  <button onClick={saveNick} className="text-xs text-primary font-medium">保存</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-base">{auth.getUser().nickname}</span>
                  <button onClick={() => setEditingNick(true)} className="text-muted-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">ID: {user.uid.slice(0, 8)}...</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '发布', value: stats.total, color: 'text-foreground' },
              { label: '已认领', value: stats.closed, color: 'text-green-600' },
              { label: '失物', value: stats.lost, color: 'text-red-500' },
              { label: '招领', value: stats.found, color: 'text-blue-500' },
            ].map(s => (
              <div key={s.label} className="bg-muted rounded-xl p-2.5 text-center">
                <div className={`text-xl font-bold font-serif ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My items */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base">我的发布</h2>
          <button
            onClick={() => nav('/publish')}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            发布新信息
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm mb-4">还没有发布过信息</p>
            <button onClick={() => nav('/publish')} className="bg-primary text-primary-foreground text-sm font-medium px-5 py-2 rounded-full">
              立即发布
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const emoji = CATEGORY_EMOJI[item.category] || '📦';
              return (
                <div key={item.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="flex gap-3 p-3" onClick={() => nav(`/detail/${item.id}`)}>
                    <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
                      {item.images[0] ? <img src={item.images[0]} alt="" className="w-full h-full object-cover" /> : emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${item.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {item.type === 'lost' ? '失物' : '招领'}
                        </span>
                        {item.status === 'closed' && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">已认领</span>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.location} · {formatTime(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="border-t border-border flex">
                    <button
                      onClick={() => nav(`/publish?id=${item.id}`)}
                      className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      编辑
                    </button>
                    <div className="w-px bg-border" />
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="flex-1 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
