import React, { useState, useEffect } from 'react';
import { TaskRecord, Provider, fetchTasks, fetchSettings, addVaultSecret } from '../api';

interface SettingsProps {
  providers: Provider[];
  onRefreshProviders: () => void;
  onInspectTask: (task: TaskRecord) => void;
}

export const SettingsView: React.FC<SettingsProps> = ({
  providers,
  onRefreshProviders,
  onInspectTask,
}) => {
  const [activeTab, setActiveTab] = useState<'runs' | 'vault' | 'ast' | 'runtime'>('runs');
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('prov-claude');
  const [secretKey, setSecretKey] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [tList, sData] = await Promise.all([fetchTasks(), fetchSettings()]);
      setTasks(tList);
      setSettings(sData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportJSONL = () => {
    const jsonlContent = tasks.map((t) => JSON.stringify(t)).join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora_task_history_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveVaultSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey) return;
    try {
      const res = await addVaultSecret(selectedProviderId, secretKey);
      setShowVaultModal(false);
      setSecretKey('');
      setToastMessage(res.message);
      onRefreshProviders();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(`Failed to seal key: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface p-space-lg gap-space-lg">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pb-space-sm border-b border-surface-container-highest/40">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-space-sm mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-tertiary uppercase tracking-wider border border-tertiary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              AUDIT LOG: IMMUTABLE ED25519
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-secondary uppercase tracking-wider">
              SANDBOX: DOCKER RUNTIME V2.4
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-outline">
              <span className="material-symbols-outlined text-xs">verified_user</span>
              HSM SIGNED
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
            Task History & Orchestrator Settings
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Granular deterministic run records, multi-model execution traces, LLM secrets vault, and AST compiler context-pruning engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            onClick={handleExportJSONL}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md border border-surface-container-highest shadow-sm"
          >
            <span className="material-symbols-outlined text-base text-tertiary">download</span>
            <span>Export History (JSONL)</span>
          </button>
          <button
            onClick={() => setShowVaultModal(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded bg-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-90 transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-base">vpn_key</span>
            <span>+ Add LLM Vault Secret</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-body-sm text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Segmented View Tabs */}
      <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-surface-container-highest/40 overflow-x-auto w-fit">
        <button
          onClick={() => setActiveTab('runs')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
            activeTab === 'runs'
              ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">history_edu</span>
          <span>Task Runs ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
            activeTab === 'vault'
              ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">vpn_key</span>
          <span>Provider API Keys & Vault</span>
        </button>

        <button
          onClick={() => setActiveTab('ast')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
            activeTab === 'ast'
              ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">account_tree</span>
          <span>Custom AST & Pruning Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('runtime')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
            activeTab === 'runtime'
              ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">security</span>
          <span>Agent Runtime & Sandbox Limits</span>
        </button>
      </div>

      {/* TAB 1: RUNS */}
      {activeTab === 'runs' && (
        <div className="rounded-xl bg-surface-container p-space-md border border-surface-container-highest/40 space-y-space-md">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Agent Execution Traces & Receipts
          </h3>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse font-body-sm text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-2.5 px-3 rounded-l">Task ID & Goal</th>
                  <th className="py-2.5 px-3">Model Chain</th>
                  <th className="py-2.5 px-3">Compaction</th>
                  <th className="py-2.5 px-3">Cost Billed / Saved</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right rounded-r">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-surface-container-high/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex flex-col min-w-0">
                        <span className="font-code-sm text-code-sm font-semibold text-on-surface truncate">
                          {task.title}
                        </span>
                        <span className="font-code-sm text-xs text-outline">{task.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-code-sm text-code-sm text-on-surface-variant">
                      {task.cascade_chain?.join(' ➔ ') || task.model_used}
                    </td>
                    <td className="py-3 px-3 font-code-sm text-code-sm">
                      <span className="text-on-surface">{task.tokens_compressed} tok</span>
                      <span className="text-tertiary text-xs ml-1 font-semibold">
                        (-{task.compression_ratio}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 font-code-sm text-code-sm">
                      <span className="text-on-surface">${task.cost_billed_usd.toFixed(3)}</span>
                      <span className="text-primary text-xs ml-1 font-medium">
                        (+${task.cost_saved_usd.toFixed(3)} saved)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[11px] font-semibold ${
                          task.status === 'completed'
                            ? 'bg-tertiary-container/30 text-tertiary'
                            : task.status === 'pending_approval'
                            ? 'bg-surface-container-high text-primary'
                            : 'bg-error-container/30 text-error'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onInspectTask(task)}
                        className="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-bright text-primary font-label-sm text-label-sm transition-colors"
                      >
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VAULT */}
      {activeTab === 'vault' && (
        <div className="space-y-space-md">
          <div className="p-space-md rounded-xl bg-surface-container border border-surface-container-highest/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">vpn_key</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-body-lg font-semibold text-on-surface">
                  Hardware KMS Enclave Vault
                </h3>
                <p className="font-body-sm text-body-sm text-outline">
                  Zero-trust isolated hardware encryption for remote AI provider API keys
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 font-label-sm text-label-sm border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Enclave Operational
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/30">
                  <span className="font-body-md text-body-md font-semibold text-on-surface">{p.name}</span>
                  <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary">
                    {p.is_local ? 'LOCAL' : 'REMOTE'}
                  </span>
                </div>

                <div className="space-y-1 font-body-sm text-body-sm text-outline">
                  <div>Model: <span className="text-on-surface font-code-sm">{p.model_name}</span></div>
                  <div>Endpoint: <span className="text-on-surface font-code-sm truncate">{p.endpoint_url || 'Internal IPC'}</span></div>
                  <div>Status: <span className="text-tertiary font-semibold">{p.has_api_key ? '✓ Sealed & Active' : 'Unconfigured'}</span></div>
                </div>

                <button
                  onClick={() => {
                    setSelectedProviderId(p.id);
                    setShowVaultModal(true);
                  }}
                  className="w-full py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors border border-surface-container-highest"
                >
                  Update Secret Key
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AST PRUNING RULES */}
      {activeTab === 'ast' && (
        <div className="rounded-xl bg-surface-container p-space-md border border-surface-container-highest/40 space-y-space-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              AST Context-Pruning Rules Matrix
            </h3>
            <p className="font-body-sm text-body-sm text-outline">
              Heuristic semantic graph compaction rules executed during pre-flight prompt construction
            </p>
          </div>

          <div className="space-y-2">
            {(settings?.ast_pruning_rules || []).map((rule: any) => (
              <div
                key={rule.id}
                className="p-3.5 rounded-lg bg-surface-container-low border border-surface-container-highest/40 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary text-lg">account_tree</span>
                  <div>
                    <span className="font-body-md text-body-md font-semibold text-on-surface block">
                      {rule.name}
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      Reduces context tokens by approx {rule.reduction_pct}%
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-semibold">
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RUNTIME LIMITS */}
      {activeTab === 'runtime' && (
        <div className="rounded-xl bg-surface-container p-space-md border border-surface-container-highest/40 space-y-space-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Agent Runtime Sandbox & Resource Caps
            </h3>
            <p className="font-body-sm text-body-sm text-outline">
              Containment boundaries for agent execution loops and test harnesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md font-body-sm text-body-sm">
            <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container-highest/40">
              <span className="font-label-sm text-label-sm text-outline uppercase block mb-1">Sandbox CPU Cap</span>
              <span className="font-headline-sm text-body-lg font-bold text-on-surface">2 Dedicated Cores</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container-highest/40">
              <span className="font-label-sm text-label-sm text-outline uppercase block mb-1">Sandbox Memory Cap</span>
              <span className="font-headline-sm text-body-lg font-bold text-on-surface">512 MB Isolated RAM</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container-highest/40">
              <span className="font-label-sm text-label-sm text-outline uppercase block mb-1">Max Mutation Diff Size</span>
              <span className="font-headline-sm text-body-lg font-bold text-on-surface">256 KB per patch</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container-highest/40">
              <span className="font-label-sm text-label-sm text-outline uppercase block mb-1">Shell Execution Timeout</span>
              <span className="font-headline-sm text-body-lg font-bold text-on-surface">30 Seconds Hard Kill</span>
            </div>
          </div>
        </div>
      )}

      {/* Add LLM Vault Secret Modal */}
      {showVaultModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-xl bg-surface-container-low border border-outline-variant/50 shadow-2xl p-space-lg space-y-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-highest/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">vpn_key</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Add LLM Provider & Vault Secret
                </h3>
              </div>
              <button onClick={() => setShowVaultModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveVaultSecret} className="space-y-space-md">
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                  Select Provider
                </label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface-container-high">
                      {p.name} ({p.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                  API Key or Secret Token
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="sk-ant-... or sk-proj-..."
                  required
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm focus:outline-none focus:border-primary"
                />
                <span className="font-label-sm text-[11px] text-outline mt-1 block">
                  Keys are stored exclusively in the backend database. Never exposed in frontend bundles.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-highest/40">
                <button
                  type="button"
                  onClick={() => setShowVaultModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-all font-label-md shadow"
                >
                  Seal in Enclave Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
