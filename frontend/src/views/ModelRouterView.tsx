import React, { useState, useEffect } from 'react';
import { Provider, fetchRouterTopology, triggerFailoverTest } from '../api';

export const ModelRouterView: React.FC = () => {
  const [topology, setTopology] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState('Balanced Production (Cost + Reasoning)');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    loadTopology();
  }, []);

  const loadTopology = async () => {
    try {
      const data = await fetchRouterTopology();
      setTopology(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateFailover = async (providerId: string = 'prov-claude') => {
    setIsSimulating(true);
    setTestMessage(null);
    try {
      const res = await triggerFailoverTest(providerId);
      setTestMessage(res.message);
      loadTopology();
    } catch (err: any) {
      alert(`Failover test failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface p-space-lg gap-space-lg">
      {/* Header Bar */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-md pb-space-xs border-b border-surface-container-highest/40">
        <div className="space-y-1.5 max-w-4xl">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high font-label-sm text-label-sm text-tertiary border border-tertiary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              ADAPTIVE CASCADE ENGINE V2.4
            </span>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Topology ID: <span className="text-on-surface font-code-sm">{topology?.topology_id || 'topo_992_prd_core'}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-xs text-primary">verified_user</span>
              Google Gemini Direct API
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
            Intelligent Model Router & Fallback Topology
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Dynamic heuristic AST classification, multi-tier routing (small vs. large models), latency/cost optimization, and automated failover circuit breakers with synthetic latency dampening.
          </p>
        </div>

        {/* Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center gap-2 px-space-sm py-1.5 rounded-lg bg-surface-container-low border border-surface-container-highest">
            <span className="font-label-sm text-label-sm text-outline uppercase">Preset:</span>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="bg-transparent text-on-surface font-code-sm text-code-sm focus:outline-none cursor-pointer"
            >
              <option value="Balanced Production (Cost + Reasoning)" className="bg-surface-container-high">Balanced Production (Cost + Reasoning)</option>
              <option value="Aggressive Token Thrift (Max Local)" className="bg-surface-container-high">Aggressive Token Thrift (Max Local)</option>
              <option value="Low-Latency Fast Path (<100ms)" className="bg-surface-container-high">Low-Latency Fast Path (&lt;100ms)</option>
              <option value="Frontier Heavy (Deep Reasoning Only)" className="bg-surface-container-high">Frontier Heavy (Deep Reasoning Only)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleSimulateFailover('prov-claude')}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-bright transition-colors font-label-sm text-label-sm border border-surface-container-highest shadow-sm"
          >
            <span className="material-symbols-outlined text-base text-tertiary">science</span>
            <span>{isSimulating ? 'Testing...' : 'Simulate Failover Test'}</span>
          </button>
        </div>
      </section>

      {testMessage && (
        <div className="p-3 rounded-xl bg-error-container/30 border border-error/40 text-error font-body-sm text-body-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">crisis_alert</span>
            <span>{testMessage}</span>
          </div>
          <button
            onClick={() => setTestMessage(null)}
            className="text-outline hover:text-on-surface font-label-sm text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Router Telemetry KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
            Active Router Efficiency
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {topology?.router_efficiency_pct || 74.8}%
            </span>
            <span className="font-label-sm text-label-sm text-tertiary flex items-center font-semibold">
              <span className="material-symbols-outlined text-xs">arrow_upward</span> +6.2%
            </span>
          </div>
          <div className="mt-3 flex justify-between font-label-sm text-label-sm text-outline border-t border-surface-container-highest/30 pt-2">
            <span>-$0.024 / query saved via Tier 0/1</span>
            <span className="text-tertiary font-code-sm font-semibold">Goal: 70%</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
            Avg Cascade Latency
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {topology?.avg_cascade_latency_ms || 148}ms
            </span>
            <span className="font-label-sm text-label-sm text-tertiary font-semibold flex items-center">
              <span className="material-symbols-outlined text-xs">bolt</span> -42%
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between font-label-sm text-label-sm text-outline border-t border-surface-container-highest/30 pt-2">
            <span>p95 Latency:</span>
            <span className="text-on-surface font-code-sm font-semibold">{topology?.p95_latency_ms || 380}ms</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
            Primary Cloud Engine
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline-lg text-headline-lg font-bold text-tertiary">Gemini 3.5 Flash</span>
          </div>
          <div className="mt-3 flex items-center justify-between font-label-sm text-label-sm text-outline border-t border-surface-container-highest/30 pt-2">
            <span>Integration Mode</span>
            <span className="text-tertiary font-semibold">Direct API (Verified Live)</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
            Circuit Breaker Topology
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">Armed</span>
          </div>
          <div className="mt-3 flex items-center justify-between font-label-sm text-label-sm text-outline border-t border-surface-container-highest/30 pt-2">
            <span>Trip Threshold: 3 errors</span>
            <span className="text-tertiary font-semibold">Self-Healing</span>
          </div>
        </div>
      </section>

      {/* Provider Cascade Topology Stack */}
      <section className="space-y-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
          Configured Cascade Hierarchy & Health Matrix
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {(topology?.providers || []).map((p: Provider) => (
            <div
              key={p.id}
              className={`p-space-md rounded-xl bg-surface-container border transition-all ${
                p.circuit_breaker_tripped
                  ? 'border-error/60 bg-error-container/10'
                  : 'border-surface-container-highest/40 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/30">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      p.circuit_breaker_tripped
                        ? 'bg-error animate-ping'
                        : p.status === 'online'
                        ? 'bg-tertiary animate-pulse'
                        : 'bg-secondary'
                    }`}
                  ></span>
                  <span className="font-headline-sm text-body-lg font-semibold text-on-surface">
                    {p.name}
                  </span>
                </div>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-tertiary font-medium">
                  {p.tier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-body-sm font-body-sm text-outline">
                <div>Model ID: <code className="text-on-surface font-code-sm">{p.model_name}</code></div>
                <div>Avg Latency: <span className="text-tertiary font-semibold font-code-sm">{p.latency_ms}ms</span></div>
                <div>Uptime: <span className="text-on-surface font-code-sm">{p.uptime_pct}%</span></div>
                <div>
                  Circuit Breaker:{' '}
                  <span className={p.circuit_breaker_tripped ? 'text-error font-bold' : 'text-tertiary'}>
                    {p.circuit_breaker_tripped ? 'TRIPPED (Failing Over)' : 'NORMAL'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-container-highest/30 font-label-sm text-label-sm">
                <span className="text-outline">
                  {p.is_local ? 'Air-Gapped: 0 USD / 0 Remote Egress' : `Rates: $${p.cost_per_m_in}/M in · $${p.cost_per_m_out}/M out`}
                </span>
                <button
                  type="button"
                  onClick={() => handleSimulateFailover(p.id)}
                  className="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-bright text-primary font-medium transition-colors"
                >
                  Test Failover
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

