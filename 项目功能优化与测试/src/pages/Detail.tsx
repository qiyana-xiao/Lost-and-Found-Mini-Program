import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { db } from '../lib/db';
import { auth } from '../lib/auth';
import type { Item, Message } from '../lib/types';
import { CATEGORY_EMOJI } from '../lib/types';
import { formatTime, maskContact } from '../lib/utils';

export function Detail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const uid = auth.getUid();

  const [item, setItem] = useState<Item | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [imgIdx, setImgIdx] = useState(0);
  const [msgContent, setMsgContent] = useState('');
  const [msgContact, setMsgContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!id) return;
    const i = db.getDetail(id);
    setItem(i);
    if (i) {
      db.incrementView(id);
      setMessages(db.getMessages(id));
    }
  }, [id]);

  const reload = () => {
    if (!id) return;
    setItem(db.getDetail(id));
    setMessages(db.getMessages(id));
  };

  const submitMsg = () => {
    if (!id || !msgContent.trim() || !msgContact.trim()) return;
    setSubmitting(true);
    db.addMessage(id, msgContent.trim(), msgContact.trim());
    setMsgContent('');
    setMsgContact('');
    reload();
    setSubmitting(false);
  };

  const handleClaim = () => {
    if (!id) return;
    setClaiming(true);
    db.closeItem(id);
    reload();
    setClaiming(false);
  };

  const copyContact = () => {
    if (!item) return;
    navigator.clipboard.writeText(item.contact).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!item) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground">
        <p>条目不存在</p>
      </div>
    );
  }

  const isOwner = item.uid === uid;
  const emoji = CATEGORY_EMOJI[item.category] || '📦';

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-semibold text-base flex-1 line-clamp-1">{item.title}</h1>
        {isOwner && item.status === 'open' && (
          <button onClick={() => nav(`/publish?id=${item.id}`)} className="text-xs text-primary font-medium">编辑</button>
        )}
      </div>

      {/* Image carousel */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {item.images.length > 0 ? (
          <>
            <img src={item.images[imgIdx]} alt={item.title} className="w-full h-full object-cover" />
            {item.images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">{emoji}</div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {item.type === 'lost' ? '失物' : '招领'}
          </span>
          {item.status === 'closed' && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">已认领</span>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="p-4 space-y-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-lg leading-snug mb-3">{item.title}</h2>
          <div className="space-y-2.5">
            {[
              { icon: '🏷️', label: '分类', value: item.category },
              { icon: '📍', label: '地点', value: item.location },
              { icon: '🗓️', label: '时间', value: item.lostTime },
              { icon: '👁️', label: '浏览', value: `${item.viewCount + 1} 次` },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3 text-sm">
                <span className="text-base w-5 text-center">{r.icon}</span>
                <span className="text-muted-foreground w-10 flex-shrink-0">{r.label}</span>
                <span className="font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">描述</h3>
            <p className="text-sm leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Contact */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">联系方式</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{maskContact(item.contact)}</span>
            <button
              onClick={copyContact}
              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-medium transition-all"
            >
              {copied ? '已复制！' : '复制联系方式'}
            </button>
          </div>
        </div>

        {/* Claim button (owner only) */}
        {isOwner && item.status === 'open' && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            ✅ 标记为已认领
          </button>
        )}

        {/* Messages */}
        <div>
          <h3 className="font-semibold text-base mb-3">留言 <span className="text-muted-foreground font-normal text-sm">({messages.length})</span></h3>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm bg-muted rounded-2xl">暂无留言</div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className="bg-card rounded-2xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-primary">{maskContact(m.contact)}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leave message (non-owner, open) */}
        {!isOwner && item.status === 'open' && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">我要留言</h3>
            <textarea
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm resize-none border border-transparent focus:border-primary transition-colors"
              rows={3}
              value={msgContent}
              onChange={e => setMsgContent(e.target.value)}
              placeholder="写下你的留言..."
            />
            <input
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary transition-colors"
              value={msgContact}
              onChange={e => setMsgContact(e.target.value)}
              placeholder="你的联系方式（必填）"
            />
            <button
              onClick={submitMsg}
              disabled={submitting || !msgContent.trim() || !msgContact.trim()}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              提交留言
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
