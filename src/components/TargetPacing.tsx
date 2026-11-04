import { useEffect, useState } from 'react';
import { RequirementStatus, WeeklyLog } from '@/lib/types';
import { computePacing, RECENT_WINDOW } from '@/lib/pacing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PacingCoach } from '@/components/PacingCoach';
import { OnboardingData } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TargetPacingProps {
  requirements: RequirementStatus[];
  weeklyLogs: WeeklyLog[];
  targetDate: string | null;
  onSave: (date: string | null) => void;
  settings?: OnboardingData;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export function TargetPacing({ requirements, weeklyLogs, targetDate, onSave, settings }: TargetPacingProps) {
  const [draft, setDraft] = useState(targetDate ?? '');
  const [auto, setAuto] = useState(true);
  const [snapshot, setSnapshot] = useState({ requirements, weeklyLogs });
  const [whatIf, setWhatIf] = useState('');

  useEffect(() => {
    if (auto) setSnapshot({ requirements, weeklyLogs });
  }, [auto, requirements, weeklyLogs]);

  const reqs = auto ? requirements : snapshot.requirements;
  const logs = auto ? weeklyLogs : snapshot.weeklyLogs;
  const stale = !auto && snapshot.weeklyLogs !== weeklyLogs;

  const p = targetDate ? computePacing(reqs, logs, targetDate) : null;
  const w = whatIf ? computePacing(reqs, logs, whatIf) : null;
  const chartData = p?.feasible
    ? p.rows.filter(r => r.label !== 'Supervision Weeks').map(r => ({
        name: r.label.replace(' Hours', '').replace(' Therapy', ''),
        Required: r.met ? 0 : +r.needed.toFixed(1),
        'Recent Avg': +r.current.toFixed(1),
      }))
    : [];

  return (
    <div className="space-y-4">
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
            {targetDate && <Button variant="ghost" onClick={() => { setDraft(''); onSave(null); }}>Clear</Button>}
            <div className="ml-auto flex items-center gap-2">
              <Switch id="auto-recalc" checked={auto} onCheckedChange={setAuto} />
              <Label htmlFor="auto-recalc" className="text-sm">Auto-recalculate on log changes</Label>
              {!auto && (
                <Button size="sm" variant="outline" disabled={!stale} onClick={() => setSnapshot({ requirements, weeklyLogs })}>
                  Recalculate now
                </Button>
              )}
            </div>
          </div>
          {stale && <p className="text-xs text-warning">Your logs changed since the last recalculation.</p>}

          {!targetDate && <p className="text-sm text-muted-foreground">No target date set yet.</p>}
          {p && !p.feasible && <p className="text-sm text-destructive">That target date is in the past — pick a future date.</p>}

          {p?.feasible && (
            <>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">{p.weeks.toFixed(1)} weeks remaining until {fmtDate(targetDate!)}</span>
                <span className={p.allOnTrack ? 'text-success font-medium' : 'text-warning font-medium'}>
                  {p.recentCount === 0 ? 'No logged weeks yet — log hours to compare your pace.'
                    : p.allOnTrack ? '🟢 On track for this target' : '🔴 Off track for this target'}
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
                    {p.rows.map(r => (
                      <tr key={r.label} className="border-b last:border-0">
                        <td className="py-3 font-medium">{r.label}</td>
                        <td className="py-3 text-right text-muted-foreground">{r.remaining.toLocaleString()}</td>
                        <td className="py-3 text-right font-medium">{r.met ? '—' : r.needed.toFixed(1)}</td>
                        <td className="py-3 text-right">{r.current.toFixed(1)}</td>
                        <td className="py-3 text-right">{r.met ? '—' : `${r.current - r.needed >= 0 ? '+' : ''}${(r.current - r.needed).toFixed(1)}`}</td>
                        <td className="py-3 text-center">{r.met ? '✅' : r.onTrack ? '🟢' : '🔴'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {p?.feasible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required vs. Recent Weekly Hours</CardTitle>
            <CardDescription>Hours per week needed to hit {fmtDate(targetDate!)} compared with your recent averages.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                  <Legend />
                  <Bar dataKey="Required" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Recent Avg" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <PacingCoach
        context={{
          today: new Date().toISOString().slice(0, 10),
          savedTargetDate: targetDate,
          weeksUntilSavedTarget: p?.feasible ? +p.weeks.toFixed(1) : null,
          loggedWeeksInAverage: p?.recentCount ?? logs.length,
          categories: p?.rows.map(r => ({
            label: r.label, required: r.required, accrued: r.accrued, remaining: r.remaining,
            neededPerWeek: r.met ? 0 : +r.needed.toFixed(2), recentAvgPerWeek: +r.current.toFixed(2),
            onTrack: r.onTrack, met: r.met, liveProjectedDate: r.liveProjectedDate,
          })) ?? reqs.map(r => ({ label: r.label, remaining: r.remaining, liveProjectedDate: r.liveProjectedDate })),
          whatIfTargetDate: w?.feasible ? whatIf : null,
          settings,
        }}
      />

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Try a different target date</h4>
            <p className="text-xs text-muted-foreground">Explore without changing your saved target.</p>
            <Input type="date" value={whatIf} onChange={e => setWhatIf(e.target.value)} className="w-52" />
            {w && !w.feasible && <p className="text-sm text-destructive">Pick a future date.</p>}
            {w?.feasible && (() => {
              const d = w.rows.find(r => r.label === 'Direct Client Hours');
              return (
                <div className="space-y-2 text-sm">
                  {d && (
                    <p className="text-base">
                      To finish by {fmtDate(whatIf)} ({w.weeks.toFixed(1)} weeks), you'd need{' '}
                      <span className="font-semibold text-primary">{d.met ? '0' : d.needed.toFixed(1)} direct client hours / week</span>
                      {' '}(recent avg {d.current.toFixed(1)}) {d.onTrack ? '🟢' : '🔴'}
                    </p>
                  )}
                  <ul className="text-muted-foreground space-y-1">
                    {w.rows.filter(r => r.label !== 'Direct Client Hours').map(r => (
                      <li key={r.label}>{r.label}: {r.met ? 'met ✅' : `${r.needed.toFixed(1)} / week ${r.onTrack ? '🟢' : '🔴'}`}</li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" onClick={() => { setDraft(whatIf); onSave(whatIf); }}>Use as my target</Button>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
