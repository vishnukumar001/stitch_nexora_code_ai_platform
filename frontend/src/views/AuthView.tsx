import React, { useState } from 'react';

interface AuthProps {
  onSuccess: () => void;
  onBackToLanding: () => void;
}

export const AuthView: React.FC<AuthProps> = ({ onSuccess, onBackToLanding }) => {
  const [email, setEmail] = useState('elena.rostova@nexora.cloud');
  const [password, setPassword] = useState('••••••••••••');
  const [tab, setTab] = useState<'signin' | 'team'>('signin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess();
  };

  return (
    <div className="w-full min-h-screen bg-surface-container-lowest text-on-surface antialiased flex items-center justify-center p-gutter md:p-margin relative overflow-hidden select-none">
      {/* Subtle Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-tertiary/10 blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-xl z-10">
        {/* Top System Architecture Badge */}
        <div className="flex items-center justify-between px-space-md py-space-xs bg-surface-container-low rounded-t-xl text-on-surface-variant border border-surface-container-highest/40 border-b-0">
          <div className="flex items-center gap-space-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary">
              CORE-GATEWAY-V3.8
            </span>
          </div>
          <div className="flex items-center gap-space-sm font-label-sm text-label-sm">
            <span className="text-on-surface-variant/80">LATENCY: 14ms</span>
            <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-code-sm text-[10px]">
              TLS 1.3
            </span>
          </div>
        </div>

        {/* Center Card Panel */}
        <div className="bg-surface-container rounded-b-xl border border-surface-container-highest/60 shadow-2xl p-margin md:p-space-xl flex flex-col gap-space-lg backdrop-blur-xl">
          {/* Header Section */}
          <div className="flex flex-col items-center text-center gap-space-sm">
            <div
              className="flex items-center gap-space-sm cursor-pointer"
              onClick={onBackToLanding}
            >
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center shadow-lg border border-primary/30">
                <span className="material-symbols-outlined text-primary text-2xl">polyline</span>
              </div>
              <span className="font-headline-md text-headline-md tracking-tight text-on-surface font-semibold">
                NEXORA <span className="text-primary font-light">Code</span>
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm border border-surface-container-highest">
              <span className="material-symbols-outlined text-[13px] text-tertiary">verified_user</span>
              <span>Enterprise SSO & Passkey Ready</span>
            </div>

            <div className="mt-space-xs flex flex-col gap-1">
              <h1 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Welcome to NEXORA Code
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                Sign in to access your token-optimized AI development environments.
              </p>
            </div>
          </div>

          {/* Mode Switcher Toggle */}
          <div className="grid grid-cols-2 p-1 rounded-lg bg-surface-container-lowest border border-surface-container-highest/40">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`py-1.5 rounded-md font-label-md text-label-md transition-all ${
                tab === 'signin'
                  ? 'bg-surface-container text-on-surface shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('team')}
              className={`py-1.5 rounded-md font-label-md text-label-md transition-all flex items-center justify-center gap-1 ${
                tab === 'team'
                  ? 'bg-surface-container text-on-surface shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Create Team Account</span>
              <span className="px-1 py-0.2 rounded bg-primary/20 text-primary text-[9px] uppercase font-bold">14d Pro</span>
            </button>
          </div>

          {/* Authentication Action Deck */}
          <div className="flex flex-col gap-space-md">
            {/* Primary SSO: GitHub */}
            <button
              type="button"
              onClick={onSuccess}
              className="w-full py-space-sm px-space-md rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md flex items-center justify-between transition-all shadow-lg active:scale-[0.99]"
            >
              <div className="flex items-center gap-space-sm">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span className="font-semibold tracking-wide">Continue with GitHub</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="font-code-sm text-code-sm bg-on-primary/20 px-1.5 py-0.5 rounded text-[11px]">⌘</span>
                <span className="font-code-sm text-code-sm bg-on-primary/20 px-1.5 py-0.5 rounded text-[11px]">G</span>
              </div>
            </button>

            {/* Secondary SSO Providers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <button
                type="button"
                onClick={onSuccess}
                className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 transition-all border border-surface-container-highest"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary">alt_route</span>
                <span>GitLab / Bitbucket</span>
              </button>
              <button
                type="button"
                onClick={onSuccess}
                className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 transition-all border border-surface-container-highest"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">key</span>
                <span>Enterprise SAML</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-space-xs">
              <div className="w-full h-px bg-surface-container-highest"></div>
              <span className="absolute bg-surface-container px-space-sm font-label-sm text-label-sm text-outline uppercase tracking-widest text-[9px]">
                or authenticate via developer credentials
              </span>
            </div>

            {/* Credential Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="text-primary font-code-sm font-bold">›</span> WORK EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="text-primary font-code-sm font-bold">›</span> HARDWARE PASSKEY / SECRET
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-code-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:opacity-90 transition-all shadow-md mt-1"
              >
                Authenticate & Launch Console
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

