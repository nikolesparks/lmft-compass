import { useState } from 'react';
import { RequirementStatus, WeeklyLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TargetPacingProps {
  requirements: RequirementStatus[];
  weeklyLogs: WeeklyLog[];
  targetDate: string | null;
  onSave: (date: string | null) => void;
}

const RECENT_WINDOW = 8;

function weeksUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return (target - now) / (7 * 24 * 60 * 60 * 1000);
}

export function TargetPacing({ requirements, weeklyLogs, targetDate, onSave }: TargetPacingProps) {
  const [draft, setDraft] = useState(targetDate ?? '');

  const recent = [...weeklyLogs]
    .sort((a, b) => new Date(a.weekDate).getTime() - new Date(b.weekDate).getTime())
    .slice(-RECENT_WINDOW);

  const avg = (pick: (l: WeeklyLog) => number) =>
    recent.length ? recent.reduce((s, l) => s + pick(l), 0) / recent.length : 0;

  const averages: Record<string, number> = {
    'Total Supervised Hours': avg(l => l.totalHours),
    'Direct Client Hours': avg(l => l.directClientHours),
    'Couples/Family Therapy': avg(l => l.couplesFamilyHours),
    'Supervision Weeks': recent.length ? 1 : 0,
  };

  const weeks = targetDate ? weeksUntil(targetDate) : 0;
  const rows = requirements.map(r => {
    const needed = weeks > 0 ? r.remaining / weeks : Infinity;
    const current = averages[r.label] ?? 0;
    const met = r.remaining <= 0;
    return { ...r, needed, current, met, onTrack: met || current >= needed };
  });

  const feasible = targetDate !== null && weeks > 0;
  const allOnTrack = rows.every(r => r.onTrack);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Target Completion Date</CardTitle>
        <CardDescription>
          Set a goal date to see the weekly pace required in each category, compared with your
          average over the last {RECENT_WINDOW} logged weeks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Desired Completion Date</Label>
            <Input type="date" value={draft} onChange={e => setDraft(e.target.value)} className="w-52" />
          </div>
          <Button onClick={() => onSave(draft || null)}>{targetDate ? 'Update Target' : 'Set Target'}</Button>
          {targetDate && (
            <Button variant="ghost" onClick={() => { setDraft(''); onSave(null); }}>Clear</Button>
          )}
        </div>

        {!targetDate && (
          <p className="text-sm text-muted-foreground">No target date set yet.</p>
        )}

        {targetDate && !feasible && (
          <p className="text-sm text-destructive">That target date is in the past — pick a future date.</p>
        )}

        {feasible && (
          <>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                {weeks.toFixed(1)} weeks remaining until{' '}
                {new Date(targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className={allOnTrack ? 'text-success font-medium' : 'text-warning font-medium'}>
                {recent.length === 0
                  ? 'No logged weeks yet — log hours to compare your pace.'
                  : allOnTrack
                    ? '🟢 On track for this target'
                    : '🔴 Off track for this target'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium text-right">Remaining</th>
                    <th className="pb-3 font-medium text-right">Needed / Week</th>
                    <th className="pb-3 font-medium text-right">Recent Avg / Week</th>
                    <th className="pb-3 font-medium text-right">Gap</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.label} className="border-b last:border-0">
                      <td className="py-3 font-medium">{r.label}</td>
                      <td className="py-3 text-right text-muted-foreground">{r.remaining.toLocaleString()}</td>
                      <td className="py-3 text-right font-medium">{r.met ? '—' : r.needed.toFixed(1)}</td>
                      <td className="py-3 text-right">{r.current.toFixed(1)}</td>
                      <td className="py-3 text-right">
                        {r.met ? '—' : `${r.current - r.needed >= 0 ? '+' : ''}${(r.current - r.needed).toFixed(1)}`}
                      </td>
                      <td className="py-3 text-center">
                        {r.met ? '✅' : r.onTrack ? '🟢' : '🔴'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Supervision weeks accrue one per logged week, so its required pace is capped by calendar time.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
