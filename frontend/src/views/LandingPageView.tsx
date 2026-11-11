import React from 'react';

interface LandingPageProps {
  onLaunchConsole: () => void;
  onSignIn: () => void;
}

export const LandingPageView: React.FC<LandingPageProps> = ({ onLaunchConsole, onSignIn }) => {
  return (
    <div className="w-full min-h-screen bg-surface-container-lowest text-on-surface flex flex-col">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-surface-container-highest/40">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-space-sm cursor-pointer" onClick={onLaunchConsole}>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow">
              <span className="material-symbols-outlined text-xl">polyline</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
              NEXORA <span className="text-primary font-light">Code</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-space-lg font-body-sm text-body-sm text-on-surface-variant">
            <span className="text-primary font-medium">Overview</span>
            <span className="hover:text-on-surface transition-colors cursor-pointer" onClick={onLaunchConsole}>Workspace</span>
            <span className="hover:text-on-surface transition-colors cursor-pointer" onClick={onLaunchConsole}>Router</span>
            <span className="hover:text-on-surface transition-colors cursor-pointer" onClick={onLaunchConsole}>Token Analytics</span>
          </nav>

          <div className="flex items-center gap-space-md">
            <button
              onClick={onSignIn}
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onLaunchConsole}
              className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold hover:opacity-90 transition-opacity shadow-md"
            >
              Launch Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="w-full pt-28 pb-20 max-w-7xl mx-auto px-6 lg:px-12 flex-1">
        <div className="relative">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-r from-primary-container/20 via-tertiary-container/15 to-transparent blur-[120px] pointer-events-none rounded-full"></div>

          {/* Telemetry Pill */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-space-sm px-space-md py-1 rounded-full bg-surface-container-high/80 border border-surface-container-highest backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-tertiary">
                v3.4 Production Ready
              </span>
              <span className="text-outline text-label-sm">|</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                AST Context Compaction Live
              </span>
            </div>
          </div>

          {/* Hero Header */}
          <div className="text-center max-w-4xl mx-auto mb-10">
            <h1 className="font-headline-xl text-headline-xl lg:text-[54px] lg:leading-[62px] tracking-tight font-semibold text-on-surface">
              Code Smarter.{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent">
                Spend Fewer Tokens.
              </span>
            </h1>
            <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed">
              The intelligent, token-efficient AI coding agent built for high-velocity engineering teams. Slash inference bills by 65-90% with AST-aware context compaction, model-cascade routing, and verifiable local execution.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-space-md">
              <button
                onClick={onLaunchConsole}
                className="w-full sm:w-auto px-space-xl py-3.5 rounded-lg bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-on-primary font-headline-sm text-headline-sm font-semibold tracking-wide shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-space-sm"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>Launch Agent Console</span>
              </button>
              <button
                onClick={onLaunchConsole}
                className="w-full sm:w-auto px-space-xl py-3.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-all flex items-center justify-center gap-space-sm border border-surface-container-highest"
              >
                <span className="material-symbols-outlined text-[20px]">terminal</span>
                <span>Explore Live Demo Repos</span>
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-space-lg text-outline font-label-sm text-label-sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span> Zero-Egress Confidential Mode
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span> Multi-Provider Automatic Failover
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span> Pre-Flight Spending Limits
              </span>
            </div>
          </div>

          {/* Hero Token Compaction Interface Preview */}
          <div className="relative w-full max-w-5xl mx-auto mt-12">
            <div className="relative rounded-xl bg-surface-container-low border border-surface-container-highest/60 shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Window Chrome Toolbar */}
              <div className="h-10 px-4 bg-surface-container flex items-center justify-between border-b border-surface-container-highest/50">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-error inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-surface-bright inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-tertiary inline-block"></span>
                  <span className="ml-4 font-code-sm text-code-sm text-outline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">account_tree</span>
                    engine/ast_compiler.rs — Context Window Analyzer
                  </span>
                </div>
                <div className="flex items-center gap-space-md">
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">speed</span> 89% Compaction
                  </span>
                  <span className="font-label-sm text-label-sm text-outline">Cascade: Flash-Tier Active</span>
                </div>
              </div>

              {/* Split Execution Panes */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left: Naive Context Injection */}
                <div className="p-space-lg bg-surface-container-lowest/60 border-r border-surface-container-highest/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-md text-label-md uppercase tracking-wider text-outline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                        Standard LLM Context Dump
                      </span>
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-error-container/20 text-error">
                        Unoptimized
                      </span>
                    </div>
                    <div className="space-y-1.5 font-code-sm text-code-sm text-outline-variant select-none">
                      <div className="line-through opacity-40">// 4,200 lines full dependency tree loaded</div>
                      <div className="line-through opacity-40">// raw schema serialization bloat (62KB)</div>
                      <div className="p-2 rounded bg-surface-container/50 text-outline font-code-sm text-code-sm border border-surface-container-highest/30">
                        <span className="text-error font-bold">128,450 tokens</span> used for 1 symbol patch
                      </div>
                      <div className="line-through opacity-40">// duplicate standard library definitions</div>
                      <div className="line-through opacity-40">// test mock state fixtures (unreferenced)</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-surface-container-highest/40 bg-surface-container-low/70 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-label-sm text-label-sm text-outline">ESTIMATED RUNTIME COST</div>
                      <div className="font-headline-sm text-headline-sm text-error font-semibold">
                        $0.3855 <span className="font-body-sm text-body-sm text-outline">/ prompt</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-label-sm text-label-sm text-outline">LATENCY</div>
                      <div className="font-code-sm text-code-sm text-on-surface">3.82s TTFT</div>
                    </div>
                  </div>
                </div>

                {/* Right: NEXORA AST Compaction */}
                <div className="p-space-lg bg-surface-container/80 flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-md text-label-md uppercase tracking-wider text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">polyline</span>
                        NEXORA Semantic Graph Slicing
                      </span>
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary">
                        AST Compacted
                      </span>
                    </div>

                    <div className="space-y-1.5 font-code-sm text-code-sm text-on-surface">
                      <div className="text-secondary font-medium">
                        › AST Symbol Target: <span className="text-on-surface">`AuthSession::verify_jwt`</span>
                      </div>
                      <div className="text-outline-variant pl-4">└─ Resolved Call-Graph: 3 nodes isolated</div>
                      <div className="p-2 rounded bg-surface-container-high text-tertiary font-code-sm text-code-sm flex items-center justify-between border border-tertiary/20">
                        <span>14,190 tokens in active frame</span>
                        <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary text-on-tertiary font-semibold">
                          -89% SAVED
                        </span>
                      </div>
                      <div className="text-on-surface-variant pl-4">✓ Stripped unreferenced standard imports</div>
                      <div className="text-tertiary pl-4">✓ Synthesizing local diff verification sandbox</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-surface-container-highest/40 bg-surface-container-low/70 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-label-sm text-label-sm text-outline">OPTIMIZED RUNTIME COST</div>
                      <div className="font-headline-sm text-headline-sm text-tertiary font-semibold">
                        $0.0420 <span className="font-body-sm text-body-sm text-outline">/ prompt</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-label-sm text-label-sm text-outline">LATENCY</div>
                      <div className="font-code-sm text-code-sm text-on-surface font-semibold text-tertiary">
                        0.42s (9x faster)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
