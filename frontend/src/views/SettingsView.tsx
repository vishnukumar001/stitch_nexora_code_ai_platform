import React, { useState } from 'react';
import { Provider, triggerFailoverTest, toggleKillSwitch, addVaultSecret } from '../api';

interface SettingsProps {
  providers: Provider[];
  onRefreshProviders: () => void;
  killSwitchActive: boolean;
  onToggleKillSwitch: () => void;
}

export const SettingsView: React.FC<SettingsProps> = ({
  providers,
  onRefreshProviders,
  killSwitchActive,
  onToggleKillSwitch,
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'security' | 'vault'>('providers');
  const [failoverMsg, setFailoverMsg] = useState<string | null>(null);
  const [isTestingFailover, setIsTestingFailover] = useState(false);

  // Vault form
  const [selectedProvId, setSelectedProvId] = useState(providers[0]?.id || 'prov-claude');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [vaultMsg, setVaultMsg] = useState<string | null>(null);

  const handleTestFailover = async () => {
    setIsTestingFailover(true);
    setFailoverMsg(null);
    try {
      const res = await triggerFailoverTest('prov-claude');
      setFailoverMsg(res.message);
      onRefreshProviders();
    } catch (e: any) {
      alert(`Failover test failed: ${e.message}`);
    } finally {
      setIsTestingFailover(false);
    }
  };

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    try {
      const res = await addVaultSecret(selectedProvId, apiKeyInput);
      setVaultMsg(res.message);
      setApiKeyInput('');
      onRefreshProviders();
    } catch (e: any) {
      alert(`Failed to save key: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto p-6 md:p-8 space-y-6 text-on-surface">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">Platform Settings</h1>
        <p className="text-sm text-outline mt-1">
          Manage AI providers, automatic failover, security approvals, and encrypted credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container-highest/40 pb-1">
        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'providers'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-outline hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-sm">hub</span>
          <span>AI Providers & Failover</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'security'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-outline hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-sm">shield</span>
          <span>Security & Kill Switch</span>
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'vault'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-outline hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-sm">key</span>
          <span>API Keys Vault</span>
        </button>
      </div>

      {/* TAB 1: AI Providers & Failover */}
      {activeTab === 'providers' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Connected AI Providers</h2>
              <p className="text-xs text-outline">
                Configured with Bifrost by Maxim AI and local Ollama air-gap support.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/router/check-connectivity', { method: 'POST' });
                    onRefreshProviders();
                  } catch (e: any) {
                    alert(`Probe error: ${e.message}`);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-container-highest text-xs font-medium text-on-surface hover:bg-surface-bright transition-colors"
                title="Perform safe network probe on all configured endpoints"
              >
                <span className="material-symbols-outlined text-sm">wifi_find</span>
                <span>Probe Connectivity</span>
              </button>

              <button
                onClick={handleTestFailover}
                disabled={isTestingFailover}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-container-highest text-xs font-medium text-tertiary hover:bg-surface-bright transition-colors"
              >
                <span className="material-symbols-outlined text-sm">alt_route</span>
                <span>{isTestingFailover ? 'Simulating...' : 'Simulate Failover Test'}</span>
              </button>
            </div>
          </div>

          {failoverMsg && (
            <div className="p-3 rounded-lg bg-tertiary/15 border border-tertiary/30 text-tertiary text-xs font-mono">
              {failoverMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.status === 'online' ? 'bg-tertiary animate-pulse' : 'bg-outline'
                      }`}
                    ></span>
                    <span className="text-sm font-semibold text-on-surface">{p.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-medium ${
                      p.status === 'connected' || p.status === 'online'
                        ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                        : p.status === 'degraded'
                        ? 'bg-secondary/20 text-secondary border border-secondary/30'
                        : p.status === 'disconnected'
                        ? 'bg-error-container/30 text-error border border-error/30'
                        : 'bg-surface-container text-outline border border-surface-container-highest/60'
                    }`}
                  >
                    {p.is_local && (p.status === 'connected' || p.status === 'online')
                      ? 'Local Air-Gap'
                      : p.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="text-xs font-mono text-outline space-y-1 pt-1 border-t border-surface-container-highest/30">
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="text-on-surface">{p.model_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tier:</span>
                    <span className="text-on-surface">{p.tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span className="text-tertiary">{p.latency_ms}ms p95</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Circuit Breaker:</span>
                    <span className={p.circuit_breaker_tripped ? 'text-error font-bold' : 'text-on-surface'}>
                      {p.circuit_breaker_tripped ? 'TRIPPED (Failover Active)' : 'Healthy'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Security & Kill Switch */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Emergency Kill Switch Banner */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-highest/40 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-on-surface">Emergency Kill Switch</h2>
                <p className="text-xs text-outline mt-1 max-w-xl">
                  Instantly freezes all in-flight AI coding agent tasks, blocks file mutations, and prevents any shell commands or Git commits from executing.
                </p>
              </div>

              <button
                onClick={onToggleKillSwitch}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
                  killSwitchActive
                    ? 'bg-error text-on-error animate-pulse shadow-md'
                    : 'bg-error-container/30 hover:bg-error-container/50 text-error border border-error/40'
                }`}
              >
                <span className="material-symbols-outlined text-base">power_settings_new</span>
                <span>{killSwitchActive ? 'DISENGAGE KILL SWITCH' : 'ENGAGE KILL SWITCH'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-surface-container-highest/30 flex items-center gap-2 text-xs font-mono">
              <span className="text-outline">Status:</span>
              <span className={killSwitchActive ? 'text-error font-bold' : 'text-tertiary'}>
                {killSwitchActive ? 'LOCKED — All agent runs blocked' : 'READY — Guardrails armed'}
              </span>
            </div>
          </div>

          {/* Action Approval Guardrails */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-highest/40 space-y-4">
            <h2 className="text-base font-semibold text-on-surface">Action Approval Guardrails (Mandatory)</h2>
            <p className="text-xs text-outline">
              Per Hackathon PS 01 challenge requirements, the following actions can never be executed autonomously by an AI model:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-on-surface">
                  <span className="material-symbols-outlined text-sm text-tertiary">check_circle</span>
                  <span>Writing or modifying repository files</span>
                </div>
                <span className="text-tertiary font-mono uppercase text-[10px]">Strict Approval Required</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-on-surface">
                  <span className="material-symbols-outlined text-sm text-tertiary">check_circle</span>
                  <span>Executing terminal / shell commands</span>
                </div>
                <span className="text-tertiary font-mono uppercase text-[10px]">Strict Approval Required</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-on-surface">
                  <span className="material-symbols-outlined text-sm text-tertiary">check_circle</span>
                  <span>Performing Git commits or push operations</span>
                </div>
                <span className="text-tertiary font-mono uppercase text-[10px]">Strict Approval Required</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: API Keys & Secrets Vault */}
      {activeTab === 'vault' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-highest/40 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Server-Side Credentials Vault</h2>
              <p className="text-xs text-outline mt-1">
                API keys and tokens are stored encrypted on the backend. They are never sent to the browser client.
              </p>
            </div>

            {vaultMsg && (
              <div className="p-3 rounded-lg bg-tertiary/15 border border-tertiary/30 text-tertiary text-xs font-mono">
                {vaultMsg}
              </div>
            )}

            <form onSubmit={handleSaveSecret} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-outline">Target Provider</label>
                <select
                  value={selectedProvId}
                  onChange={(e) => setSelectedProvId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-surface-container border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface-container-high">
                      {p.name} ({p.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-outline">API Key or Gateway Token</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-... or bifrost-token-..."
                  className="w-full p-2.5 rounded-lg bg-surface-container border border-surface-container-highest text-xs text-on-surface font-mono placeholder:text-outline focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
              >
                Save Credential to Vault
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
