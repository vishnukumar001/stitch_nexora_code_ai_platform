import React, { useState } from 'react';
import { KPIStats, Provider, TaskRecord } from '../api';

interface DashboardProps {
  stats: KPIStats | null;
  providers: Provider[];
  recentActivities: TaskRecord[];
  onNavigate: (view: string) => void;
  onInspectTask: (task: TaskRecord) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  stats,
  providers,
  recentActivities,
  onNavigate,
  onInspectTask,
}) => {
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D' | 'ALL'>('30D');

  return (
    <div className="flex flex-col w-full gap-space-lg p-space-lg text-on-surface">
      {/* TOP SECTION: Welcome Cockpit Banner */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-xl border border-surface-container-highest/40">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary-container/20 to-tertiary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-16 h-40 w-40 rounded-full bg-secondary-container/15 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_rgba(76,215,246,0.8)]"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-semibold">
                MISSION CRITICAL ORCHESTRATOR
              </span>
              <span className="font-code-sm text-code-sm text-outline">/</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                Cluster node: <code className="text-tertiary font-bold">us-east-aurora-9</code>
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                Welcome back, Elena
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-code-sm text-code-sm border border-surface-container-highest">
                <span className="material-symbols-outlined text-sm text-primary">lan</span>
                <span className="text-outline">Workspace:</span>
                <span className="text-primary font-medium">prod-core-monorepo</span>
                <span className="font-label-sm text-tertiary ml-1">● ACTIVE</span>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-outline">
              Continuous AST-pruning active • Syntactic telemetry streaming at 60Hz • Zero confidential leakage mode enabled
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('ai-coding-workspace')}
              className="group relative flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-on-primary font-body-sm text-body-sm font-semibold shadow-md hover:bg-primary-fixed-dim transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>New Agent Task</span>
              <kbd className="font-code-sm text-label-sm px-1.5 py-0.5 rounded bg-on-primary/15 text-on-primary">
                ⌘N
              </kbd>
            </button>
            <button
              onClick={() => onNavigate('model-router')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-high text-on-surface font-body-sm text-body-sm hover:bg-surface-bright transition-colors shadow-sm border border-surface-container-highest"
            >
              <span className="material-symbols-outlined text-base text-tertiary">alt_route</span>
              <span>Inspect Model Router</span>
            </button>
            <button
              onClick={() => onNavigate('token-analytics')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors shadow-sm border border-surface-container-highest"
            >
              <span className="material-symbols-outlined text-base text-outline">download_for_offline</span>
              <span className="font-body-sm text-body-sm">Export Audit Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI TELEMETRY CARDS (4-Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* KPI 1: Tasks Completed */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/30">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline block">
                Total Tasks Completed
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {stats?.tasks_completed ?? 1482}
                </span>
                <span className="font-code-sm text-label-sm text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded font-medium">
                  +18.4%
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">task_alt</span>
            </div>
          </div>
          {/* Mini Sparkline */}
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 160 30">
              <path d="M 0,22 Q 25,24 50,16 T 100,12 T 130,6 L 160,2" fill="none" stroke="#4cd7f6" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="mt-2 pt-2 flex items-center justify-between border-t border-surface-container-highest/40">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></span>
              <span className="font-code-sm text-label-sm text-on-surface-variant">99.2% success rate</span>
            </div>
            <span className="font-code-sm text-label-sm text-outline">12 fails pruned</span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-tertiary w-[99.2%]"></div>
          </div>
        </div>

        {/* KPI 2: Tokens Consumed */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/30">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline block">
                Tokens Consumed
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {stats?.tokens_consumed ?? '14.8M'}
                </span>
                <span className="font-code-sm text-code-sm text-outline">/ 45.0M</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-xl">token</span>
            </div>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 160 30">
              <path d="M 0,26 Q 30,22 65,18 T 115,14 T 160,8" fill="none" stroke="#acedff" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="mt-2 pt-2 flex items-center justify-between border-t border-surface-container-highest/40">
            <span className="font-code-sm text-label-sm text-on-surface-variant">Target Budget Usage</span>
            <span className="font-code-sm text-label-sm text-tertiary font-semibold">32.8% consumed</span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-tertiary w-[32.8%]"></div>
          </div>
        </div>

        {/* KPI 3: Token Savings */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/30">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary block">
                Token Savings (AST Prune)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-tertiary">
                  {stats?.token_savings ?? '38.6M'}
                </span>
                <span className="font-code-sm text-label-sm text-on-surface bg-surface-container-high px-1.5 py-0.5 rounded font-medium">
                  -${stats?.cost_saved_usd ?? '312.40'} USD
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-xl">auto_fix_high</span>
            </div>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 160 30">
              <path d="M 0,28 Q 40,24 80,12 T 130,8 T 160,4" fill="none" stroke="#4cd7f6" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="mt-2 pt-2 flex items-center justify-between border-t border-surface-container-highest/40">
            <span className="font-code-sm text-label-sm text-on-surface-variant">Reduction Efficiency</span>
            <span className="font-code-sm text-label-sm text-tertiary font-semibold">
              {stats?.token_savings_pct ?? 72.3}% compressed
            </span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-tertiary to-primary w-[72.3%]"></div>
          </div>
        </div>

        {/* KPI 4: Current API Spending */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/30">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline block">
                Current API Spending
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  ${stats?.current_spend_usd?.toFixed(2) ?? '482.40'}
                </span>
                <span className="font-code-sm text-code-sm text-outline">
                  / ${stats?.budget_cap_usd ?? '1200'} cap
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">credit_card</span>
            </div>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 160 30">
              <path d="M 0,20 Q 30,22 70,18 T 120,16 T 160,11" fill="none" stroke="#d0bcff" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="mt-2 pt-2 flex items-center justify-between border-t border-surface-container-highest/40">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              <span className="font-code-sm text-label-sm text-tertiary">Healthy Pacing</span>
            </div>
            <span className="font-code-sm text-label-sm text-outline">-24% under budget</span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary w-[40.2%]"></div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Interactive Visual Chart & AI Health Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* LEFT 60%: Interactive Trajectory Visualization */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col rounded-xl bg-surface-container p-space-md shadow-md border border-surface-container-highest/30">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-space-sm border-b border-surface-container-highest/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-lg">show_chart</span>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Token Consumption & Cost Trajectory
                </h2>
                <p className="font-body-sm text-body-sm text-outline">
                  Uncompressed AST Baseline vs NEXORA Syntactic Optimization (Past 30 Days)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
              {(['24H', '7D', '30D', 'ALL'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-0.5 rounded font-label-sm text-label-sm transition-colors ${
                    timeRange === r
                      ? 'text-on-surface bg-surface-container font-semibold shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Metric Strip */}
          <div className="grid grid-cols-3 gap-2 my-2 p-2.5 rounded-lg bg-surface-container-low border border-surface-container-highest/30">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 rounded bg-outline"></span>
                <span className="font-label-sm text-label-sm text-outline uppercase">Raw Baseline</span>
              </div>
              <span className="font-code-lg text-code-lg font-bold text-on-surface mt-0.5">
                53.4M <span className="font-code-sm text-label-sm text-outline font-normal">($460.60)</span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-sm bg-tertiary"></span>
                <span className="font-label-sm text-label-sm text-tertiary uppercase font-medium">NEXORA Optimized</span>
              </div>
              <span className="font-code-lg text-code-lg font-bold text-tertiary mt-0.5">
                14.8M <span className="font-code-sm text-label-sm text-tertiary/70 font-normal">($148.20)</span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="font-label-sm text-label-sm text-primary uppercase font-medium">Net Delta Saved</span>
              </div>
              <span className="font-code-lg text-code-lg font-bold text-primary mt-0.5">
                72.3% <span className="font-code-sm text-label-sm text-primary/70 font-normal">(-$312.40)</span>
              </span>
            </div>
          </div>

          {/* SVG Multi-Series Interactive Chart */}
          <div className="relative w-full h-56 pt-2">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 220">
              <defs>
                <linearGradient id="optGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="baseGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#958ea0" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#958ea0" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line opacity="0.4" stroke="#313540" strokeDasharray="3,3" x1="0" x2="700" y1="20" y2="20" />
              <line opacity="0.4" stroke="#313540" strokeDasharray="3,3" x1="0" x2="700" y1="70" y2="70" />
              <line opacity="0.4" stroke="#313540" strokeDasharray="3,3" x1="0" x2="700" y1="120" y2="120" />
              <line opacity="0.4" stroke="#313540" strokeDasharray="3,3" x1="0" x2="700" y1="170" y2="170" />
              <line opacity="0.8" stroke="#313540" x1="0" x2="700" y1="210" y2="210" />

              {/* Baseline Uncompressed Curve */}
              <path d="M 0,140 Q 60,110 120,95 T 240,65 T 360,50 T 480,35 T 600,28 T 700,20 L 700,210 L 0,210 Z" fill="url(#baseGrad)" />
              <path d="M 0,140 Q 60,110 120,95 T 240,65 T 360,50 T 480,35 T 600,28 T 700,20" fill="none" stroke="#958ea0" strokeDasharray="4,4" strokeWidth="2" />

              {/* NEXORA Compacted Curve */}
              <path d="M 0,190 Q 60,178 120,172 T 240,158 T 360,145 T 480,132 T 600,122 T 700,110 L 700,210 L 0,210 Z" fill="url(#optGrad)" />
              <path d="M 0,190 Q 60,178 120,172 T 240,158 T 360,145 T 480,132 T 600,122 T 700,110" fill="none" stroke="#4cd7f6" strokeWidth="2.5" />

              {/* Marker Points */}
              <circle cx="360" cy="50" fill="#958ea0" r="3.5" stroke="#0f131d" strokeWidth="2" />
              <circle cx="360" cy="145" fill="#4cd7f6" r="4.5" stroke="#0f131d" strokeWidth="2" />
              <line opacity="0.6" stroke="#4cd7f6" strokeDasharray="2,2" strokeWidth="1" x1="360" x2="360" y1="0" y2="210" />
              <circle cx="700" cy="20" fill="#958ea0" r="4" />
              <circle cx="700" cy="110" fill="#4cd7f6" r="5" />
            </svg>

            {/* Tooltip Overlay */}
            <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-surface-container-high/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-3 border border-surface-container-highest">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="font-code-sm text-label-sm text-tertiary">Day 15: 480k tokens</span>
              </div>
              <span className="font-code-sm text-label-sm text-outline">vs 1.72M raw</span>
              <span className="font-code-sm text-label-sm font-semibold text-primary">-$18.40 USD</span>
            </div>
          </div>

          {/* Model Allocation Share Strip */}
          <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-surface-container-highest/40">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Model Allocation Mix
            </span>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span className="font-code-sm text-label-sm text-on-surface">DeepSeek V3 (58%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="font-code-sm text-label-sm text-on-surface">Claude 3.7 (34%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="font-code-sm text-label-sm text-on-surface">GPT-4o (8%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 40%: Active AI Providers & Health Status */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col rounded-xl bg-surface-container p-space-md shadow-md border border-surface-container-highest/30">
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-highest/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">alt_route</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Active AI Providers & Health
              </h2>
            </div>
            <span className="font-code-sm text-label-sm text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">
              All Core Green
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-outline my-2">
            Live latency p95 and router availability guarantees (Bifrost Gateway ready)
          </p>

          <div className="flex flex-col gap-2.5 flex-1">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors border border-surface-container-highest/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.status === 'online'
                          ? 'bg-tertiary animate-pulse shadow-[0_0_8px_rgba(76,215,246,0.8)]'
                          : p.status === 'standby'
                          ? 'bg-secondary'
                          : 'bg-error'
                      }`}
                    ></span>
                    <span className="font-body-md text-body-md font-semibold text-on-surface truncate">
                      {p.name}
                    </span>
                    <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-tertiary">
                      {p.tier}
                    </span>
                  </div>
                  <span
                    className={`font-label-sm text-label-sm px-2 py-0.5 rounded font-medium ${
                      p.is_local
                        ? 'bg-primary-container/30 text-primary'
                        : p.status === 'online'
                        ? 'bg-tertiary-container/30 text-tertiary'
                        : 'bg-surface-container-highest text-outline'
                    }`}
                  >
                    {p.is_local ? '100% Offline-Safe' : p.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 font-code-sm text-label-sm text-outline border-t border-surface-container-highest/20">
                  <span className="text-on-surface-variant truncate">
                    {p.is_local ? 'Confidential AST Parse & Tokenizer' : `In: $${p.cost_per_m_in}/M · Out: $${p.cost_per_m_out}/M`}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span>{p.uptime_pct}% up</span>
                    <span className="text-tertiary font-semibold">{p.latency_ms}ms p95</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Recent Coding Activities Rich Table */}
      <div className="flex flex-col rounded-xl bg-surface-container p-space-md shadow-md border border-surface-container-highest/30 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-space-sm border-b border-surface-container-highest/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">history_edu</span>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Recent Coding Activities
              </h2>
              <p className="font-body-sm text-body-sm text-outline">
                Direct agent mutations, approval gates, and pruned token receipts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('task-history')}
              className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-sm text-body-sm transition-colors border border-surface-container-highest"
            >
              View Full History (JSONL)
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l">Task & Mutated Entity</th>
                <th className="py-2.5 px-3">Repository Branch</th>
                <th className="py-2.5 px-3">Agent Mode</th>
                <th className="py-2.5 px-3 text-right">Tokens Consumed / Saved</th>
                <th className="py-2.5 px-3 text-right">Cost</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3 text-right">Status</th>
                <th className="py-2.5 px-3 text-right rounded-r">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
              {recentActivities.map((t) => (
                <tr key={t.id} className="hover:bg-surface-container-high/60 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-tertiary text-lg">deployed_code</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-code-sm text-code-sm font-semibold text-on-surface truncate">
                          {t.title}
                        </span>
                        <span className="font-code-sm text-label-sm text-outline truncate">
                          {t.diffs?.[0]?.filename || 'services/gateway/src/token.rs'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-code-sm text-code-sm text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-low">
                      {t.branch}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded ${
                        t.is_confidential_routed
                          ? 'bg-primary-container/20 text-primary'
                          : 'bg-tertiary-container/20 text-tertiary'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {t.is_confidential_routed ? 'Local Air-Gap' : 'Autonomous'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-code-sm text-code-sm">
                    <span className="text-on-surface">{(t.tokens_compressed / 1000).toFixed(1)}k</span>
                    <span className="text-tertiary text-label-sm ml-1 font-medium">
                      (-{(t.tokens_saved / 1000).toFixed(1)}k)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-code-sm text-code-sm text-on-surface font-medium">
                    ${t.cost_billed_usd.toFixed(3)}
                  </td>
                  <td className="py-3 px-3 text-right font-code-sm text-code-sm text-outline">
                    {(t.latency_ms / 1000).toFixed(1)}s
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-label-sm text-label-sm font-medium ${
                        t.status === 'completed'
                          ? 'bg-tertiary-container/30 text-tertiary'
                          : t.status === 'pending_approval'
                          ? 'bg-surface-container-high text-primary'
                          : 'bg-error-container/30 text-error'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {t.status === 'completed' ? 'check_circle' : 'hourglass_top'}
                      </span>
                      {t.status === 'completed' ? 'Approved & Merged' : 'Pending Review'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onInspectTask(t)}
                      className="px-2 py-1 rounded text-outline hover:text-primary hover:bg-surface-container-high transition-colors font-label-sm text-label-sm"
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
    </div>
  );
};
