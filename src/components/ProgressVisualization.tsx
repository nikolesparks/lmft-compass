import { RequirementStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProgressVisualizationProps {
  requirements: RequirementStatus[];
}

function ProgressBar({ label, accrued, required, status }: { label: string; accrued: number; required: number; status: RequirementStatus['status'] }) {
  const pct = Math.min(100, (accrued / required) * 100);
  
  const barColor = {
    'met': 'bg-success',
    'on-track': 'bg-primary',
    'slightly-behind': 'bg-warning',
    'falling-behind': 'bg-danger',
  }[status];

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{accrued.toLocaleString()} accrued</span>
        <span>{required.toLocaleString()} required</span>
      </div>
    </div>
  );
}

export function ProgressVisualization({ requirements }: ProgressVisualizationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progress Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {requirements.map(r => (
          <ProgressBar
            key={r.label}
            label={r.label}
            accrued={r.accrued}
            required={r.required}
            status={r.status}
          />
        ))}
      </CardContent>
    </Card>
  );
}
