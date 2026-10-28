import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { db } from '../lib/db';
import type { ItemType } from '../lib/types';
import { CATEGORIES } from '../lib/types';

const CATS = CATEGORIES.filter(c => c !== '全部');

export function Publish() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('id');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    type: 'lost' as ItemType,
    title: '',
    category: '',
    location: '',
    lostTime: new Date().toISOString().slice(0, 10),
    description: '',
    contact: '',
    images: [] as string[],
  });

  // Load for edit mode
  useEffect(() => {
    if (!editId) return;
    const item = db.getDetail(editId);
    if (!item) return;
    setForm({
      type: item.type,
      title: item.title,
      category: item.category,
      location: item.location,
      lostTime: item.lostTime,
      description: item.description,
      contact: item.contact,
      images: item.images,
    });
  }, [editId]);

  // Draft autosave
  useEffect(() => {
    if (editId) return;
    const draft = localStorage.getItem('lf_draft');
    if (draft) {
      try { setForm(JSON.parse(draft)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!editId) localStorage.setItem('lf_draft', JSON.stringify(form));
  }, [form, editId]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.title.trim()) return '请填写标题';
    if (!form.category) return '请选择分类';
    if (!form.location.trim()) return '请填写地点';
    if (!form.contact.trim()) return '请填写联系方式';
    return '';
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      if (editId) {
        db.updateItem(editId, form);
      } else {
        db.addItem(form);
        localStorage.removeItem('lf_draft');
      }
      nav(-1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '发布失败');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "w-full bg-muted border border-transparent focus:border-primary rounded-xl px-4 py-3 text-sm transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-semibold text-base flex-1">{editId ? '编辑信息' : '发布信息'}</h1>
        <button
          onClick={submit}
          disabled={saving}
          className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-full disabled:opacity-50 transition-opacity"
        >
          {saving ? '发布中...' : '发布'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Type toggle */}
        <div className="flex gap-2">
          {(['lost', 'found'] as ItemType[]).map(t => (
            <button
              key={t}
              onClick={() => set('type', t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.type === t
                ? t === 'lost' ? 'border-red-500 bg-red-50 text-red-600' : 'border-green-500 bg-green-50 text-green-600'
                : 'border-border text-muted-foreground bg-card'
              }`}
            >
              {t === 'lost' ? '😢 我丢了东西' : '😊 我捡到东西'}
            </button>
          ))}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">标题 <span className="text-red-500">*</span></label>
          <input
            className={fieldClass}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder={form.type === 'lost' ? '例：蓝色双肩包一个' : '例：捡到学生证一张'}
            maxLength={30}
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">分类 <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => set('category', c)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.category === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground bg-card'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">地点 <span className="text-red-500">*</span></label>
          <input className={fieldClass} value={form.location} onChange={e => set('location', e.target.value)} placeholder="例：图书馆三楼、食堂门口" />
        </div>

        {/* Time */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">时间</label>
          <input type="date" className={fieldClass} value={form.lostTime} onChange={e => set('lostTime', e.target.value)} />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">详细描述</label>
          <textarea
            className={`${fieldClass} resize-none`}
            rows={4}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="描述物品特征，提高找到的可能性..."
            maxLength={200}
          />
        </div>

        {/* Contact */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">联系方式 <span className="text-red-500">*</span></label>
          <input
            className={fieldClass}
            value={form.contact}
            onChange={e => set('contact', e.target.value)}
            placeholder="手机号或微信号"
          />
          <p className="text-xs text-muted-foreground mt-1">展示时会进行脱敏处理</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Draft hint */}
        {!editId && (
          <p className="text-xs text-center text-muted-foreground">草稿已自动保存</p>
        )}
      </div>
    </div>
  );
}
