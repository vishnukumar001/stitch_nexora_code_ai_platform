import React from 'react';

interface HeaderProps {
  onNavigate: (view: string) => void;
  pendingApprovalsCount: number;
  killSwitchActive: boolean;
  onToggleKillSwitch: () => void;
  activeRepo: string;
  onToggleMobileMenu?: () => void;
}

export const TopHeader: React.FC<HeaderProps> = ({
  onNavigate,
  pendingApprovalsCount,
  killSwitchActive,
  onToggleKillSwitch,
  activeRepo,
  onToggleMobileMenu,
}) => {
  return (
    <header className="fixed top-0 left-0 lg:left-[250px] right-0 h-16 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-container-highest/40 flex items-center justify-between px-3 sm:px-6">
      {/* Current Project Selector & Mobile Menu */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 -ml-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0 flex items-center justify-center"
          aria-label="Open navigation menu"
          title="Open Menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <button
          onClick={() => onNavigate('projects')}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-highest/50 hover:bg-surface-container hover:border-primary/40 transition-all text-left min-w-0"
          title="Switch Active Project"
        >
          <span className="material-symbols-outlined text-base text-primary shrink-0">folder</span>
          <span className="text-xs font-mono font-medium text-on-surface truncate max-w-[100px] sm:max-w-[200px]">
            {activeRepo}
          </span>
          <span className="hidden xs:inline-block text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-container-highest text-tertiary shrink-0">
            main
          </span>
          <span className="material-symbols-outlined text-sm text-outline shrink-0">unfold_more</span>
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-outline font-mono">
          <span>•</span>
          <span className="flex items-center gap-1.5 text-tertiary">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            Token Optimizer Active
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Gemini API Key Armed Status / Shortcut */}
        <button
          onClick={() => onNavigate('settings')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium hover:bg-emerald-500/20 transition-all shrink-0"
          title="Google Gemini 3.1 Flash Lite API Key is Armed (Click to view Vault)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Gemini Key Armed</span>
        </button>

        {/* Quick New Task Button */}
        <button
          onClick={() => onNavigate('new-task')}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 shadow-sm transition-all shrink-0"
          title="Create New Coding Task"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden sm:inline">New Task</span>
          <span className="sm:hidden">Task</span>
        </button>

        {/* Emergency Kill Switch Button */}
        <button
          onClick={onToggleKillSwitch}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
            killSwitchActive
              ? 'bg-error text-on-error border-error animate-pulse shadow-md'
              : 'bg-surface-container-low text-error border-error/30 hover:bg-error-container/20'
          }`}
          title="Emergency Kill Switch: Instantly freeze all agent executions"
        >
          <span className="material-symbols-outlined text-sm">power_settings_new</span>
          <span className="hidden sm:inline">{killSwitchActive ? 'HALTED' : 'Kill Switch'}</span>
          <span className="sm:hidden">{killSwitchActive ? 'HALT' : 'Kill'}</span>
        </button>

        {/* Pending Approvals Bell */}
        <button
          onClick={() => onNavigate('task-history')}
          className="relative p-1.5 sm:p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          title={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : 'Task notifications'}
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {pendingApprovalsCount > 0 && (
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        {/* Settings Shortcut */}
        <button
          onClick={() => onNavigate('settings')}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          title="Settings & Providers"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </div>
    </header>
  );
};
