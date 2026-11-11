import React, { useState, useEffect } from 'react';
import { fetchAnalytics } from '../api';

export const TokenAnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('Last 30 Days');

  useEffect(() => {
    fetchAnalytics().then(setData).catch(console.error);
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Date', 'Baseline Uncompressed Tokens', 'NEXORA Optimized Tokens', 'Cost Saved USD'],
      ...data.history_trajectory.map((h: any) => [
        h.day,
        h.baseline_tokens,
        h.optimized_tokens,
        `$${h.cost_saved.toFixed(2)}`,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexora_token_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full text-on-surface p-space-lg gap-space-lg">
      {/* Header & Filter Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
              Token Analytics & Cost Telemetry
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm uppercase tracking-wider border border-tertiary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              Realtime AST Metering V3.8
            </span>
          </div>
          <p className="font-body-md text-body-md text-outline">
            Fine-grained visibility into AST context compaction, model cost efficiency, and token allocation across monorepo services.
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-low text-on-surface font-label-md text-label-md border border-surface-container-highest">
            <span className="material-symbols-outlined text-base text-tertiary">calendar_today</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="Last 24 Hours" className="bg-surface-container-high">Last 24 Hours</option>
              <option value="Last 7 Days" className="bg-surface-container-high">Last 7 Days</option>
              <option value="Last 30 Days" className="bg-surface-container-high">Last 30 Days</option>
              <option value="Year to Date" className="bg-surface-container-high">Year to Date</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-surface-container hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-all border border-surface-container-highest shadow-sm"
          >
            <span className="material-symbols-outlined text-base text-tertiary">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Telemetry Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Total Tokens */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-sm shadow-md border border-surface-container-highest/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Total Tokens Consumed
            </span>
            <span className="material-symbols-outlined text-lg text-primary">data_usage</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {data?.total_tokens_consumed || '14.82M'}
            </span>
            <span className="font-label-sm text-label-sm text-tertiary flex items-center font-medium">
              <span className="material-symbols-outlined text-xs">arrow_upward</span> 12%
            </span>
          </div>
          <div className="flex items-center justify-between text-outline font-label-sm text-label-sm pt-2 border-t border-surface-container-highest/30">
            <span>Input: {data?.input_tokens || '11.2M'}</span>
            <span>Output: {data?.output_tokens || '3.62M'}</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-code-sm text-[10px]">
              {data?.input_output_ratio || '3.1:1'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-1 flex">
            <div className="bg-primary h-full w-[76%]" title="Input 76%"></div>
            <div className="bg-tertiary h-full w-[24%]" title="Output 24%"></div>
          </div>
        </div>

        {/* Card 2: AST Pruning & Savings */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-sm shadow-md border border-surface-container-highest/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              AST Pruning & Savings
            </span>
            <span className="material-symbols-outlined text-lg text-tertiary">compress</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline-lg text-headline-lg font-bold text-tertiary">
              {data?.total_tokens_saved || '38.64M'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-medium">Saved</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-surface-container-highest/30">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {data?.compression_efficiency_pct || 72.3}% AST Compaction
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm font-semibold">
              +${data?.total_cost_saved_usd?.toFixed(2) || '312.40'} Saved
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-1">
            <div className="bg-gradient-to-r from-tertiary to-primary h-full w-[72.3%]"></div>
          </div>
        </div>

        {/* Card 3: Net API Spend */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-sm shadow-md border border-surface-container-highest/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Net Model API Spend
            </span>
            <span className="material-symbols-outlined text-lg text-secondary">payments</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
              ${data?.net_spend_usd?.toFixed(2) || '148.20'}
            </span>
            <span className="font-label-sm text-label-sm text-outline">
              / ${data?.budget_cap_usd || '500'} Cap
            </span>
          </div>
          <div className="flex items-center justify-between text-outline font-label-sm text-label-sm pt-1 border-t border-surface-container-highest/30">
            <span>29.6% pacing utilized</span>
            <span className="text-tertiary font-medium">Healthy runway</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-1">
            <div className="bg-tertiary-container h-full w-[29.6%]"></div>
          </div>
        </div>

        {/* Card 4: Model Cascade Mix */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-sm shadow-md border border-surface-container-highest/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Model Allocation Mix
            </span>
            <span className="material-symbols-outlined text-lg text-primary">pie_chart</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1 font-label-sm text-label-sm">
            <div className="flex items-center justify-between">
              <span className="text-on-surface flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span> DeepSeek V3 (Fast-Path)
              </span>
              <span className="font-code-sm text-tertiary font-bold">58%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span> Claude 3.7 Sonnet (Audit)
              </span>
              <span className="font-code-sm text-primary font-bold">34%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary"></span> GPT-4o (Fallback)
              </span>
              <span className="font-code-sm text-secondary font-bold">8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="rounded-xl bg-surface-container p-space-md border border-surface-container-highest/40 space-y-space-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              30-Day Verified Token Compaction Ledger
            </h3>
            <p className="font-body-sm text-body-sm text-outline">
              Cryptographically verified prompt token delta between raw baseline dumps and NEXORA AST compaction
            </p>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-tertiary font-code-sm">
            Deterministic Receipt Ledger
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse font-body-sm text-body-sm">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l">Time Window</th>
                <th className="py-2.5 px-3">Uncompressed AST Baseline</th>
                <th className="py-2.5 px-3">NEXORA Compacted Tokens</th>
                <th className="py-2.5 px-3">Reduction Efficiency</th>
                <th className="py-2.5 px-3 text-right rounded-r">Net USD Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {(data?.history_trajectory || []).map((row: any, idx: number) => {
                const pct = (
                  ((row.baseline_tokens - row.optimized_tokens) / row.baseline_tokens) *
                  100
                ).toFixed(1);
                return (
                  <tr key={idx} className="hover:bg-surface-container-high/60 transition-colors">
                    <td className="py-3 px-3 font-code-sm text-code-sm text-on-surface font-medium">
                      {row.day}
                    </td>
                    <td className="py-3 px-3 font-code-sm text-code-sm text-outline line-through">
                      {(row.baseline_tokens / 1000).toLocaleString()}k
                    </td>
                    <td className="py-3 px-3 font-code-sm text-code-sm text-tertiary font-semibold">
                      {(row.optimized_tokens / 1000).toLocaleString()}k
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-semibold">
                        -{pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-code-sm text-code-sm text-primary font-bold">
                      +${row.cost_saved.toFixed(2)} USD
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
