import React, { useState, useEffect } from 'react';
import { ActionApproval, fetchApprovals, resolveApproval, fetchSecurityStatus, toggleKillSwitch } from '../api';

interface SecurityCenterProps {
  killSwitchActive: boolean;
  onToggleKillSwitch: () => void;
}

export const SecurityCenterView: React.FC<SecurityCenterProps> = ({
  killSwitchActive,
  onToggleKillSwitch,
}) => {
  const [approvals, setApprovals] = useState<ActionApproval[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [apprs, sec] = await Promise.all([fetchApprovals(), fetchSecurityStatus()]);
      setApprovals(apprs);
      setStatus(sec);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      const res = await resolveApproval(id, decision);
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      alert(`Approval resolution failed: ${err.message}`);
    }
  };

  const filteredApprovals = approvals.filter((a) => {
    if (filterType === 'all') return true;
    if (filterType === 'shell') return a.action_type === 'shell_execution';
    if (filterType === 'write') return a.action_type === 'file_write';
    if (filterType === 'git') return a.action_type === 'git_operation';
    return true;
  });

  return (
    <div className="flex flex-col w-full text-on-surface p-space-lg gap-space-lg">
      {/* Top Header */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md pb-space-sm border-b border-surface-container-highest/40">
        <div className="flex flex-col max-w-3xl">
          <div className="flex items-center gap-space-sm mb-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high border border-tertiary/20">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_currentColor]"></span>
              <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider">
                Enclave Guard: Zero-Egress Enforced
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant border border-surface-container-highest">
              <span className="material-symbols-outlined text-xs text-primary">verified_user</span>
              <span>Air-Gap Status: <strong className="text-on-surface font-semibold">ARMED</strong></span>
            </div>
            <span className="font-code-sm text-code-sm text-outline">v2.4-sec-hardened</span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
            Security & Action Approval Center
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant leading-snug">
            Deterministic execution gates, zero-trust file permissions, shell command interceptors, and cryptographic audit trails for autonomous coding agents.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-space-sm shrink-0 flex-wrap">
          <button
            onClick={onToggleKillSwitch}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-headline-sm text-body-sm transition-all duration-150 active:scale-95 group shadow-sm ${
              killSwitchActive
                ? 'bg-error text-on-error animate-pulse font-bold'
                : 'bg-error-container/30 hover:bg-error-container/60 text-error border border-error/40'
            }`}
          >
            <span className="material-symbols-outlined text-lg">power_settings_new</span>
            <span>{killSwitchActive ? 'Kill Switch ENGAGED' : 'Emergency Kill Switch'}</span>
          </button>
        </div>
      </section>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-tertiary/20 border border-tertiary/40 text-tertiary font-body-sm text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">verified</span>
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Posture Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider">
                Pending Approvals
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-1 block">
                {approvals.length} Actions
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-error-container/40 flex items-center justify-center text-error relative">
              <span className="material-symbols-outlined text-xl">fitbit_jumping_jacks</span>
              {approvals.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-surface-container-highest/30 flex items-center justify-between text-body-sm font-body-sm text-error">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span> Action Gate Active
            </span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider">
                Intercepted Threats
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">28 Blocked</span>
                <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-tertiary">7 Days</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-xl">shield_locked</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-surface-container-highest/30 flex items-center justify-between text-outline font-label-sm text-label-sm">
            <span>19 Shell Injections, 9 Path Traversal</span>
            <span className="text-tertiary font-medium">100% Mitigated</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider">
                Air-Gapped Repositories
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-1 block">
                1 Enclave
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">cloud_off</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-surface-container-highest/30 flex items-center justify-between text-outline font-label-sm text-label-sm">
            <span>Zero 3rd-party training retention</span>
            <span className="text-primary font-medium">AST Local</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider">
                Tamper-Proof Audit
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-1 block">
                100% Signed
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-xl">token</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-surface-container-highest/30 flex items-center justify-between text-outline font-label-sm text-label-sm">
            <span>ed25519 Hardware Attestation</span>
            <span className="text-tertiary font-semibold">Active</span>
          </div>
        </div>
      </section>

      {/* Pending Action Approval Queue */}
      <section className="space-y-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-surface-container-highest/40 pb-space-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Pending Agent Action Queue ({approvals.length})
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container-highest">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                filterType === 'all' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline'
              }`}
            >
              All Pending ({approvals.length})
            </button>
            <button
              onClick={() => setFilterType('shell')}
              className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                filterType === 'shell' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline'
              }`}
            >
              Shell Intercepts
            </button>
            <button
              onClick={() => setFilterType('write')}
              className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                filterType === 'write' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline'
              }`}
            >
              File Mutations
            </button>
            <button
              onClick={() => setFilterType('git')}
              className={`px-2.5 py-1 rounded font-label-sm text-label-sm ${
                filterType === 'git' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline'
              }`}
            >
              Git Operations
            </button>
          </div>
        </div>

        {filteredApprovals.length === 0 ? (
          <div className="p-space-xl rounded-xl bg-surface-container border border-surface-container-highest/40 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-tertiary">verified_user</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Approval Queue Clear
            </h3>
            <p className="font-body-sm text-body-sm text-outline max-w-md mx-auto">
              All agent mutations, file writes, and shell executions have been reviewed. Zero pending unapproved actions.
            </p>
          </div>
        ) : (
          <div className="space-y-space-md">
            {filteredApprovals.map((appr) => (
              <div
                key={appr.id}
                className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/50 shadow-md space-y-space-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container-highest/30">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span
                      className={`font-label-sm text-label-sm px-2 py-0.5 rounded font-semibold tracking-wide ${
                        appr.severity === 'critical' || appr.severity === 'high'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-primary-container text-on-primary-container'
                      }`}
                    >
                      {appr.severity.toUpperCase()} GATE
                    </span>
                    <span className="font-code-sm text-code-sm text-on-surface font-medium">
                      {appr.action_type.toUpperCase().replace('_', ' ')}
                    </span>
                    <span className="text-outline text-xs">•</span>
                    <span className="font-code-sm text-code-sm text-on-surface-variant">
                      Task #{appr.task_id}
                    </span>
                  </div>

                  <div className="font-label-sm text-label-sm text-outline">
                    Target: <strong className="text-on-surface">{appr.target_resource}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
                  <div className="xl:col-span-8 space-y-2">
                    <h3 className="font-headline-sm text-body-md font-semibold text-on-surface">
                      {appr.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {appr.description}
                    </p>

                    <div className="bg-surface-container-lowest p-space-sm rounded-lg font-code-sm text-code-sm text-on-surface border border-surface-container-highest overflow-x-auto">
                      <pre><code>{appr.command_or_diff}</code></pre>
                    </div>

                    {appr.risk_analysis && (
                      <div className="p-2.5 rounded-lg bg-surface-container border border-surface-container-highest/40 flex items-start gap-2 text-body-sm font-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">policy</span>
                        <div>
                          <strong className="text-on-surface">Tripwire Analysis: </strong>
                          {appr.risk_analysis}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-4 flex flex-col justify-between p-space-sm rounded-lg bg-surface-container border border-surface-container-highest/40 space-y-3">
                    <div>
                      <span className="font-label-sm text-label-sm uppercase text-outline block">
                        Action Requirement
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface mt-1">
                        Explicit human signature required. AI agent cannot bypass or self-authorize.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleResolve(appr.id, 'approved')}
                        className="w-full py-2 px-3 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-headline-sm text-body-sm font-semibold transition-all flex items-center justify-center gap-2 shadow"
                      >
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span>Approve & Execute</span>
                      </button>
                      <button
                        onClick={() => handleResolve(appr.id, 'rejected')}
                        className="w-full py-1.5 px-3 rounded-lg bg-error-container/40 hover:bg-error-container/80 text-error font-body-sm text-body-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">block</span>
                        <span>Reject Action</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
