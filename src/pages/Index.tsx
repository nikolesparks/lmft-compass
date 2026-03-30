import { useState, useCallback, useEffect } from 'react';
import { AppState, OnboardingData, WeeklyLog } from '@/lib/types';
import { loadState, saveState, clearState } from '@/lib/storage';
import { calculateProjection, calculateLiveProjection, getRequirementStatuses, getOverallProgress } from '@/lib/projection-engine';
import { exportSummary } from '@/lib/export';
import { OnboardingForm } from '@/components/OnboardingForm';
import { DashboardSummary } from '@/components/DashboardSummary';
import { WeeklyLogForm } from '@/components/WeeklyLogForm';
import { RequirementTable } from '@/components/RequirementTable';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ProgressVisualization } from '@/components/ProgressVisualization';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Index() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const handleOnboarding = useCallback((data: OnboardingData) => {
    const originalProjection = calculateProjection(data);
    setState({
      onboarding: data,
      weeklyLogs: [],
      originalProjection,
      isOnboarded: true,
    });
    toast.success('Setup complete! Your projections are ready.');
  }, []);

  const handleWeeklyLog = useCallback((log: WeeklyLog) => {
    setState(prev => ({
      ...prev,
      weeklyLogs: [...prev.weeklyLogs, log],
    }));
    toast.success('Weekly hours logged. Live projection updated.');
  }, []);

  const handleSettingsSave = useCallback((updated: OnboardingData) => {
    setState(prev => ({ ...prev, onboarding: updated }));
    toast.success('Settings saved. Projections recalculated.');
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('Reset all data? This cannot be undone.')) {
      clearState();
      setState(loadState());
    }
  }, []);

  if (!state.isOnboarded || !state.onboarding || !state.originalProjection) {
    return <OnboardingForm onComplete={handleOnboarding} />;
  }

  const liveProjection = calculateLiveProjection(state.onboarding, state.weeklyLogs);
  const requirements = getRequirementStatuses(state.onboarding, state.weeklyLogs, state.originalProjection, liveProjection);
  const overallProgress = getOverallProgress(state.onboarding, state.weeklyLogs);

  const handleExport = () => {
    exportSummary(requirements, state.originalProjection!, liveProjection, overallProgress);
    toast.success('Summary exported.');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LMFT Hour Tracker</h1>
            <p className="text-sm text-muted-foreground">California BBS Licensure Progress</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>Export Summary</Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <DashboardSummary
          originalProjection={state.originalProjection}
          liveProjection={liveProjection}
          overallProgress={overallProgress}
          requirements={requirements}
        />

        <Tabs defaultValue="log" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="log">Weekly Log</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-4">
            <WeeklyLogForm onSubmit={handleWeeklyLog} />
            {state.weeklyLogs.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Logs</h3>
                <div className="space-y-2">
                  {[...state.weeklyLogs].reverse().slice(0, 10).map(log => (
                    <div key={log.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                      <span className="font-medium">{new Date(log.weekDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <div className="flex gap-4 text-muted-foreground">
                        <span>{log.totalHours}h total</span>
                        <span>{log.directClientHours}h direct</span>
                        <span>{log.couplesFamilyHours}h C/F</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details">
            <RequirementTable requirements={requirements} />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressVisualization requirements={requirements} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel settings={state.onboarding} onSave={handleSettingsSave} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
