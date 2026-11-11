import React from 'react';

interface HeaderProps {
  onNavigate: (view: string) => void;
  pendingApprovalsCount: number;
  killSwitchActive: boolean;
  onToggleKillSwitch: () => void;
  activeRepo: string;
}

export const TopHeader: React.FC<HeaderProps> = ({
  onNavigate,
  pendingApprovalsCount,
  killSwitchActive,
  onToggleKillSwitch,
  activeRepo,
}) => {
  return (
    <header className="fixed top-0 left-[260px] right-0 h-16 z-40 bg-surface/80 backdrop-blur-xl border-b border-surface-container-highest/40">
      <div className="h-16 w-full px-space-lg flex items-center justify-between gap-space-md">
        {/* Left Status Strip */}
        <div className="flex items-center gap-space-md min-w-0">
          <div
            onClick={() => onNavigate('repositories')}
            className="flex items-center gap-2 px-space-sm py-1 rounded bg-surface-container-low border border-surface-container-highest/50 cursor-pointer hover:bg-surface-container transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-code-sm text-code-sm text-on-surface truncate">
              {activeRepo} / main
            </span>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              expand_more
            </span>
          </div>

          <div
            onClick={() => onNavigate('model-router')}
            className="hidden xl:flex items-center gap-2 px-space-sm py-1 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant cursor-pointer hover:bg-surface-container"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>Claude 3.7 + DeepSeek V3 (142ms)</span>
          </div>

          <div
            onClick={() => onNavigate('token-analytics')}
            className="hidden 2xl:flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-low font-label-sm text-label-sm text-tertiary cursor-pointer hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>4.2M saved (68%)</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-space-md">
          {/* Emergency Kill Switch Button */}
          <button
            onClick={onToggleKillSwitch}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-all shadow-sm ${
              killSwitchActive
                ? 'bg-error text-on-error animate-pulse'
                : 'bg-error-container/30 hover:bg-error-container/50 text-error border border-error/30'
            }`}
            title="Emergency Kill Switch — Instantly halt all running agent operations"
          >
            <span className="material-symbols-outlined text-sm">power_settings_new</span>
            <span className="hidden sm:inline">
              {killSwitchActive ? 'ENGAGED' : 'Kill Switch'}
            </span>
          </button>

          {/* Command Palette Mock Input */}
          <div
            onClick={() => onNavigate('ai-coding-workspace')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant w-44 lg:w-60 border border-surface-container-highest/40 cursor-pointer hover:border-primary/40 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-outline">search</span>
            <span className="font-body-sm text-body-sm text-outline flex-1 truncate">
              Run Agent Task...
            </span>
            <kbd className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-outline">
              ⌘K
            </kbd>
          </div>

          {/* Pending Approvals Bell */}
          <button
            onClick={() => onNavigate('security-center')}
            className="relative p-2 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            title="Security Action Approvals"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-space-md font-body-sm text-body-sm">
            <button
              onClick={() => onNavigate('landing')}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Overview
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Vault
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
