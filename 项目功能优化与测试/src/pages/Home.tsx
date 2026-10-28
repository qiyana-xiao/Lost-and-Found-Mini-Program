import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../lib/db';
import type { Item, ItemType } from '../lib/types';
import { CATEGORIES } from '../lib/types';
import { ItemCard } from '../components/ItemCard';

type Tab = 'all' | ItemType;
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'lost', label: '失物' },
  { key: 'found', label: '招领' },
];

export function Home() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
  const [category, setCategory] = useState('全部');
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback((reset = false) => {
    setLoading(true);
    const p = reset ? 1 : page;
    const { list, hasMore: more } = db.getList({
      type: tab === 'all' ? 'all' : tab,
      category,
      page: p,
    });
    setItems(prev => reset ? list : [...prev, ...list]);
    setHasMore(more);
    if (!reset) setPage(p + 1);
    setLoading(false);
  }, [tab, category, page]);

  useEffect(() => {
    setPage(1);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category]);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-40">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-serif text-2xl font-semibold text-foreground">失物招领</h1>
            <button onClick={() => nav('/search')} className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-secondary transition-colors">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-muted p-0.5 rounded-lg mb-3">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Category scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${category === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        {items.length === 0 && !loading ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">暂无相关内容</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}

        {hasMore && (
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="w-full mt-4 py-2.5 text-sm text-muted-foreground bg-muted rounded-lg hover:bg-secondary transition-colors"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => nav('/publish')}
        className="fixed bottom-20 right-4 w-13 h-13 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-blue-700 transition-colors z-40"
        style={{ width: 52, height: 52 }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
}
