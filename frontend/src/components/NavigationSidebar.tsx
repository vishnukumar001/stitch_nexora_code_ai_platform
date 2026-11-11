import React from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  killSwitchActive: boolean;
}

export const NavigationSidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, killSwitchActive }) => {
  const mainNav = [
    { id: 'dashboard', label: 'Overview / Dashboard', icon: 'dashboard' },
    { id: 'ai-coding-workspace', label: 'AI Coding Workspace', icon: 'terminal' },
    { id: 'repositories', label: 'Repositories', icon: 'emoji_symbols' },
    { id: 'task-history', label: 'Task History', icon: 'history' },
  ];

  const intelNav = [
    { id: 'token-analytics', label: 'Token Analytics', icon: 'bar_chart' },
    { id: 'model-router', label: 'Model Router', icon: 'alt_route' },
    { id: 'budget-manager', label: 'Budget Manager', icon: 'account_balance_wallet' },
  ];

  const govNav = [
    { id: 'security-center', label: 'Security Center', icon: 'shield' },
    { id: 'settings', label: 'Settings & Vault', icon: 'settings' },
  ];

  const renderLink = (item: { id: string; label: string; icon: string }) => {
    const isActive = currentView === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg transition-colors text-left font-body-sm text-body-sm ${
          isActive
            ? 'bg-surface-container-high text-primary font-medium'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-lg"
          style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest z-50 flex flex-col justify-between border-r border-outline-variant/20 shadow-xl select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-space-md flex items-center justify-between bg-surface-container-lowest border-b border-surface-container-highest/40">
          <div
            className="flex items-center gap-space-sm cursor-pointer"
            onClick={() => onNavigate('landing')}
          >
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow">
              <span className="material-symbols-outlined text-xl">polyline</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-semibold leading-none">
                NEXORA
              </span>
              <span className="font-label-sm text-[10px] text-tertiary tracking-widest uppercase mt-0.5">
                CODE
              </span>
            </div>
          </div>
          <span className="font-label-sm text-label-sm uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary">
            v3.4 Pro
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="px-space-md py-space-sm overflow-y-auto max-h-[calc(100vh-180px)] space-y-space-md">
          {killSwitchActive && (
            <div className="p-2 rounded-lg bg-error-container/30 border border-error/50 text-error flex items-center gap-2 font-label-sm text-[11px] uppercase tracking-wider animate-pulse">
              <span className="material-symbols-outlined text-sm">power_settings_new</span>
              <span>KILL SWITCH ACTIVE</span>
            </div>
          )}

          <div>
            <p className="font-label-sm text-[10px] uppercase text-outline px-space-sm mb-1 tracking-wider">
              Main Workstation
            </p>
            <nav className="flex flex-col gap-0.5">{mainNav.map(renderLink)}</nav>
          </div>

          <div>
            <p className="font-label-sm text-[10px] uppercase text-outline px-space-sm mb-1 tracking-wider">
              Intelligence & Tokens
            </p>
            <nav className="flex flex-col gap-0.5">{intelNav.map(renderLink)}</nav>
          </div>

          <div>
            <p className="font-label-sm text-[10px] uppercase text-outline px-space-sm mb-1 tracking-wider">
              Governance & Safety
            </p>
            <nav className="flex flex-col gap-0.5">{govNav.map(renderLink)}</nav>
          </div>
        </div>
      </div>

      {/* User Profile & Efficiency telemetry dock */}
      <div className="p-space-md bg-surface-container-low border-t border-surface-container-highest/40">
        <div className="flex items-center justify-between mb-space-xs">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              ER
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-body-sm text-body-sm text-on-surface font-medium leading-none truncate">
                Elena Rostova
              </span>
              <span className="font-label-sm text-label-sm text-outline leading-tight mt-1 truncate">
                Principal Architect
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('landing')}
            title="Public Landing / Switch Account"
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>

        {/* Live Efficiency Bar */}
        <div className="mt-space-sm pt-space-xs">
          <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
            <span>AST Efficiency</span>
            <span className="text-tertiary font-semibold font-code-sm">94.2%</span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-tertiary to-primary w-[94.2%] transition-all duration-500"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};
