import React from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  killSwitchActive: boolean;
  activeRepoName?: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export const NavigationSidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  killSwitchActive,
  activeRepoName = 'prod-core-monorepo',
  isMobileOpen = false,
  onClose,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard' },
    { id: 'new-task', label: 'New Coding Task', icon: 'add_circle' },
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'task-history', label: 'Task History', icon: 'history' },
    { id: 'usage-tokens', label: 'Usage & Tokens', icon: 'toll' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-[260px] sm:w-[250px] bg-surface-container-lowest z-50 flex flex-col justify-between border-r border-surface-container-highest/40 select-none transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-surface-container-highest/40 bg-surface-container-low/40">
            <div
              onClick={() => handleItemClick('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-xl">polyline</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base text-on-surface font-semibold tracking-tight leading-none">
                  NEXORA
                </span>
                <span className="text-[10px] text-tertiary tracking-widest font-mono uppercase mt-0.5">
                  CODE
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-outline">
                PS 01
              </span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="lg:hidden p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                  aria-label="Close navigation menu"
                  title="Close Menu"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Kill Switch Banner if active */}
          {killSwitchActive && (
            <div className="m-3 p-2.5 rounded-lg bg-error-container/30 border border-error/50 text-error flex items-center gap-2 text-xs font-semibold uppercase tracking-wider animate-pulse">
              <span className="material-symbols-outlined text-base">power_settings_new</span>
              <span>Kill Switch Engaged</span>
            </div>
          )}

          {/* Primary 6-Item Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isNewTask = item.id === 'new-task';
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : isNewTask
                      ? 'text-primary hover:bg-primary/10 font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-xl shrink-0"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isNewTask && !isActive && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono">
                      ⌘N
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: User profile & Active Project */}
        <div className="p-4 bg-surface-container-low/60 border-t border-surface-container-highest/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                TA
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-on-surface truncate">TEAM ARISE</span>
                <span className="text-[11px] text-outline truncate">{activeRepoName}</span>
              </div>
            </div>
            <button
              onClick={() => handleItemClick('landing')}
              title="Overview & Pitch"
              className="text-outline hover:text-on-surface p-1 transition-colors"
            >
              <span className="material-symbols-outlined text-base">info</span>
            </button>
          </div>

          <div className="pt-2 border-t border-surface-container-highest/30 flex items-center justify-between text-[11px] text-outline">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span>Gemini & Local Ready</span>
            </span>
            <span className="text-tertiary font-mono">v3.4</span>
          </div>
        </div>
      </aside>
    </>
  );
};
