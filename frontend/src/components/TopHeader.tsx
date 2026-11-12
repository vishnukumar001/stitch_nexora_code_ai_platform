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
    <header className="fixed top-0 left-[250px] right-0 h-16 z-40 bg-surface/80 backdrop-blur-md border-b border-surface-container-highest/40 flex items-center justify-between px-6">
      {/* Current Project Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => onNavigate('projects')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-highest/50 hover:bg-surface-container hover:border-primary/40 transition-all text-left"
          title="Switch Active Project"
        >
          <span className="material-symbols-outlined text-base text-primary">folder</span>
          <span className="text-xs font-mono font-medium text-on-surface truncate max-w-[200px]">
            {activeRepo}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-container-highest text-tertiary">
            main
          </span>
          <span className="material-symbols-outlined text-sm text-outline">unfold_more</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-outline font-mono">
          <span>•</span>
          <span className="flex items-center gap-1.5 text-tertiary">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            Token Optimizer Active
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick New Task Button */}
        <button
          onClick={() => onNavigate('new-task')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>New Task</span>
        </button>

        {/* Emergency Kill Switch Button */}
        <button
          onClick={onToggleKillSwitch}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            killSwitchActive
              ? 'bg-error text-on-error border-error animate-pulse shadow-md'
              : 'bg-surface-container-low text-error border-error/30 hover:bg-error-container/20'
          }`}
          title="Emergency Kill Switch: Instantly freeze all agent executions"
        >
          <span className="material-symbols-outlined text-sm">power_settings_new</span>
          <span>{killSwitchActive ? 'HALTED' : 'Kill Switch'}</span>
        </button>

        {/* Pending Approvals Bell */}
        <button
          onClick={() => onNavigate('task-history')}
          className="relative p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          title={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : 'Task notifications'}
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {pendingApprovalsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        {/* Settings Shortcut */}
        <button
          onClick={() => onNavigate('settings')}
          className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          title="Settings & Providers"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </div>
    </header>
  );
};
