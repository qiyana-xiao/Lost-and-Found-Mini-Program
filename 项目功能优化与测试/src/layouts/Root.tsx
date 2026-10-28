import { Outlet, useNavigate, useLocation } from 'react-router';

const NAV = [
  { path: '/', label: '首页', icon: (active: boolean) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { path: '/search', label: '搜索', icon: (active: boolean) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )},
  { path: '/mine', label: '我的', icon: (active: boolean) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )},
];

export function Root() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative" style={{ background: 'var(--background)' }}>
      {/* App content */}
      <div className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-50">
        <div className="flex">
          {NAV.map(item => {
            const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => nav(item.path)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {item.icon(active)}
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
