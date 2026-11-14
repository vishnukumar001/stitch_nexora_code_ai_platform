import React, { useState } from 'react';
import { Repository, updateRepoPrivacy } from '../api';

interface RepositoriesProps {
  repositories: Repository[];
  onRefresh: () => void;
  onSelectRepo: (repoId: string) => void;
  onNavigate: (view: string) => void;
}

export const RepositoriesView: React.FC<RepositoriesProps> = ({
  repositories,
  onRefresh,
  onSelectRepo,
  onNavigate,
}) => {
  const [selectedRepoId, setSelectedRepoId] = useState<string>(repositories[0]?.id || 'repo-core');
  const [filterQuery, setFilterQuery] = useState('');
  const [branch, setBranch] = useState('feat/ast-token-compress');
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  const selectedRepo = repositories.find((r) => r.id === selectedRepoId) || repositories[0];

  const handleToggleConfidential = async (repo: Repository) => {
    setIsUpdatingPrivacy(true);
    try {
      await updateRepoPrivacy(repo.id, !repo.is_confidential);
      onRefresh();
    } catch (err: any) {
      alert(`Privacy toggle failed: ${err.message}`);
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const fileTree = [
    { name: 'pkg/cache/cache_manager.go', loc: 420, tokensRaw: 1840, tokensCompacted: 340, status: 'AST Focus' },
    { name: 'pkg/cache/cache_test.go', loc: 180, tokensRaw: 820, tokensCompacted: 410, status: 'Full AST' },
    { name: 'pkg/cache/buffer_pool.go', loc: 95, tokensRaw: 460, tokensCompacted: 90, status: 'KV Scope' },
    { name: 'services/gateway/src/token.rs', loc: 640, tokensRaw: 2900, tokensCompacted: 520, status: 'WASM Stub' },
    { name: 'config/runtime.yaml', loc: 45, tokensRaw: 190, tokensCompacted: 40, status: 'Pruned' },
  ];

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* Top Command Bar */}
      <section className="w-full bg-surface-container-low px-margin py-space-md border-b border-surface-container-highest/40 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
          <div className="flex items-center gap-space-md min-w-0">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-inner border border-surface-container-highest">
              <span className="material-symbols-outlined text-xl">emoji_symbols</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-semibold">
                  Repository Explorer
                </span>
                <span className="font-label-sm text-label-sm uppercase px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary">
                  AST Engine v3
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-outline truncate">
                Multi-repo deterministic semantic graph & local-first token caching telemetry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Branch Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-code-sm text-code-sm border border-surface-container-highest">
              <span className="material-symbols-outlined text-sm text-secondary">alt_route</span>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-transparent text-on-surface font-medium focus:outline-none cursor-pointer"
              >
                <option value="feat/ast-token-compress" className="bg-surface-container-high">feat/ast-token-compress</option>
                <option value="main" className="bg-surface-container-high">main (protected)</option>
                <option value="staging-v2.4" className="bg-surface-container-high">staging-v2.4</option>
              </select>
            </div>

            {/* Filter Input */}
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-sm text-outline">filter_alt</span>
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter files (e.g. *.go)..."
                className="w-52 pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm border border-surface-container-highest focus:outline-none"
              />
            </div>

            <button
              onClick={() => onNavigate('ai-coding-workspace')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-body-sm text-body-sm font-medium hover:opacity-90 shadow transition-all"
            >
              <span className="material-symbols-outlined text-base">terminal</span>
              <span>Launch Agent on Repo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Grid: Left 28%, Right 72% */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-8rem)]">
        {/* Left Column: Target Workspaces */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-surface-container-low border-r border-surface-container-highest/40 p-space-md space-y-space-md">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Target Workspaces ({repositories.length})
            </span>
            <span className="font-label-sm text-label-sm text-tertiary font-code-sm">AST Realtime</span>
          </div>

          <div className="flex flex-col gap-2">
            {repositories.map((repo) => {
              const isSelected = repo.id === selectedRepoId;
              return (
                <div
                  key={repo.id}
                  onClick={() => {
                    setSelectedRepoId(repo.id);
                    onSelectRepo(repo.id);
                  }}
                  className={`p-space-sm rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-surface-container border-primary/50 shadow-md'
                      : 'bg-surface-container-lowest border-surface-container-highest/40 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          repo.is_confidential ? 'bg-primary' : 'bg-tertiary animate-pulse'
                        }`}
                      ></span>
                      <span className="font-code-sm text-code-sm font-semibold truncate">
                        {repo.name}
                      </span>
                    </div>

                    {repo.is_confidential ? (
                      <span className="font-label-sm text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary-container/30 text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">shield_lock</span>
                        Confidential
                      </span>
                    ) : (
                      <span className="font-label-sm text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary">
                        Public / Internal
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-surface-container-highest/30 text-outline font-label-sm text-label-sm">
                    <span>{repo.language}</span>
                    <span className="text-tertiary font-code-sm">99.8% AST indexed</span>
                  </div>

                  {/* Confidential Shield Action Toggle */}
                  <div className="mt-2.5 pt-2 border-t border-surface-container-highest/30 flex items-center justify-between">
                    <span className="font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-primary">security</span>
                      Local-Only Shield:
                    </span>
                    <button
                      type="button"
                      disabled={isUpdatingPrivacy}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleConfidential(repo);
                      }}
                      className={`px-2 py-0.5 rounded font-label-sm text-[11px] font-semibold transition-colors ${
                        repo.is_confidential
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-highest text-outline hover:text-on-surface'
                      }`}
                    >
                      {repo.is_confidential ? 'Active (Local Only)' : 'Enable Shield'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy Invariant Callout */}
          <div className="p-3 rounded-lg bg-surface-container border border-surface-container-highest/60 text-on-surface-variant text-body-sm space-y-1">
            <div className="flex items-center gap-1.5 text-primary font-label-md text-label-md font-semibold">
              <span className="material-symbols-outlined text-sm">gavel</span>
              <span>Requirement B Enforcement</span>
            </div>
            <p className="text-[12px] text-outline leading-relaxed">
              When Confidential Shield is engaged, NEXORA Code enforces backend-controlled Zero-Egress.
              All AST queries route strictly to local models (e.g. Local Ollama Qwen 2.5 Coder).
            </p>
          </div>
        </aside>

        {/* Right Column: AST Semantic Tree & File Explorer */}
        <main className="lg:col-span-8 xl:col-span-9 p-space-lg space-y-space-md bg-surface-container-lowest">
          <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-highest/40">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {selectedRepo?.name}
                </h2>
                {selectedRepo?.is_confidential && (
                  <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm border border-primary/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">shield_lock</span>
                    Zero Cloud Egress Active
                  </span>
                )}
              </div>
              <p className="font-body-sm text-body-sm text-outline mt-0.5">
                AST Context Compaction & Deterministic Semantic Graph Loci
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1 px-2.5 rounded bg-surface-container font-code-sm text-code-sm text-tertiary border border-surface-container-highest">
                Average Savings: 82.4%
              </div>
            </div>
          </div>

          {/* File Slices List */}
          <div className="space-y-2">
            <div className="text-outline font-label-sm text-label-sm uppercase tracking-wider px-2 flex justify-between">
              <span>Indexed AST File Slices</span>
              <span>Raw LOC / Compressed Tokens</span>
            </div>

            <div className="divide-y divide-surface-container-highest/40 rounded-xl bg-surface-container border border-surface-container-highest/40 overflow-hidden">
              {fileTree
                .filter((f) => f.name.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((file) => (
                  <div
                    key={file.name}
                    className="p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-tertiary text-lg">code</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-code-sm text-code-sm text-on-surface font-medium truncate">
                          {file.name}
                        </span>
                        <span className="font-label-sm text-[11px] text-outline">
                          Locus: CacheManager::EvictExpiredKeys
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-space-md font-code-sm text-code-sm">
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest text-tertiary">
                        {file.status}
                      </span>
                      <div className="flex flex-col text-right">
                        <span className="text-on-surface font-semibold">{file.tokensCompacted} tok</span>
                        <span className="text-outline text-xs line-through">{file.tokensRaw} raw ({file.loc} loc)</span>
                      </div>
                      <button
                        onClick={() => onNavigate('ai-coding-workspace')}
                        className="px-2.5 py-1 rounded bg-surface-container-highest text-primary hover:bg-primary hover:text-on-primary transition-all font-label-sm text-label-sm"
                      >
                        Inspect AST
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

