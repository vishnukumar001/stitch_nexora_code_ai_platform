import React, { useState, useEffect } from 'react';
import {
  fetchHealth,
  fetchDashboard,
  fetchRepositories,
  fetchApprovals,
  toggleKillSwitch,
  KPIStats,
  Provider,
  TaskRecord,
  Repository,
  ActionApproval,
} from './api';
import { NavigationSidebar } from './components/NavigationSidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './views/DashboardView';
import { WorkspaceView } from './views/WorkspaceView';
import { ProjectsView } from './views/ProjectsView';
import { TaskHistoryView } from './views/TaskHistoryView';
import { UsageTokensView } from './views/UsageTokensView';
import { SettingsView } from './views/SettingsView';
import { LandingPageView } from './views/LandingPageView';
import { AuthView } from './views/AuthView';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recentActivities, setRecentActivities] = useState<TaskRecord[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string>('repo-core');
  const [approvals, setApprovals] = useState<ActionApproval[]>([]);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      const [dash, repos, apprs, health] = await Promise.all([
        fetchDashboard(),
        fetchRepositories(),
        fetchApprovals(),
        fetchHealth(),
      ]);

      setStats(dash.kpis);
      setProviders(dash.providers);
      setRecentActivities(dash.recent_activities);
      setRepositories(repos);
      setApprovals(apprs);
      setKillSwitchActive(health.kill_switch_active);
    } catch (e) {
      console.error('Failed to load telemetry:', e);
    }
  };

  const handleNavigate = (view: string) => {
    if (view === 'new-task') {
      setSelectedTask(null);
    }
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleToggleKillSwitch = async () => {
    try {
      const res = await toggleKillSwitch(!killSwitchActive);
      setKillSwitchActive(res.kill_switch_engaged);
      loadAllData();
    } catch (e: any) {
      alert(`Kill switch error: ${e.message}`);
    }
  };

  const handleInspectTask = (task: TaskRecord) => {
    setSelectedTask(task);
    setCurrentView('new-task');
  };

  const activeRepo = repositories.find((r) => r.id === activeRepoId) || repositories[0];

  // Standalone Views (No Sidebar)
  if (currentView === 'landing') {
    return (
      <LandingPageView
        onLaunchConsole={() => setCurrentView('dashboard')}
        onSignIn={() => setCurrentView('auth')}
      />
    );
  }

  if (currentView === 'auth') {
    return (
      <AuthView
        onSuccess={() => setCurrentView('dashboard')}
        onBackToLanding={() => setCurrentView('landing')}
      />
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-surface-container-lowest text-on-surface">
      {/* 1. Left Sidebar Navigation */}
      <NavigationSidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        killSwitchActive={killSwitchActive}
        activeRepoName={activeRepo?.name || 'prod-core-monorepo'}
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Content Frame */}
      <div className="lg:pl-[250px] pl-0 flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <TopHeader
          onNavigate={handleNavigate}
          pendingApprovalsCount={approvals.length}
          killSwitchActive={killSwitchActive}
          onToggleKillSwitch={handleToggleKillSwitch}
          activeRepo={activeRepo?.name || 'prod-core-monorepo'}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="w-full pt-16 min-h-[calc(100vh-4rem)] flex-1 overflow-x-hidden">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              providers={providers}
              recentActivities={recentActivities}
              activeRepoName={activeRepo?.name || 'prod-core-monorepo'}
              onNavigate={handleNavigate}
              onInspectTask={handleInspectTask}
            />
          )}

          {(currentView === 'new-task' || currentView === 'ai-coding-workspace') && (
            <WorkspaceView
              repositories={repositories}
              activeRepoId={activeRepoId}
              onSelectRepo={setActiveRepoId}
              currentTask={selectedTask}
              onTaskCompleted={(task) => {
                setSelectedTask(task);
                loadAllData();
              }}
              onClearTask={() => setSelectedTask(null)}
              onNavigate={handleNavigate}
            />
          )}

          {(currentView === 'projects' || currentView === 'repositories') && (
            <ProjectsView
              repositories={repositories}
              onRefresh={loadAllData}
              onSelectRepo={(id) => {
                setActiveRepoId(id);
              }}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'task-history' && (
            <TaskHistoryView
              tasks={recentActivities}
              onInspectTask={handleInspectTask}
              onNavigate={handleNavigate}
            />
          )}

          {(currentView === 'usage-tokens' || currentView === 'token-analytics' || currentView === 'budget-manager') && (
            <UsageTokensView />
          )}

          {(currentView === 'settings' || currentView === 'model-router' || currentView === 'security-center') && (
            <SettingsView
              providers={providers}
              onRefreshProviders={loadAllData}
              killSwitchActive={killSwitchActive}
              onToggleKillSwitch={handleToggleKillSwitch}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
