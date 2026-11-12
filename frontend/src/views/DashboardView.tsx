import React from 'react';
import { KPIStats, Provider, TaskRecord } from '../api';

interface DashboardProps {
  stats: KPIStats | null;
  providers: Provider[];
  recentActivities: TaskRecord[];
  activeRepoName: string;
  onNavigate: (view: string) => void;
  onInspectTask: (task: TaskRecord) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  stats,
  providers,
  recentActivities,
  activeRepoName,
  onNavigate,
  onInspectTask,
}) => {
  // Provider summary
  const onlineCount = providers.filter((p) => p.status === 'online').length;
  const localProvider = providers.find((p) => p.is_local);

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-6 md:p-8 space-y-8 text-on-surface">
      {/* 1. WELCOME & ACTION COCKPIT */}
      <div className="rounded-2xl bg-surface-container-low p-6 md:p-8 border border-surface-container-highest/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="text-xs font-mono uppercase tracking-wider text-tertiary font-semibold">
              PS 01: Token-Efficient AI Coding Agent
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-on-surface tracking-tight">
            Welcome back, Elena
          </h1>

          <p className="text-sm text-outline max-w-xl">
            NEXORA Code completes software engineering tasks reliably while minimizing unnecessary LLM token consumption.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-outline">Current Project:</span>
            <button
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high border border-surface-container-highest/60 text-xs font-mono text-primary hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">folder</span>
              <span>{activeRepoName}</span>
              <span className="text-outline">/ main</span>
            </button>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onNavigate('new-task')}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-95 active:scale-[0.99] shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-xl">add_circle</span>
            <span>New Coding Task</span>
          </button>
        </div>
      </div>

      {/* 2. THREE ESSENTIAL METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Today's Token Usage */}
        <div
          onClick={() => onNavigate('usage-tokens')}
          className="rounded-xl bg-surface-container-low p-5 border border-surface-container-highest/40 hover:border-tertiary/40 transition-all cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-outline">Today's Token Usage</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">toll</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-on-surface">
              {stats?.tokens_consumed ?? '14.8k'}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-medium text-tertiary font-mono bg-tertiary/10 px-1.5 py-0.5 rounded">
                {stats?.token_savings_pct ?? 76.1}% Tokens Saved
              </span>
              <span className="text-xs text-outline">via AST Slicing</span>
            </div>
          </div>
          <p className="text-xs text-outline pt-1 border-t border-surface-container-highest/30">
            Raw context is pruned before sending to remote models.
          </p>
        </div>

        {/* Card 2: Budget Usage */}
        <div
          onClick={() => onNavigate('usage-tokens')}
          className="rounded-xl bg-surface-container-low p-5 border border-surface-container-highest/40 hover:border-primary/40 transition-all cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-outline">Budget & Spending</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-on-surface">
              ${stats?.current_spend_usd?.toFixed(2) ?? '4.82'}
              <span className="text-sm font-normal text-outline"> / ${stats?.budget_cap_usd ?? '50.00'}</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, stats?.spend_pct ?? 9.6)}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-outline pt-1 border-t border-surface-container-highest/30">
            <span className="text-tertiary font-mono">Pacing: Healthy</span>
            <span>Pre-flight limits armed</span>
          </div>
        </div>

        {/* Card 3: Provider Connection Status */}
        <div
          onClick={() => onNavigate('settings')}
          className="rounded-xl bg-surface-container-low p-5 border border-surface-container-highest/40 hover:border-secondary/40 transition-all cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-outline">AI Providers & Routing</span>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">hub</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span>Bifrost AI Gateway</span>
              </span>
              <span className="font-mono text-tertiary font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>Claude + DeepSeek Failover</span>
              </span>
              <span className="font-mono text-primary font-medium">{onlineCount} Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-outline"></span>
                <span>Local Air-Gap Model</span>
              </span>
              <span className="font-mono text-outline">{localProvider ? 'Ollama Ready' : 'Standby'}</span>
            </div>
          </div>
          <div className="text-xs text-outline pt-1 border-t border-surface-container-highest/30 flex items-center justify-between">
            <span>Automatic Failover</span>
            <span className="text-tertiary">Enabled</span>
          </div>
        </div>
      </div>

      {/* 3. RECENT CODING TASKS */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-highest/40 overflow-hidden shadow-sm space-y-0">
        <div className="p-5 flex items-center justify-between border-b border-surface-container-highest/40">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Recent Coding Tasks</h2>
            <p className="text-xs text-outline">Tasks executed with AST token optimization and action approval gates.</p>
          </div>
          <button
            onClick={() => onNavigate('task-history')}
            className="text-xs text-primary hover:underline font-medium"
          >
            View All ({recentActivities.length}) →
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-outline">history</span>
            <p className="text-sm text-outline">No coding tasks have been run yet.</p>
            <button
              onClick={() => onNavigate('new-task')}
              className="text-xs text-primary underline"
            >
              Start your first task
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container text-outline font-mono uppercase tracking-wider border-b border-surface-container-highest/40">
                  <th className="py-3 px-5">Task Description</th>
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-4">Tokens Saved</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/30">
                {recentActivities.slice(0, 5).map((task) => (
                  <tr key={task.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-on-surface truncate max-w-md">
                          {task.title}
                        </span>
                        <span className="text-[11px] font-mono text-outline truncate max-w-sm">
                          {task.diffs?.[0]?.filename || 'Target file'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-outline">
                      {task.branch}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-tertiary">
                      {(task.tokens_saved / 1000).toFixed(1)}k saved
                      <span className="text-[10px] text-outline ml-1">({task.compression_ratio}%)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-on-surface">
                      ${task.cost_billed_usd.toFixed(3)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          task.status === 'completed'
                            ? 'bg-tertiary/15 text-tertiary'
                            : task.status === 'pending_approval'
                            ? 'bg-secondary/20 text-secondary'
                            : 'bg-error-container/30 text-error'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {task.status === 'completed' ? 'check' : 'hourglass_top'}
                        </span>
                        <span>{task.status === 'completed' ? 'Approved & Merged' : 'Pending Review'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => onInspectTask(task)}
                        className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-primary font-medium text-xs transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
