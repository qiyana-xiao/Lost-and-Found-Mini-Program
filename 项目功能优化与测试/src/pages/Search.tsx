import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../lib/db';
import type { Item } from '../lib/types';
import { CATEGORIES } from '../lib/types';
import { ItemCard } from '../components/ItemCard';

export function Search() {
  const nav = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [results, setResults] = useState<Item[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = () => {
    if (!keyword.trim() && category === '全部') { setResults(null); return; }
    const { list } = db.getList({ keyword: keyword.trim(), category, page: 1 });
    setResults(list);
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-40 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 flex items-center bg-muted rounded-xl px-3 py-2 gap-2">
            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              ref={inputRef}
              autoFocus
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="搜索标题、地点、描述..."
              className="flex-1 bg-transparent text-sm placeholder-muted-foreground"
            />
            {keyword && (
              <button onClick={() => { setKeyword(''); setResults(null); }} className="text-muted-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <button onClick={doSearch} className="text-sm font-medium text-primary px-1">搜索</button>
        </div>
        {/* Category filter */}
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

      <div className="p-4">
        {results === null ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">输入关键词或选择分类开始搜索</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-sm">没有找到相关内容</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">找到 {results.length} 条结果</p>
            <div className="grid grid-cols-2 gap-3">
              {results.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
