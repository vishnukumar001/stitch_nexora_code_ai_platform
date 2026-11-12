import React, { useState } from 'react';
import { TaskRecord } from '../api';

interface TaskHistoryProps {
  tasks: TaskRecord[];
  onInspectTask: (task: TaskRecord) => void;
  onNavigate: (view: string) => void;
}

export const TaskHistoryView: React.FC<TaskHistoryProps> = ({
  tasks,
  onInspectTask,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending_approval' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [inspectModalTask, setInspectModalTask] = useState<TaskRecord | null>(null);

  const filtered = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.branch.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleExportJSONL = () => {
    const jsonl = tasks.map((t) => JSON.stringify(t)).join('\n');
    const blob = new Blob([jsonl], { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora-tasks-audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-6 md:p-8 space-y-6 text-on-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Task History & Audit</h1>
          <p className="text-sm text-outline mt-1">
            Complete record of agent tasks, AST token reductions, and action approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJSONL}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-highest/60 text-xs text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export JSONL</span>
          </button>

          <button
            onClick={() => onNavigate('new-task')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-low p-3 rounded-xl border border-surface-container-highest/40">
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg">
          {(['all', 'completed', 'pending_approval', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-surface-container-high text-on-surface shadow-sm'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {s === 'all'
                ? 'All Tasks'
                : s === 'completed'
                ? 'Approved'
                : s === 'pending_approval'
                ? 'Pending Review'
                : 'Rejected'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined text-sm text-outline absolute left-3 top-2.5">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or branch..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container border border-surface-container-highest/60 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Tasks Table */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-highest/40 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-outline text-xs">
            No tasks found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container text-outline font-mono uppercase tracking-wider border-b border-surface-container-highest/40">
                  <th className="py-3 px-5">Task Details</th>
                  <th className="py-3 px-4">Repository & Branch</th>
                  <th className="py-3 px-4">Model Used</th>
                  <th className="py-3 px-4">Tokens (Saved)</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/30">
                {filtered.map((task) => (
                  <tr key={task.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-on-surface truncate max-w-sm">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-outline truncate max-w-xs">
                          {task.diffs?.[0]?.filename || 'Modified files'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-outline">
                      {task.branch}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-outline">
                      {task.model_used}
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
                        <span>{task.status === 'completed' ? 'Approved' : 'Pending Review'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setInspectModalTask(task)}
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

      {/* Inspect Modal Flyout */}
      {inspectModalTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-surface-container-highest/60 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-5 bg-surface-container border-b border-surface-container-highest/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-tertiary">Task Inspection</span>
                <h3 className="text-base font-bold text-on-surface">{inspectModalTask.title}</h3>
              </div>
              <button
                onClick={() => setInspectModalTask(null)}
                className="text-outline hover:text-on-surface p-1 rounded hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-surface-container text-on-surface-variant space-y-1">
                <span className="text-outline uppercase text-[10px] font-mono">Solution Summary</span>
                <p className="leading-relaxed">{inspectModalTask.solution_summary}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-surface-container">
                  <div className="text-outline text-[10px]">Tokens Compressed</div>
                  <div className="text-sm font-bold text-on-surface">{inspectModalTask.tokens_compressed}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-container">
                  <div className="text-outline text-[10px]">Tokens Saved</div>
                  <div className="text-sm font-bold text-tertiary">{inspectModalTask.tokens_saved}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-container">
                  <div className="text-outline text-[10px]">Cost Billed</div>
                  <div className="text-sm font-bold text-primary">${inspectModalTask.cost_billed_usd.toFixed(3)}</div>
                </div>
              </div>

              {inspectModalTask.diffs?.[0] && (
                <div className="space-y-1.5 font-mono">
                  <span className="text-outline uppercase text-[10px]">Code Patch Diff</span>
                  <pre className="p-3 rounded-lg bg-[#0b0e14] text-on-surface overflow-x-auto leading-relaxed border border-surface-container-highest/30">
                    <code>{inspectModalTask.diffs[0].diff_text}</code>
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-container border-t border-surface-container-highest/40 flex justify-end gap-3">
              <button
                onClick={() => {
                  onInspectTask(inspectModalTask);
                  setInspectModalTask(null);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:opacity-90"
              >
                Open in Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
