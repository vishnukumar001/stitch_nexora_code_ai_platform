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
  ActionApproval
} from './api';
import { NavigationSidebar } from './components/NavigationSidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './views/DashboardView';
import { WorkspaceView } from './views/WorkspaceView';
import { RepositoriesView } from './views/RepositoriesView';
import { TokenAnalyticsView } from './views/TokenAnalyticsView';
import { ModelRouterView } from './views/ModelRouterView';
import { BudgetManagerView } from './views/BudgetManagerView';
import { SecurityCenterView } from './views/SecurityCenterView';
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
      if (!selectedTask && dash.recent_activities?.length > 0) {
        setSelectedTask(dash.recent_activities[0]);
      }
    } catch (e) {
      console.error('Failed to load telemetry:', e);
    }
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
    setCurrentView('ai-coding-workspace');
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
      {/* Sidebar Navigation */}
      <NavigationSidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        killSwitchActive={killSwitchActive}
      />

      {/* Main Workspace Frame */}
      <div className="pl-[260px] flex-1 flex flex-col min-w-0">
        <TopHeader
          onNavigate={setCurrentView}
          pendingApprovalsCount={approvals.length}
          killSwitchActive={killSwitchActive}
          onToggleKillSwitch={handleToggleKillSwitch}
          activeRepo={activeRepo?.name || 'prod-core-monorepo'}
        />

        <main className="w-full pt-16 min-h-[calc(100vh-4rem)] flex-1 overflow-x-hidden">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              providers={providers}
              recentActivities={recentActivities}
              onNavigate={setCurrentView}
              onInspectTask={handleInspectTask}
            />
          )}

          {currentView === 'ai-coding-workspace' && (
            <WorkspaceView
              repositories={repositories}
              activeRepoId={activeRepoId}
              onSelectRepo={setActiveRepoId}
              currentTask={selectedTask}
              onTaskCompleted={(task) => {
                setSelectedTask(task);
                loadAllData();
              }}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'repositories' && (
            <RepositoriesView
              repositories={repositories}
              onRefresh={loadAllData}
              onSelectRepo={(id) => {
                setActiveRepoId(id);
              }}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'token-analytics' && <TokenAnalyticsView />}

          {currentView === 'model-router' && <ModelRouterView />}

          {currentView === 'budget-manager' && <BudgetManagerView />}

          {currentView === 'security-center' && (
            <SecurityCenterView
              killSwitchActive={killSwitchActive}
              onToggleKillSwitch={handleToggleKillSwitch}
            />
          )}

          {(currentView === 'settings' || currentView === 'task-history') && (
            <SettingsView
              providers={providers}
              onRefreshProviders={loadAllData}
              onInspectTask={handleInspectTask}
            />
          )}
        </main>
      </div>
    </div>
  );
}
export default App;
