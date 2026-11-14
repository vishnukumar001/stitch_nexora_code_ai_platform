import React, { useState } from 'react';
import { Repository, updateRepoPrivacy } from '../api';

interface ProjectsProps {
  repositories: Repository[];
  onRefresh: () => void;
  onSelectRepo: (repoId: string) => void;
  onNavigate: (view: string) => void;
}

export const ProjectsView: React.FC<ProjectsProps> = ({
  repositories,
  onRefresh,
  onSelectRepo,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  const handleToggleConfidential = async (repo: Repository) => {
    setIsUpdatingId(repo.id);
    try {
      await updateRepoPrivacy(repo.id, !repo.is_confidential);
      onRefresh();
    } catch (err: any) {
      alert(`Privacy toggle failed: ${err.message}`);
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleStartTaskOnRepo = (repoId: string) => {
    onSelectRepo(repoId);
    onNavigate('new-task');
  };

  const filtered = repositories.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-3 sm:p-6 md:p-8 space-y-6 text-on-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Projects & Repositories</h1>
          <p className="text-sm text-outline mt-1">
            Configure privacy boundaries and AST context slicing per repository.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined text-sm text-outline absolute left-3 top-2.5">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-highest/60 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Repositories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((repo) => (
          <div
            key={repo.id}
            className="p-5 rounded-xl bg-surface-container-low border border-surface-container-highest/40 flex flex-col justify-between space-y-4 hover:border-surface-container-highest transition-colors shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-xl">folder</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface font-mono">
                      {repo.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-outline font-mono mt-0.5">
                      <span>{repo.branch}</span>
                      <span>•</span>
                      <span>{repo.language}</span>
                    </div>
                  </div>
                </div>

                {/* Confidential Shield Badge */}
                <span
                  className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded font-medium flex items-center gap-1 ${
                    repo.is_confidential
                      ? 'bg-primary-container/20 text-primary border border-primary/30'
                      : 'bg-surface-container-high text-outline'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {repo.is_confidential ? 'shield_lock' : 'public'}
                  </span>
                  <span>{repo.is_confidential ? 'Confidential' : 'Standard'}</span>
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container text-xs space-y-1.5">
                <div className="flex justify-between text-outline">
                  <span>AST Slicing:</span>
                  <span className="text-tertiary font-mono">Indexed & Ready</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Privacy Enforcement:</span>
                  <span className="text-on-surface font-mono">
                    {repo.is_confidential ? 'Strict Local Ollama (Zero Egress)' : 'Optimized Cloud Cascade'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-surface-container-highest/30 flex items-center justify-between gap-3">
              {/* Privacy Toggle Button */}
              <button
                onClick={() => handleToggleConfidential(repo)}
                disabled={isUpdatingId === repo.id}
                className="text-xs text-outline hover:text-on-surface flex items-center gap-1 transition-colors"
                title="Toggle Confidentiality Mode"
              >
                <span className="material-symbols-outlined text-sm">
                  {repo.is_confidential ? 'lock_open' : 'lock'}
                </span>
                <span>
                  {repo.is_confidential ? 'Make Standard' : 'Make Confidential'}
                </span>
              </button>

              {/* Start Task Button */}
              <button
                onClick={() => handleStartTaskOnRepo(repo.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-sm">terminal</span>
                <span>Start Task</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

