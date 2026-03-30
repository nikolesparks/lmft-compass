import { RequirementStatus, Projection } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DashboardSummaryProps {
  originalProjection: Projection;
  liveProjection: Projection;
  overallProgress: number;
  requirements: RequirementStatus[];
}

function StatusBadge({ status, isWeekConstraint }: { status: RequirementStatus['status']; isWeekConstraint?: boolean }) {
  const config = {
    'met': { emoji: '✅', label: 'Met', className: 'bg-success/15 text-success' },
    'on-track': { emoji: '🟢', label: 'On Track', className: 'bg-success/15 text-success' },
    'slightly-behind': { emoji: '🟡', label: 'Slightly Behind', className: 'bg-warning/15 text-warning' },
    'falling-behind': { emoji: '🔴', label: 'Falling Behind', className: 'bg-danger/15 text-danger' },
  };
  const c = config[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
        {c.emoji} {c.label}
      </span>
      {isWeekConstraint && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
          ⚠️ Bottleneck
        </span>
      )}
    </div>
  );
}

export function DashboardSummary({ originalProjection, liveProjection, overallProgress, requirements }: DashboardSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-serif-display">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Original Target Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif-display">
              {new Date(originalProjection.licensureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Live Projected Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif-display">
              {new Date(liveProjection.licensureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requirement Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {requirements.map(r => (
          <Card key={r.label}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{r.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold font-serif-display">
                {r.accrued.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {r.required.toLocaleString()}</span>
              </div>
              <Progress value={Math.min(100, (r.accrued / r.required) * 100)} className="h-1.5" />
              <StatusBadge status={r.status} isWeekConstraint={r.isWeekConstraint} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
