import React, { useState } from 'react';
import { TaskRecord, Repository, executeAgentTask, resolveApproval, ActionApproval } from '../api';

interface WorkspaceProps {
  repositories: Repository[];
  activeRepoId: string;
  onSelectRepo: (repoId: string) => void;
  currentTask: TaskRecord | null;
  onTaskCompleted: (task: TaskRecord) => void;
  onNavigate: (view: string) => void;
}

export const WorkspaceView: React.FC<WorkspaceProps> = ({
  repositories,
  activeRepoId,
  onSelectRepo,
  currentTask,
  onTaskCompleted,
  onNavigate,
}) => {
  const [prompt, setPrompt] = useState(
    'Investigate the memory spike in cache_manager.go during high eviction rate. Refactor the inner byte buffer to use a pooled buffer (sync.Pool) and supply high-concurrency benchmarks.'
  );
  const [strategy, setStrategy] = useState<'balanced' | 'max_thrift' | 'fast_path' | 'frontier'>('balanced');
  const [safeMode, setSafeMode] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeTabFile, setActiveTabFile] = useState<string>('pkg/cache/cache_manager.go');
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  const activeRepo = repositories.find((r) => r.id === activeRepoId) || repositories[0];

  const handleExecute = async () => {
    if (!prompt.trim() || isExecuting) return;
    setIsExecuting(true);
    setApprovalMessage(null);
    try {
      const task = await executeAgentTask({
        prompt,
        repo_id: activeRepo?.id || 'repo-core',
        strategy,
        safe_mode: safeMode,
      });
      onTaskCompleted(task);
    } catch (err: any) {
      alert(`Agent execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApprovalAction = async (decision: 'approved' | 'rejected' | 'revision_requested') => {
    if (!currentTask?.approval_id) return;
    try {
      const res = await resolveApproval(currentTask.approval_id, decision);
      setApprovalMessage(res.message);
      // Update local task status
      currentTask.status = decision === 'approved' ? 'completed' : 'rejected';
      onTaskCompleted({ ...currentTask });
    } catch (err: any) {
      alert(`Approval action failed: ${err.message}`);
    }
  };

  const quickInvocations = [
    { title: 'Refactor Leak', desc: 'SyncPool optimization', query: 'Refactor inner byte buffer allocations using sync.Pool in cache_manager.go' },
    { title: 'Add Unit Tests', desc: 'Edge case coverage', query: 'Add concurrency benchmarks and TTL boundary unit tests in cache_test.go' },
    { title: 'Fix CORS Regr.', desc: 'Preflight headers', query: 'Fix preflight CORS header regression on auth gateway endpoints' },
    { title: 'Optimize Indices', desc: 'Compound keys', query: 'Optimize query index selectivity and compound keys for query engine' },
  ];

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden bg-surface-container-lowest text-on-surface">
      {/* Top Operational Sub-bar */}
      <div className="h-10 px-space-md bg-surface-container-low flex items-center justify-between shrink-0 select-none border-b border-surface-container-highest/40">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface">
              Agent Session Active
            </span>
            <span className="font-code-sm text-code-sm text-outline">
              #{currentTask?.id || 'NX-RUN-8941'}
            </span>
          </div>

          <div className="h-3 w-px bg-surface-container-highest"></div>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-tertiary">memory</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">AST Pruning Factor:</span>
            <span className="font-code-sm text-code-sm text-tertiary font-semibold">
              {currentTask?.compression_ratio ?? 96.0}% ({currentTask?.tokens_uncompressed ?? 8420} → {currentTask?.tokens_compressed ?? 340} tok)
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">currency_exchange</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Cascade Delta:</span>
            <span className="font-code-sm text-code-sm text-primary font-semibold">
              -${currentTask?.cost_saved_usd ?? '0.184'} (vs GPT-4o-Raw)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-highest font-code-sm text-code-sm text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>docker://nx-sandbox:849</span>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-bright text-on-surface transition-colors flex items-center gap-1 font-label-sm text-label-sm border border-surface-container-highest"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Primary 3-Pane Modular Grid */}
      <div className="flex-1 grid grid-cols-12 min-h-0 w-full overflow-hidden">
        {/* PANE 1: Left Pane (3 cols) - Context & Spec */}
        <section className="col-span-3 h-full flex flex-col bg-surface-container-low border-r border-surface-container-highest/40 overflow-hidden">
          <div className="h-10 px-space-md bg-surface-container flex items-center justify-between shrink-0 border-b border-surface-container-highest/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">rule_folder</span>
              <span className="font-label-sm text-label-sm uppercase font-semibold text-on-surface tracking-wider">
                Context & Spec
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary">
              {activeRepo?.is_confidential ? 'Confidential Air-Gap' : 'Isolated Scope'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-space-md space-y-space-md text-on-surface">
            {/* Active Repository & Branch Selector */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm uppercase text-outline flex items-center justify-between">
                <span>Repository Target</span>
                <span className="text-tertiary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Connected
                </span>
              </label>

              <select
                value={activeRepo?.id}
                onChange={(e) => onSelectRepo(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary cursor-pointer"
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.id} className="bg-surface-container-high">
                    {r.name} {r.is_confidential ? '🔒 [Confidential]' : ''}
                  </option>
                ))}
              </select>

              {activeRepo?.is_confidential && (
                <div className="p-2 rounded bg-primary-container/20 border border-primary/40 text-primary font-label-sm text-[11px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">shield_lock</span>
                  <span>Confidential Mode: Local Models Only (Zero Egress)</span>
                </div>
              )}
            </div>

            {/* Model Execution Strategy */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-sm text-label-sm uppercase text-outline">Model Execution Strategy</label>
                <span className="font-label-sm text-label-sm text-tertiary font-semibold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">savings</span> 65% Token Save
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest space-y-2">
                <select
                  value={strategy}
                  onChange={(e: any) => setStrategy(e.target.value)}
                  className="w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none cursor-pointer"
                >
                  <option value="balanced" className="bg-surface-container-high">Auto-Routing Cascade (DeepSeek + Claude)</option>
                  <option value="max_thrift" className="bg-surface-container-high">Aggressive Token Thrift (Lowest Cost)</option>
                  <option value="fast_path" className="bg-surface-container-high">Low-Latency Fast Path (&lt;100ms)</option>
                  <option value="frontier" className="bg-surface-container-high">Frontier Heavy (Claude 3.7 Deep Reasoning)</option>
                </select>

                <div className="pt-1.5 border-t border-surface-container-highest/40">
                  <div className="flex justify-between font-label-sm text-label-sm text-outline mb-1">
                    <span>Speed: 142 tok/s</span>
                    <span>Est. Cost: $0.0028/k</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden flex">
                    <div className="bg-tertiary h-full w-[65%]" title="DeepSeek Execution"></div>
                    <div className="bg-primary h-full w-[35%]" title="Claude Verification"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* AST Slicing Window */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-label-sm text-label-sm uppercase text-outline">AST Slicing Window</label>
                <span className="font-label-sm text-label-sm text-tertiary font-code-sm">
                  {currentTask?.tokens_compressed ?? 340} tokens
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest space-y-1.5">
                <div className="text-label-sm font-label-sm text-outline">Targeted file symbol scopes:</div>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between p-1.5 rounded bg-surface-container font-code-sm text-code-sm">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-xs text-tertiary">description</span>
                      <span className="text-on-surface truncate">cache_manager.go</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-tertiary px-1 rounded bg-surface-container-high">
                      AST Focus
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-surface-container font-code-sm text-code-sm">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-xs text-on-surface-variant">description</span>
                      <span className="text-on-surface truncate">cache_test.go</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline px-1 rounded bg-surface-container-high">
                      Full
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-surface-container font-code-sm text-code-sm opacity-60">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-xs text-outline">description</span>
                      <span className="text-on-surface truncate">config.yaml</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline px-1 rounded bg-surface-container-high">
                      KV Scope
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Authorization Mode (Safe Mode vs Autonomous) */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm uppercase text-outline">Agent Execution Guardrails</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface-container-lowest border border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setSafeMode(true)}
                  className={`py-1.5 px-2 rounded-md font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    safeMode
                      ? 'bg-surface-container text-on-surface shadow-sm border border-tertiary/30'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm text-tertiary">lock</span>
                  <span>Safe Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSafeMode(false)}
                  className={`py-1.5 px-2 rounded-md font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-all ${
                    !safeMode
                      ? 'bg-surface-container text-on-surface shadow-sm border border-primary/30'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm text-primary">bolt</span>
                  <span>Autonomous</span>
                </button>
              </div>
              <p className="font-label-sm text-[11px] text-outline px-1">
                {safeMode ? 'Write operations & shell executions require explicit approval.' : 'Autonomous agent execution enabled.'}
              </p>
            </div>

            {/* Quick Diagnostic Invocations */}
            <div className="space-y-2 pt-1">
              <label className="font-label-sm text-label-sm uppercase text-outline">Quick Diagnostic Invocations</label>
              <div className="grid grid-cols-2 gap-1.5">
                {quickInvocations.map((q) => (
                  <button
                    key={q.title}
                    onClick={() => setPrompt(q.query)}
                    className="p-2 rounded bg-surface-container hover:bg-surface-container-high text-left transition-colors border border-surface-container-highest/30"
                  >
                    <div className="font-code-sm text-code-sm text-primary font-medium">{q.title}</div>
                    <div className="font-label-sm text-[10px] text-outline truncate">{q.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PANE 2: Middle Pane (5 cols) - Agent Execution Stream & Chat Feed */}
        <section className="col-span-5 h-full flex flex-col bg-surface-container border-r border-surface-container-highest/40 overflow-hidden">
          <div className="h-10 px-space-md bg-surface-container-low flex items-center justify-between shrink-0 border-b border-surface-container-highest/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-tertiary">terminal</span>
              <span className="font-label-sm text-label-sm uppercase font-semibold text-on-surface tracking-wider">
                Agent Execution Stream
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-code-sm">
                {currentTask?.cascade_chain?.[0] || 'DeepSeek-V3'} · 24ms ping
              </span>
              <button
                onClick={() => setPrompt('')}
                className="p-1 text-outline hover:text-on-surface transition-colors"
                title="Clear prompt"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
              </button>
            </div>
          </div>

          {/* Reasoning Pipeline Step Progression Box */}
          <div className="p-space-md bg-surface-container-lowest shrink-0 space-y-2 border-b border-surface-container-highest/40">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-tertiary">account_tree</span>
                <span>Reasoning Pipeline Steps</span>
              </span>
              <span className="font-label-sm text-label-sm text-tertiary font-semibold">
                {isExecuting ? 'Processing...' : '4/4 Complete'}
              </span>
            </div>

            <div className="space-y-1.5">
              {(currentTask?.reasoning_steps || [
                { step_number: 1, title: 'Indexed repository AST symbols', description: 'Cached in vector memory · 0 tokens billed', duration_s: 0.12 },
                { step_number: 2, title: 'Identified memory allocation bottleneck', description: 'Target locus: cache_manager.go:142 (Unbounded slice grow)', duration_s: 0.34 },
                { step_number: 3, title: 'Routed AST snippet to DeepSeek V3 for draft', description: 'Saved 12,400 tokens via partial tree context substitution', duration_s: 1.08 },
                { step_number: 4, title: 'Verification test run passed', description: '24/24 unit tests OK in isolated sandbox (#nx-849)', duration_s: 0.82 },
              ]).map((step) => (
                <div
                  key={step.step_number}
                  className="flex items-start gap-2 text-code-sm font-code-sm p-1.5 rounded bg-surface-container-low border border-surface-container-highest/30"
                >
                  <span className="material-symbols-outlined text-sm text-tertiary shrink-0 mt-0.5">check_circle</span>
                  <div className="flex-1 truncate">
                    <span className="text-on-surface">Step {step.step_number}: {step.title}</span>
                    <span className="font-label-sm text-label-sm text-outline block truncate">{step.description}</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-tertiary shrink-0">{step.duration_s}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Stream & Conversation Log */}
          <div className="flex-1 overflow-y-auto p-space-md space-y-space-md">
            {/* User Request Bubble */}
            <div className="flex items-start gap-3 justify-end">
              <div className="max-w-[85%] space-y-1">
                <div className="p-3 rounded-xl rounded-tr-none bg-surface-container-highest text-on-surface shadow-sm">
                  <p className="font-body-sm text-body-sm leading-relaxed">
                    {currentTask?.prompt || prompt}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 text-outline font-label-sm text-label-sm">
                  <span>Elena Rostova</span>
                  <span>•</span>
                  <span>Autonomous Task</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-0.5">
                ER
              </div>
            </div>

            {/* Agent Response Bubble */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5 shadow">
                <span className="material-symbols-outlined text-sm">smart_toy</span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="p-3.5 rounded-xl rounded-tl-none bg-surface-container-low border border-surface-container-highest/40 text-on-surface space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/30">
                    <span className="font-label-sm text-label-sm uppercase text-primary font-semibold tracking-wider">
                      Solution Synthesis & Benchmark
                    </span>
                    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest text-tertiary">
                      Spent {currentTask?.tokens_compressed ?? 342} tokens · Saved {currentTask?.tokens_saved ?? 4210} tokens
                    </span>
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    {currentTask?.solution_summary ||
                      'Found critical allocation trigger inside EvictExpiredKeys(). Dynamic reallocation caused ~48MB GC spikes under 10k QPS.'}
                  </p>

                  {/* Diagnostic Telemetry Card */}
                  <div className="p-2.5 rounded bg-surface-container-lowest grid grid-cols-3 gap-2 text-center border border-surface-container-highest/30">
                    <div>
                      <div className="font-label-sm text-label-sm text-outline">Pre-fix Allocations</div>
                      <div className="font-code-sm text-code-sm text-error font-semibold">1,240 B/op</div>
                    </div>
                    <div>
                      <div className="font-label-sm text-label-sm text-outline">Pooled Buffers</div>
                      <div className="font-code-sm text-code-sm text-tertiary font-semibold">48 B/op</div>
                    </div>
                    <div>
                      <div className="font-label-sm text-label-sm text-outline">GC Pause Delta</div>
                      <div className="font-code-sm text-code-sm text-tertiary font-semibold">-92.4%</div>
                    </div>
                  </div>

                  {/* Synthetic Validation Output */}
                  <div className="space-y-1">
                    <div className="font-label-sm text-label-sm uppercase text-outline">Synthetic Validation Output</div>
                    <pre className="p-2.5 rounded bg-surface-container-lowest font-code-sm text-code-sm text-on-surface overflow-x-auto leading-relaxed border border-surface-container-highest/30">
                      <code>{`BenchmarkEvictionThroughput/Baseline-16   100000   18420 ns/op
BenchmarkEvictionThroughput/Pooled-16     940200    1410 ns/op  PASS
--- PASS: TestConcurrentBufferPool (0.44s)
ok  github.com/nexora-cloud/core-engine/cache  0.712s`}</code>
                    </pre>
                  </div>
                </div>

                {/* Agent Attribution Ribbon */}
                <div className="flex items-center gap-3 px-2 font-label-sm text-label-sm text-outline">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-primary">verified_user</span>
                    <span>Confidence: 99.4%</span>
                  </span>
                  <span>•</span>
                  <span>Cascade: {currentTask?.cascade_chain?.join(' ➔ ') || 'DeepSeek-V3 ➔ Claude-3.7-Auditor'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt Terminal Input Bar */}
          <div className="p-space-md bg-surface-container-low shrink-0 space-y-2 border-t border-surface-container-highest/40">
            <div className="flex items-center justify-between text-outline font-label-sm text-label-sm px-1">
              <div className="flex items-center gap-2">
                <span className="text-tertiary">›</span>
                <span>Interactive Steering Prompt</span>
              </div>
              <div className="flex items-center gap-2">
                <span>AST Window: {currentTask?.tokens_compressed ?? 340} tok</span>
                <kbd className="px-1 py-0.5 rounded bg-surface-container-highest text-outline font-code-sm">↵ send</kbd>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecute();
                }}
                disabled={isExecuting}
                placeholder="Instruct agent (e.g. 'Add benchmark for TTL expiry edge cases' or 'Run go vet')..."
                className="w-full bg-surface-container-lowest text-on-surface font-body-sm text-body-sm rounded-lg pl-3 pr-24 py-2.5 outline-none focus:ring-1 focus:ring-primary border border-surface-container-highest placeholder-outline transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="px-3 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow"
                >
                  <span>{isExecuting ? 'Running...' : 'Execute'}</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PANE 3: Right Pane (4 cols) - Mutation Staging & Review */}
        <section className="col-span-4 h-full flex flex-col bg-surface-container-lowest overflow-hidden">
          <div className="h-10 px-space-md bg-surface-container flex items-center justify-between shrink-0 border-b border-surface-container-highest/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-tertiary">difference</span>
              <span className="font-label-sm text-label-sm uppercase font-semibold text-on-surface tracking-wider">
                Mutation Staging & Review
              </span>
            </div>
            <div className="flex items-center gap-1 font-label-sm text-label-sm">
              <span className="text-tertiary font-code-sm font-semibold">+95</span>
              <span className="text-error font-code-sm font-semibold">-15</span>
            </div>
          </div>

          {/* File Mutation Tabs */}
          <div className="p-space-sm bg-surface-container-low shrink-0 flex items-center gap-1.5 overflow-x-auto border-b border-surface-container-highest/30">
            <button
              onClick={() => setActiveTabFile('pkg/cache/cache_manager.go')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-code-sm text-code-sm shrink-0 transition-colors ${
                activeTabFile === 'pkg/cache/cache_manager.go'
                  ? 'bg-surface-container-highest text-on-surface font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              <span>cache_manager.go</span>
              <span className="text-tertiary font-label-sm text-label-sm ml-1">+28</span>
              <span className="text-error font-label-sm text-label-sm">-14</span>
            </button>
            <button
              onClick={() => setActiveTabFile('pkg/cache/cache_test.go')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-code-sm text-code-sm shrink-0 transition-colors ${
                activeTabFile === 'pkg/cache/cache_test.go'
                  ? 'bg-surface-container-highest text-on-surface font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span>cache_test.go</span>
              <span className="text-tertiary font-label-sm text-label-sm ml-1">+65</span>
            </button>
          </div>

          {/* Unified Code Diff Viewer */}
          <div className="flex-1 overflow-y-auto bg-surface-container-lowest font-code-sm text-code-sm flex flex-col p-1">
            <div className="px-space-md py-1.5 bg-surface-container-low flex items-center justify-between font-label-sm text-label-sm text-outline shrink-0 mb-1 rounded">
              <span className="font-code-sm text-code-sm text-on-surface-variant">{activeTabFile}:138-164</span>
              <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-primary font-medium">
                Unified AST Patch
              </span>
            </div>

            {/* Diff Lines */}
            <div className="space-y-0.5 select-text">
              <div className="flex items-stretch hover:bg-surface-container/50">
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">138</span>
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">138</span>
                <span className="w-4 text-center text-outline select-none"> </span>
                <pre className="text-on-surface-variant font-code-sm"><code>func (cm *CacheManager) EvictExpiredKeys(ctx context.Context) &#123;</code></pre>
              </div>
              <div className="flex items-stretch hover:bg-surface-container/50">
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">139</span>
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">139</span>
                <span className="w-4 text-center text-outline select-none"> </span>
                <pre className="text-on-surface-variant font-code-sm"><code>	cm.mu.Lock()</code></pre>
              </div>
              <div className="flex items-stretch hover:bg-surface-container/50">
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">140</span>
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">140</span>
                <span className="w-4 text-center text-outline select-none"> </span>
                <pre className="text-on-surface-variant font-code-sm"><code>	defer cm.mu.Unlock()</code></pre>
              </div>

              {/* Red Deletions */}
              <div className="flex items-stretch bg-error-container/20 text-error">
                <span className="w-8 text-right pr-2 select-none font-code-sm">141</span>
                <span className="w-8 text-right pr-2 select-none opacity-20 font-code-sm"> </span>
                <span className="w-4 text-center font-bold select-none">-</span>
                <pre className="font-code-sm"><code>	// Unbounded buffer instantiation on every eviction tick</code></pre>
              </div>
              <div className="flex items-stretch bg-error-container/20 text-error">
                <span className="w-8 text-right pr-2 select-none font-code-sm">142</span>
                <span className="w-8 text-right pr-2 select-none opacity-20 font-code-sm"> </span>
                <span className="w-4 text-center font-bold select-none">-</span>
                <pre className="font-code-sm"><code>	rawBuffer := make([]byte, 0, 65536)</code></pre>
              </div>
              <div className="flex items-stretch bg-error-container/20 text-error">
                <span className="w-8 text-right pr-2 select-none font-code-sm">143</span>
                <span className="w-8 text-right pr-2 select-none opacity-20 font-code-sm"> </span>
                <span className="w-4 text-center font-bold select-none">-</span>
                <pre className="font-code-sm"><code>	buf := bytes.NewBuffer(rawBuffer)</code></pre>
              </div>

              {/* Green Additions */}
              <div className="flex items-stretch bg-tertiary-container/30 text-tertiary">
                <span className="w-8 text-right pr-2 select-none opacity-20 font-code-sm"> </span>
                <span className="w-8 text-right pr-2 select-none font-code-sm">141</span>
                <span className="w-4 text-center font-bold select-none">+</span>
                <pre className="font-code-sm"><code>	// Lease pre-allocated byte slice from sync.Pool</code></pre>
              </div>
              <div className="flex items-stretch bg-tertiary-container/30 text-tertiary">
                <span className="w-8 text-right pr-2 select-none opacity-20 font-code-sm"> </span>
                <span className="w-8 text-right pr-2 select-none font-code-sm">142</span>
                <span className="w-4 text-center font-bold select-none">+</span>
                <pre className="font-code-sm"><code>	bufPtr := bufferPool.Get().(*bytes.Buffer)</code></pre>
              </div>
              <div className="flex items-stretch bg-tertiary-container/30 text-tertiary">
                <span className="w-8 text-right pr-2 select-none opacity-20 font-code-sm"> </span>
                <span className="w-8 text-right pr-2 select-none font-code-sm">143</span>
                <span className="w-4 text-center font-bold select-none">+</span>
                <pre className="font-code-sm"><code>	bufPtr.Reset()</code></pre>
              </div>
              <div className="flex items-stretch bg-tertiary-container/30 text-tertiary">
                <span className="w-8 text-right pr-2 select-none opacity-20 font-code-sm"> </span>
                <span className="w-8 text-right pr-2 select-none font-code-sm">144</span>
                <span className="w-4 text-center font-bold select-none">+</span>
                <pre className="font-code-sm"><code>	defer bufferPool.Put(bufPtr)</code></pre>
              </div>

              {/* Context Retained */}
              <div className="flex items-stretch hover:bg-surface-container/50">
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">144</span>
                <span className="w-8 text-right pr-2 text-outline opacity-40 font-code-sm select-none">145</span>
                <span className="w-4 text-center text-outline select-none"> </span>
                <pre className="text-on-surface-variant font-code-sm"><code>	for _, key := range cm.evictionQueue &#123;</code></pre>
              </div>
            </div>
          </div>

          {/* Live Sandbox Operational Status */}
          <div className="p-space-sm bg-surface-container-low shrink-0 flex items-center justify-between font-label-sm text-label-sm border-t border-surface-container-highest/30">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span className="text-on-surface font-code-sm truncate">Sandbox #nx-849: Active</span>
              <span className="text-outline truncate">CPU 1.2% · Mem 64MB</span>
            </div>
            <span className="text-tertiary font-code-sm shrink-0">Ports: 8080/tcp</span>
          </div>

          {/* Action Approval Bar (Deterministic Human-In-The-Loop) */}
          <div className="p-space-md bg-surface-container shrink-0 space-y-space-sm border-t border-surface-container-highest/40">
            {approvalMessage && (
              <div className="p-2 rounded bg-tertiary/20 text-tertiary font-label-sm text-label-sm border border-tertiary/40 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{approvalMessage}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Primary Emerald Approval Action */}
              <button
                onClick={() => handleApprovalAction('approved')}
                disabled={currentTask?.status === 'completed'}
                className="w-full py-2.5 px-4 rounded-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary-container font-headline-sm text-headline-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md group disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">
                  merge
                </span>
                <span>
                  {currentTask?.status === 'completed'
                    ? 'Approved & Merged'
                    : 'Approve & Apply Pull Request'}
                </span>
                <span className="font-code-sm text-code-sm opacity-80 ml-auto">⌘ + ↵</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApprovalAction('revision_requested')}
                  className="py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-bright text-secondary font-label-md text-label-md font-medium flex items-center justify-center gap-1.5 transition-colors border border-surface-container-highest"
                >
                  <span className="material-symbols-outlined text-sm">replay</span>
                  <span>Request Revision</span>
                </button>
                <button
                  onClick={() => handleApprovalAction('rejected')}
                  className="py-2 px-3 rounded-lg bg-error-container/40 hover:bg-error-container text-on-error-container font-label-md text-label-md font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">block</span>
                  <span>Reject & Revert</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-outline font-label-sm text-label-sm pt-0.5">
              <span>Signed with GPG key: <span className="text-on-surface-variant font-code-sm">ed25519/84F0D</span></span>
              <span className="text-tertiary flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">shield</span> CI checks armed
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
