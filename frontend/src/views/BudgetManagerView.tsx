import React, { useState, useEffect } from 'react';
import { BudgetPolicy, fetchBudget, updateBudget } from '../api';

export const BudgetManagerView: React.FC = () => {
  const [budget, setBudget] = useState<BudgetPolicy | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formBudget, setFormBudget] = useState(1200);
  const [formTokenCap, setFormTokenCap] = useState(45000000);
  const [formHardLimit, setFormHardLimit] = useState(true);
  const [formAutoThrottle, setFormAutoThrottle] = useState(true);
  const [formAlertThreshold, setFormAlertThreshold] = useState(80);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBudget();
  }, []);

  const loadBudget = async () => {
    try {
      const b = await fetchBudget();
      setBudget(b);
      setFormBudget(b.monthly_budget_usd);
      setFormTokenCap(b.monthly_token_cap);
      setFormHardLimit(b.hard_limit_enforced);
      setFormAutoThrottle(b.auto_throttle_active);
      setFormAlertThreshold(b.alert_threshold_pct);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGuardrails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateBudget({
        monthly_budget_usd: Number(formBudget),
        monthly_token_cap: Number(formTokenCap),
        hard_limit_enforced: formHardLimit,
        auto_throttle_active: formAutoThrottle,
        alert_threshold_pct: Number(formAlertThreshold),
      });
      setBudget(updated);
      setShowModal(false);
      setSaveMessage('Budget guardrails updated and enforced successfully.');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      alert(`Failed to update budget: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface p-space-lg gap-space-lg max-w-[1680px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pb-space-xs border-b border-surface-container-highest/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
              Budget Manager & Spend Guardrails
            </h1>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary border border-tertiary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="font-label-sm text-label-sm font-semibold tracking-wider">
                AUTO-THROTTLE: {budget?.auto_throttle_active ? 'ARMED' : 'STANDBY'}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant border border-surface-container-highest">
              BUDGET POOL: <span className="text-on-surface font-semibold">${budget?.monthly_budget_usd?.toFixed(2)} / MO</span>
            </div>
          </div>
          <p className="font-body-md text-body-md text-outline max-w-3xl">
            Real-time token financial controls, hard spending limits per repository/team, and automated circuit-breaker throttling.
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary transition-all font-body-sm text-body-sm font-medium shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-base font-bold">add</span>
            <span>Configure Guardrails</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-xl bg-tertiary/20 border border-tertiary/40 text-tertiary font-body-sm text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 4 KPI Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Monthly Total Budget */}
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider">
                Monthly Budget Run
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  ${budget?.current_spend_usd?.toFixed(2) || '482.40'}
                </span>
                <span className="font-code-sm text-code-sm text-outline">
                  / ${budget?.monthly_budget_usd?.toFixed(2) || '1200.00'}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between font-label-sm text-label-sm">
              <span className="text-tertiary font-semibold">{budget?.budget_utilized_pct}% Utilized</span>
              <span className="text-outline">{budget?.runway_days} days remaining</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-tertiary to-primary transition-all duration-1000"
                style={{ width: `${Math.min(100, budget?.budget_utilized_pct || 40)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 2: Tokens Consumed Cap */}
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider">
                Token Cap Consumption
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {((budget?.current_tokens_used || 14820000) / 1000000).toFixed(2)}M
                </span>
                <span className="font-code-sm text-code-sm text-outline">
                  / {((budget?.monthly_token_cap || 45000000) / 1000000).toFixed(0)}M
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-lg">token</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between font-label-sm text-label-sm">
              <span className="text-tertiary font-semibold">{budget?.tokens_utilized_pct}% Consumed</span>
              <span className="text-outline">Safe Ceiling</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full rounded-full bg-tertiary"
                style={{ width: `${Math.min(100, budget?.tokens_utilized_pct || 32)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 3: AST Cost Savings */}
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase text-tertiary tracking-wider">
                AST Pruning Net Savings
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md font-semibold text-tertiary">
                  +$312.40 USD
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-lg">auto_fix_high</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between font-label-sm text-label-sm">
              <span className="text-tertiary font-semibold">72.3% Compaction</span>
              <span className="text-outline">38.6M tokens saved</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-tertiary to-primary w-[72.3%]"></div>
            </div>
          </div>
        </div>

        {/* Card 4: Auto-Throttle Guardrail Status */}
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider">
                Pre-Flight Budget Gate
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {budget?.hard_limit_enforced ? 'Hard Cap Armed' : 'Soft Warning'}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">security</span>
            </div>
          </div>
          <div className="mt-4 space-y-1 font-label-sm text-label-sm text-outline border-t border-surface-container-highest/30 pt-2">
            <div>Alert Threshold: <span className="text-on-surface font-semibold">{budget?.alert_threshold_pct}%</span></div>
            <div>Over-Budget Action: <span className="text-error font-semibold">Pre-Flight Block</span></div>
          </div>
        </div>
      </div>

      {/* Configure Guardrails Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-xl bg-surface-container-low border border-outline-variant/50 shadow-2xl overflow-hidden p-space-lg">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-highest/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Configure Spend Guardrails & Limits
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveGuardrails} className="space-y-space-md mt-4">
              <div>
                <label className="block font-label-sm text-label-sm text-outline uppercase mb-1">
                  Monthly Budget Cap (USD)
                </label>
                <input
                  type="number"
                  value={formBudget}
                  onChange={(e) => setFormBudget(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-outline uppercase mb-1">
                  Monthly Token Cap
                </label>
                <input
                  type="number"
                  value={formTokenCap}
                  onChange={(e) => setFormTokenCap(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-outline uppercase mb-1">
                  Alert Warning Threshold (%)
                </label>
                <input
                  type="number"
                  value={formAlertThreshold}
                  onChange={(e) => setFormAlertThreshold(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-surface-container-highest/40">
                <div>
                  <span className="font-label-md text-label-md font-semibold text-on-surface block">
                    Enforce Hard Limit Pre-Flight Check
                  </span>
                  <span className="font-body-sm text-body-sm text-outline">
                    Block model invocations that exceed monthly budget
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formHardLimit}
                  onChange={(e) => setFormHardLimit(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-surface-container-highest/40">
                <div>
                  <span className="font-label-md text-label-md font-semibold text-on-surface block">
                    Auto-Throttle Circuit Breaker
                  </span>
                  <span className="font-body-sm text-body-sm text-outline">
                    Cascade to lower-tier models when budget is tight
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formAutoThrottle}
                  onChange={(e) => setFormAutoThrottle(e.target.checked)}
                  className="w-5 h-5 accent-tertiary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-highest/40">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-all font-label-md shadow"
                >
                  Save & Apply Guardrails
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
