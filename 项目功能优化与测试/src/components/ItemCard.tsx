import { useNavigate } from 'react-router';
import type { Item } from '../lib/types';
import { CATEGORY_EMOJI } from '../lib/types';
import { formatTime, maskContact } from '../lib/utils';

export function ItemCard({ item }: { item: Item }) {
  const nav = useNavigate();
  const emoji = CATEGORY_EMOJI[item.category] || '📦';

  return (
    <div
      onClick={() => nav(`/detail/${item.id}`)}
      className="bg-card rounded-lg border border-border cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      {/* Image / Placeholder */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {item.images[0] ? (
          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{emoji}</div>
        )}
        {/* Type badge */}
        <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${item.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {item.type === 'lost' ? '我丢的' : '我捡的'}
        </span>
        {/* Status badge */}
        {item.status === 'closed' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-foreground text-sm font-semibold px-3 py-1 rounded-full">已认领</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2">{item.title}</h3>
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{item.category}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {item.location}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(item.createdAt)}</span>
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            {item.viewCount}
          </span>
        </div>
      </div>
    </div>
  );
}
