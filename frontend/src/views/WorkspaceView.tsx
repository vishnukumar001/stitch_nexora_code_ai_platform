import React, { useState, useEffect } from 'react';
import {
  TaskRecord,
  Repository,
  TaskAnalyzeResponse,
  analyzeAgentTask,
  executeAgentTask,
  resolveApproval,
} from '../api';

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
  const activeRepo = repositories.find((r) => r.id === activeRepoId) || repositories[0];

  // Core Form State
  const [prompt, setPrompt] = useState(
    'Find and fix the memory leak in cache_manager.go during high eviction rate.'
  );
  const [isConfidential, setIsConfidential] = useState<boolean>(
    Boolean(activeRepo?.is_confidential)
  );

  // Workflow State: 'draft' | 'analyzed' | 'generating' | 'review' | 'completed'
  const [step, setStep] = useState<'draft' | 'analyzed' | 'generating' | 'review' | 'completed'>(
    currentTask ? (currentTask.status === 'completed' ? 'completed' : 'review') : 'draft'
  );

  // Analysis State
  const [analysis, setAnalysis] = useState<TaskAnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(currentTask);

  // Contextual Right Panel state (collapsible)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Diff Viewer file tab
  const [activeDiffFile, setActiveDiffFile] = useState<string>('pkg/cache/cache_manager.go');
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Sync when activeRepo changes
  useEffect(() => {
    if (activeRepo) {
      setIsConfidential(Boolean(activeRepo.is_confidential));
    }
  }, [activeRepo?.id, activeRepo?.is_confidential]);

  // Sync if parent updates currentTask
  useEffect(() => {
    if (currentTask) {
      setActiveTask(currentTask);
      setStep(currentTask.status === 'completed' ? 'completed' : 'review');
      if (currentTask.diffs?.[0]?.filename) {
        setActiveDiffFile(currentTask.diffs[0].filename);
      }
    }
  }, [currentTask]);

  // STEP 4: Analyse Task
  const handleAnalyze = async () => {
    if (!prompt.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setApprovalMessage(null);
    try {
      const res = await analyzeAgentTask({
        prompt,
        repo_id: activeRepo?.id || 'repo-core',
        is_confidential: isConfidential,
      });
      setAnalysis(res);
      setStep('analyzed');
    } catch (err: any) {
      alert(`Task analysis error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // STEP 6: Generate Solution
  const handleGenerate = async () => {
    setStep('generating');
    setApprovalMessage(null);
    try {
      const task = await executeAgentTask({
        prompt,
        repo_id: activeRepo?.id || 'repo-core',
        strategy: isConfidential ? 'frontier' : 'balanced',
        safe_mode: true, // Always enforce approval gate
      });
      setActiveTask(task);
      onTaskCompleted(task);
      if (task.diffs?.[0]?.filename) {
        setActiveDiffFile(task.diffs[0].filename);
      }
      setStep('review');
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
      setStep('analyzed');
    }
  };

  // STEP 8: Resolve Action Approval (Explicit Human-In-The-Loop)
  const handleApprovalAction = async (decision: 'approved' | 'rejected' | 'revision_requested') => {
    if (!activeTask?.approval_id) return;
    try {
      const res = await resolveApproval(activeTask.approval_id, decision);
      setApprovalMessage(res.message);
      const updated = {
        ...activeTask,
        status: decision === 'approved' ? 'completed' : 'rejected',
      };
      setActiveTask(updated);
      onTaskCompleted(updated);
      if (decision === 'approved') {
        setStep('completed');
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleStartFresh = () => {
    setStep('draft');
    setAnalysis(null);
    setActiveTask(null);
    setApprovalMessage(null);
  };

  const examplePrompts = [
    'Find and fix the memory leak in cache_manager.go',
    'Audit JWT token expiration and enforce secure validation',
    'Fix preflight CORS header regression on auth gateway',
    'Optimize query index selectivity and compound keys',
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden text-on-surface bg-surface-container-lowest">
      {/* =========================================================================
          LEFT / CENTER: MAIN WORKSPACE FLOW
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Workflow Breadcrumb Header */}
        <div className="h-12 px-6 bg-surface-container-low border-b border-surface-container-highest/40 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold uppercase text-tertiary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              Coding Task
            </span>
            <span className="text-outline text-xs">•</span>
            <span className="text-xs text-outline font-mono truncate">
              {activeRepo?.name} {isConfidential ? '(🔒 Local Model)' : '(Cloud Cascade)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {step !== 'draft' && (
              <button
                onClick={handleStartFresh}
                className="text-xs text-outline hover:text-on-surface px-2.5 py-1 rounded hover:bg-surface-container-high transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>New Task</span>
              </button>
            )}

            {/* Toggle Right Panel Button */}
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="text-xs text-outline hover:text-on-surface px-2 py-1 rounded hover:bg-surface-container-high transition-colors flex items-center gap-1"
              title={isRightPanelOpen ? 'Collapse side panel' : 'Expand side panel'}
            >
              <span className="material-symbols-outlined text-base">
                {isRightPanelOpen ? 'dock_to_right' : 'dock_to_left'}
              </span>
              <span className="hidden sm:inline">
                {isRightPanelOpen ? 'Hide Details' : 'Show Details'}
              </span>
            </button>
          </div>
        </div>

        {/* Content Body Based on Workflow State */}
        <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* =====================================================================
              STATE A: DRAFTING (Steps 1, 2, 3, 4)
              ===================================================================== */}
          {step === 'draft' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">
                  New Coding Task
                </h1>
                <p className="text-sm text-outline mt-1">
                  Describe what you want the agent to do. NEXORA Code will analyze the task, slice the minimal repository context, and optimize token spend.
                </p>
              </div>

              {/* STEP 1: Select Repository */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-outline flex items-center justify-between">
                  <span>Step 1: Select Repository</span>
                  <button
                    onClick={() => onNavigate('projects')}
                    className="text-primary hover:underline text-xs"
                  >
                    Manage Projects →
                  </button>
                </label>
                <select
                  value={activeRepo?.id}
                  onChange={(e) => onSelectRepo(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-container-low border border-surface-container-highest/60 text-on-surface font-mono text-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id} className="bg-surface-container-high">
                      {repo.name} ({repo.language}) {repo.is_confidential ? '🔒 [Confidential]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* STEP 2: Large Clear Instruction Input */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-outline">
                  Step 2: Enter Coding Instruction
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="e.g. Find and fix the login authentication bug or refactor buffer allocations..."
                  className="w-full p-4 rounded-xl bg-surface-container-low border border-surface-container-highest/60 text-on-surface placeholder:text-outline text-sm leading-relaxed focus:outline-none focus:border-primary transition-all resize-y"
                />

                {/* Example Quick Invocations */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-outline">Examples:</span>
                  {examplePrompts.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors truncate max-w-xs"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 3: Repository Privacy Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-outline">
                  Step 3: Select Privacy Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Standard Mode */}
                  <div
                    onClick={() => setIsConfidential(false)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      !isConfidential
                        ? 'bg-surface-container border-primary shadow-sm'
                        : 'bg-surface-container-low border-surface-container-highest/40 hover:border-surface-container-highest opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">cloud</span>
                        <span className="text-sm font-semibold text-on-surface">Standard Mode</span>
                      </div>
                      {!isConfidential && (
                        <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                      )}
                    </div>
                    <p className="text-xs text-outline leading-relaxed">
                      Optimized cloud cascade (Claude 3.7 + DeepSeek V3) with AST prompt compression to minimize tokens.
                    </p>
                  </div>

                  {/* Option 2: Confidential Mode (Local Models Only) */}
                  <div
                    onClick={() => setIsConfidential(true)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isConfidential
                        ? 'bg-surface-container border-tertiary shadow-sm'
                        : 'bg-surface-container-low border-surface-container-highest/40 hover:border-surface-container-highest opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-tertiary">shield_lock</span>
                        <span className="text-sm font-semibold text-on-surface">Confidential (Local Only)</span>
                      </div>
                      {isConfidential && (
                        <span className="material-symbols-outlined text-sm text-tertiary">check_circle</span>
                      )}
                    </div>
                    <p className="text-xs text-outline leading-relaxed">
                      Zero cloud egress. 100% strictly bound to local Ollama Qwen 2.5 Coder. Proprietary code never leaves your Mac.
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 4: Analyse Task Button */}
              <div className="pt-4 border-t border-surface-container-highest/40 flex items-center justify-between">
                <div className="text-xs text-outline">
                  <span className="text-tertiary font-mono">AST Slicer:</span> Ready to prune ~80% of unneeded context
                </div>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!prompt.trim() || isAnalyzing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-lg">
                    {isAnalyzing ? 'hourglass_top' : 'psychology'}
                  </span>
                  <span>{isAnalyzing ? 'Analyzing Codebase...' : 'Analyse Task'}</span>
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              STATE B: ANALYZED TASK REVIEW (Step 5 & 6)
              ===================================================================== */}
          {step === 'analyzed' && analysis && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase bg-tertiary/15 text-tertiary px-2 py-0.5 rounded">
                      Step 5: Analysis Complete
                    </span>
                    <span className="text-xs text-outline font-mono">AST Sliced</span>
                  </div>
                  <h2 className="text-xl font-bold text-on-surface mt-1">
                    Agent Understanding & Execution Plan
                  </h2>
                </div>
                <button
                  onClick={() => setStep('draft')}
                  className="text-xs text-outline hover:text-on-surface px-3 py-1.5 rounded bg-surface-container-low border border-surface-container-highest/40"
                >
                  ← Edit Instruction
                </button>
              </div>

              {/* What the Agent Understood */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-tertiary font-semibold">
                  <span className="material-symbols-outlined text-base">lightbulb</span>
                  <span>What the Agent Understood</span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed">
                  {analysis.understood_task}
                </p>
              </div>

              {/* Selected Files & Token Savings Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Relevant Files */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest/40 space-y-2">
                  <div className="text-xs font-mono uppercase text-outline">Relevant Files Identified</div>
                  <div className="space-y-1.5">
                    {analysis.relevant_files.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-container text-xs font-mono"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-sm text-tertiary">description</span>
                          <span className="text-on-surface truncate">{file.name}</span>
                        </div>
                        <span className="text-[10px] text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded">
                          {file.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Token Optimization Estimate */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest/40 space-y-2">
                  <div className="text-xs font-mono uppercase text-outline">Token Optimization (AST)</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-outline">Raw Repo Context:</span>
                      <span className="text-on-surface line-through opacity-70">
                        {analysis.estimated_tokens_raw.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-tertiary font-medium">Compacted Context:</span>
                      <span className="text-tertiary font-bold">
                        {analysis.estimated_tokens_compact.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="p-2 rounded bg-tertiary/10 border border-tertiary/30 text-xs font-mono text-tertiary flex items-center justify-between font-semibold">
                      <span>Gross Reduction:</span>
                      <span>-{analysis.token_savings_pct}% Tokens</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Provider & Execution Plan */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-outline">Selected Model Provider</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container-high text-primary font-medium">
                    {analysis.selected_provider}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-surface-container-highest/30">
                  <div className="text-xs font-mono uppercase text-outline">Proposed Execution Plan</div>
                  <div className="space-y-1.5">
                    {analysis.execution_plan.map((p) => (
                      <div key={p.step} className="flex items-start gap-2.5 text-xs">
                        <span className="w-5 h-5 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-mono font-bold shrink-0 mt-0.5">
                          {p.step}
                        </span>
                        <div>
                          <span className="font-semibold text-on-surface">{p.title}: </span>
                          <span className="text-outline">{p.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* STEP 6: Generate Solution Action Button */}
              <div className="pt-4 border-t border-surface-container-highest/40 flex items-center justify-between">
                <div className="text-xs text-outline">
                  Action approval gate is armed for all file writes and Git operations.
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-95 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-lg">play_arrow</span>
                  <span>Step 6: Generate Solution</span>
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              STATE C: GENERATING (In Progress)
              ===================================================================== */}
          {step === 'generating' && (
            <div className="p-12 text-center space-y-4 animate-fadeIn">
              <div className="relative inline-flex items-center justify-center">
                <span className="w-16 h-16 rounded-full border-4 border-tertiary/20 border-t-tertiary animate-spin"></span>
                <span className="material-symbols-outlined text-2xl text-tertiary absolute">smart_toy</span>
              </div>
              <h2 className="text-lg font-bold text-on-surface">Generating Token-Optimized Solution...</h2>
              <p className="text-xs text-outline max-w-md mx-auto">
                Executing AST slicing, streaming context through {isConfidential ? 'local Ollama' : 'Bifrost multi-provider cascade'}, and verifying sandbox tests.
              </p>
            </div>
          )}

          {/* =====================================================================
              STATE D & E: REVIEW & ACTION APPROVAL (Steps 7, 8, 9)
              ===================================================================== */}
          {(step === 'review' || step === 'completed') && activeTask && (
            <div className="space-y-6 animate-fadeIn">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-highest/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                        activeTask.status === 'completed'
                          ? 'bg-tertiary/20 text-tertiary'
                          : 'bg-secondary/20 text-secondary'
                      }`}
                    >
                      {activeTask.status === 'completed' ? 'Approved & Merged' : 'Step 8: Approval Required'}
                    </span>
                    <span className="text-xs text-outline font-mono">
                      Spent {activeTask.tokens_compressed} tok · Saved {activeTask.tokens_saved} tok ({activeTask.compression_ratio}%)
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-on-surface mt-1">
                    {activeTask.title}
                  </h2>
                </div>

                <button
                  onClick={handleStartFresh}
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-highest/40 text-on-surface hover:bg-surface-container"
                >
                  + New Task
                </button>
              </div>

              {/* Solution Summary Card */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest/40 space-y-2">
                <div className="text-xs font-mono uppercase text-tertiary font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Agent Solution Summary</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {activeTask.solution_summary}
                </p>
              </div>

              {/* STEP 7: Readable Code Diff */}
              <div className="rounded-xl bg-surface-container-lowest border border-surface-container-highest/40 overflow-hidden shadow-sm">
                <div className="p-3 bg-surface-container-low flex items-center justify-between border-b border-surface-container-highest/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-tertiary">difference</span>
                    <span className="text-xs font-mono uppercase text-on-surface font-semibold">
                      Step 7: Code Diff Review
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-tertiary">+28 lines</span>
                    <span className="text-error">-14 lines</span>
                  </div>
                </div>

                {/* Diff Viewer Text */}
                <div className="p-3 overflow-x-auto font-mono text-xs text-on-surface leading-relaxed select-text bg-[#0b0e14]">
                  <div className="text-outline pb-2 text-[11px] border-b border-surface-container-highest/20 mb-2">
                    --- a/pkg/cache/cache_manager.go<br />
                    +++ b/pkg/cache/cache_manager.go
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-outline">@@ -138,10 +138,13 @@ func (cm *CacheManager) EvictExpiredKeys(ctx context.Context) &#123;</div>
                    <div className="text-on-surface-variant">&nbsp;	cm.mu.Lock()</div>
                    <div className="text-on-surface-variant">&nbsp;	defer cm.mu.Unlock()</div>
                    <div className="text-error bg-error-container/20 px-1 rounded">-	// Unbounded buffer instantiation on every eviction tick</div>
                    <div className="text-error bg-error-container/20 px-1 rounded">-	rawBuffer := make([]byte, 0, 65536)</div>
                    <div className="text-error bg-error-container/20 px-1 rounded">-	buf := bytes.NewBuffer(rawBuffer)</div>
                    <div className="text-tertiary bg-tertiary-container/30 px-1 rounded">+	// Lease pre-allocated byte slice from sync.Pool</div>
                    <div className="text-tertiary bg-tertiary-container/30 px-1 rounded">+	bufPtr := bufferPool.Get().(*bytes.Buffer)</div>
                    <div className="text-tertiary bg-tertiary-container/30 px-1 rounded">+	bufPtr.Reset()</div>
                    <div className="text-tertiary bg-tertiary-container/30 px-1 rounded">+	defer bufferPool.Put(bufPtr)</div>
                    <div className="text-on-surface-variant">&nbsp;	for _, key := range cm.evictionQueue &#123;</div>
                  </div>
                </div>
              </div>

              {/* STEP 8: Action Approval Gate */}
              {activeTask.status !== 'completed' ? (
                <div className="p-5 rounded-xl bg-surface-container-low border border-primary/40 space-y-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-lg">shield</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface">
                        Step 8: Action Approval Required
                      </h3>
                      <p className="text-xs text-outline mt-0.5">
                        Explicit approval is required before writing files, modifying code, or performing Git operations. The agent cannot bypass this restriction.
                      </p>
                    </div>
                  </div>

                  {approvalMessage && (
                    <div className="p-2.5 rounded-lg bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs font-mono">
                      {approvalMessage}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApprovalAction('approved')}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-tertiary-container hover:bg-tertiary text-on-tertiary-container font-semibold text-sm transition-all shadow-md"
                    >
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      <span>Approve & Apply Changes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovalAction('revision_requested')}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-secondary font-medium text-xs transition-colors"
                    >
                      Request Revision
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovalAction('rejected')}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-error-container/30 hover:bg-error-container text-error font-medium text-xs transition-colors"
                    >
                      Reject & Revert
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 9: Execution Result Successfully Completed */
                <div className="p-5 rounded-xl bg-tertiary/10 border border-tertiary/40 space-y-3">
                  <div className="flex items-center gap-2.5 text-tertiary">
                    <span className="material-symbols-outlined text-xl">verified</span>
                    <span className="text-sm font-semibold font-mono uppercase">
                      Step 9: Changes Approved and Successfully Merged
                    </span>
                  </div>
                  <p className="text-xs text-outline leading-relaxed">
                    Code changes have been applied to branch <code className="text-on-surface">{activeTask.branch}</code>. Audit receipt signed with GPG key. No cloud leakage occurred.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleStartFresh}
                      className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90"
                    >
                      Start Next Task
                    </button>
                    <button
                      onClick={() => onNavigate('task-history')}
                      className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium hover:bg-surface-bright"
                    >
                      View in Task History
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          RIGHT: CONTEXTUAL RIGHT PANEL (Collapsible)
          ========================================================================= */}
      {isRightPanelOpen && (
        <aside className="w-80 h-full bg-surface-container-low border-l border-surface-container-highest/40 flex flex-col shrink-0 overflow-y-auto select-none transition-all">
          <div className="h-12 px-4 bg-surface-container flex items-center justify-between border-b border-surface-container-highest/40">
            <span className="text-xs font-mono uppercase text-outline font-semibold">
              Context & Telemetry
            </span>
            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="text-outline hover:text-on-surface p-1"
              title="Close panel"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <div className="p-4 space-y-5 text-xs">
            {/* Target Repository Scope */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-outline">Project & Privacy</span>
              <div className="p-3 rounded-lg bg-surface-container space-y-1">
                <div className="font-mono font-medium text-on-surface">{activeRepo?.name}</div>
                <div className="text-outline font-mono">{activeRepo?.branch}</div>
                <div className="pt-1 flex items-center gap-1.5 text-tertiary">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  <span>{isConfidential ? 'Confidential (Local Air-Gap)' : 'Standard Cloud Cascade'}</span>
                </div>
              </div>
            </div>

            {/* Token Optimization Breakdown */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-outline">Token Savings</span>
              <div className="p-3 rounded-lg bg-surface-container space-y-2 font-mono">
                <div className="flex justify-between text-outline">
                  <span>AST Compact Ratio:</span>
                  <span className="text-tertiary font-bold">
                    {activeTask?.compression_ratio ?? analysis?.token_savings_pct ?? 76.1}%
                  </span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Tokens Saved:</span>
                  <span className="text-on-surface">
                    {activeTask?.tokens_saved ?? 8080}
                  </span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Cost Avoided:</span>
                  <span className="text-primary font-bold">
                    ${activeTask?.cost_saved_usd ?? '0.038'}
                  </span>
                </div>
              </div>
            </div>

            {/* Execution Steps */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-outline">Agent Execution Steps</span>
              <div className="space-y-1">
                {(activeTask?.reasoning_steps || [
                  { step_number: 1, title: 'Parse AST symbols', duration_s: 0.12 },
                  { step_number: 2, title: 'Prune unused dependencies', duration_s: 0.28 },
                  { step_number: 3, title: 'Synthesize code solution', duration_s: 0.94 },
                  { step_number: 4, title: 'Verify unit test pass', duration_s: 0.65 },
                ]).map((s) => (
                  <div
                    key={s.step_number}
                    className="p-2 rounded bg-surface-container flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-xs text-tertiary">check_circle</span>
                      <span className="text-on-surface truncate">{s.title}</span>
                    </div>
                    <span className="font-mono text-outline shrink-0">{s.duration_s}s</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety & Action Approval Status */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-outline">Safety Enforcement</span>
              <div className="p-3 rounded-lg bg-surface-container space-y-1.5 text-outline">
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-xs text-tertiary">check</span>
                  <span>File write approval: Armed</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-xs text-tertiary">check</span>
                  <span>Shell execution: Armed</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-xs text-tertiary">check</span>
                  <span>Pre-flight budget limit: Enforced</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
