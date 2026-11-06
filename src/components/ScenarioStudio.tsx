import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OnboardingData, WeeklyLog } from '@/lib/types';
import { Scenario } from '@/lib/scenario-types';
import { loadStudio, saveStudio, StudioState } from '@/lib/scenario-storage';
import { BBS, BBS_SOURCE, currentPaceScenario, formatScenarioDate, projectScenario, reallocateTraining, reviewHistory, scenarioValidation } from '@/lib/scenario-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface Props { settings: OnboardingData; weeklyLogs: WeeklyLog[]; targetDate: string | null }

const COLORS = ['hsl(var(--primary))', 'hsl(160 60% 50%)', 'hsl(35 90% 60%)', 'hsl(200 80% 60%)', 'hsl(330 70% 65%)'];
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => Math.random().toString(36).slice(2, 10);

const TEMPLATES = [-2, 2, 4];

const diffText = (d: number | null) => d === null ? '—' : d === 0 ? 'Same day' : `${Math.abs(Math.round(d / 7))} wk ${d > 0 ? 'later' : 'earlier'}`;

const FIELDS: [keyof Scenario, string, number?][] = [
  ['direct', 'Direct clinical h/wk'], ['family', 'Couples/family/children h/wk'], ['training', 'Training h/wk'],
  ['individualSupervision', 'Individual/triadic supervision h/wk'], ['groupSupervision', 'Group supervision h/wk'],
  ['other', 'Other nonclinical h/wk'], ['workingWeeks', 'Working weeks/year'], ['cancellationRate', 'Cancellation rate %'],
];

export function ScenarioStudio({ settings, weeklyLogs, targetDate }: Props) {
  const [studio, setStudio] = useState<StudioState>(loadStudio);
  const current = useMemo(() => currentPaceScenario(settings, weeklyLogs), [settings, weeklyLogs]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shift, setShift] = useState(0);

  const sessionHrs = Math.max(0.25, settings.avgSessionLengthMinutes / 60);
  useEffect(() => { if (!saveStudio(studio)) toast.error('Could not save scenarios in this browser.'); }, [studio]);

  const now = today();
  const balance = useMemo(() => reviewHistory(settings, weeklyLogs, studio.review), [settings, weeklyLogs, studio.review]);
  const currentResult = useMemo(() => projectScenario(current, balance, now, targetDate, null, settings.avgSessionLengthMinutes), [current, balance, now, targetDate, settings.avgSessionLengthMinutes]);
  const results = useMemo(() => studio.scenarios.map(s => ({ s, r: projectScenario(s, balance, now, targetDate, currentResult.completionDate, settings.avgSessionLengthMinutes) })), [studio.scenarios, balance, now, targetDate, currentResult.completionDate, settings.avgSessionLengthMinutes]);

  const selected = studio.scenarios.find(s => s.id === selectedId) ?? studio.scenarios[0];
  const tradeoff = selected && shift > 0 ? projectScenario(reallocateTraining(selected, shift), balance, now, targetDate, currentResult.completionDate, settings.avgSessionLengthMinutes) : null;
  const selectedResult = results.find(x => x.s.id === selected?.id)?.r;

  const update = (id: string, patch: Partial<Scenario>) => setStudio(st => ({ ...st, scenarios: st.scenarios.map(s => s.id === id ? { ...s, ...patch } : s) }));
  const add = (delta = 0) => {
    const direct = Math.max(0, current.direct + delta * sessionHrs);
    const s = { ...current, id: newId(), direct: Math.round(direct * 10) / 10, family: Math.min(current.family, direct),
      name: delta ? `Current pace ${delta > 0 ? '+' : ''}${delta} sessions/wk` : `My schedule ${studio.scenarios.length + 1}` };
    setStudio(st => ({ ...st, scenarios: [...st.scenarios, s] })); setEditingId(s.id);
  };
  const duplicate = (s: Scenario) => setStudio(st => ({ ...st, scenarios: [...st.scenarios, { ...s, id: newId(), name: `${s.name} (copy)` }] }));
  const remove = (id: string) => { if (confirm('Delete this scenario?')) setStudio(st => ({ ...st, scenarios: st.scenarios.filter(s => s.id !== id) })); };

  // Chart data: weekly points, up to 5 years ahead
  const chart = useMemo(() => {
    const horizon = 260;
    const rows: Record<string, number | string | null>[] = [];
    const start = new Date(`${now}T00:00:00Z`).getTime();
    const sorted = [...weeklyLogs].sort((a, b) => a.weekDate.localeCompare(b.weekDate));
    let cum = settings.accruedTotal;
    sorted.forEach(l => { cum += l.totalHours; rows.push({ date: l.weekDate, Actual: Math.round(cum) }); });
    const qualStart = balance.total;
    const targetWeeks = targetDate ? Math.max(1, (new Date(targetDate).getTime() - start) / (7 * 86400000)) : null;
    for (let i = 0; i <= horizon; i += 4) {
      const date = new Date(start + i * 7 * 86400000).toISOString().slice(0, 10);
      const row: Record<string, number | string | null> = { date };
      row['Current pace'] = Math.round(currentResult.points[Math.min(i, currentResult.points.length - 1)]?.qualifying ?? 0);
      results.forEach(({ s, r }) => { if (visible[s.id] !== false) row[s.name] = Math.round(r.points[Math.min(i, r.points.length - 1)]?.qualifying ?? 0); });
      if (targetWeeks) row['Target trajectory'] = i <= targetWeeks ? Math.round(qualStart + (BBS.total - qualStart) * i / targetWeeks) : null;
      rows.push(row);
      const done = [currentResult, ...results.map(x => x.r)].every(r => r.points.length - 1 <= i);
      if (done && (!targetWeeks || i > targetWeeks)) break;
    }
    return rows;
  }, [now, weeklyLogs, settings.accruedTotal, balance.total, targetDate, currentResult, results, visible]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-serif-display font-normal tracking-tight">Scenario Studio</CardTitle>
          <CardDescription>Build weekly schedules starting from your real logged pace and compare them. Your logged history is never changed. Rules follow the <a className="underline" href={BBS_SOURCE} target="_blank" rel="noreferrer">BBS handbook</a>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <Stat label="Raw logged hours" value={balance.raw.toFixed(0)} />
            <Stat label="Qualifying hours" value={`${balance.total.toFixed(0)} / ${BBS.total}`} />
            <Stat label="Direct clinical" value={`${balance.direct.toFixed(0)} / ${BBS.direct}`} />
            <Stat label="Nonclinical counted" value={`${balance.nonclinical.toFixed(0)} / ${BBS.nonclinical} cap`} />
          </div>
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={studio.review.verified} onCheckedChange={v => setStudio(st => ({ ...st, review: { ...st.review, verified: v } }))} id="verify" />
              <Label htmlFor="verify">I've reviewed my past nonclinical hours (with my supervisor's signed logs)</Label>
            </div>
            {studio.review.verified && (
              <div className="grid gap-3 sm:grid-cols-4">
                {(['supervision', 'training', 'other', 'individualWeeks'] as const).map(k => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs capitalize">{k === 'individualWeeks' ? 'Individual/triadic weeks' : `${k} hours`}</Label>
                    <Input type="number" min={0} value={studio.review[k]} onChange={e => setStudio(st => ({ ...st, review: { ...st.review, [k]: Number(e.target.value) } }))} />
                  </div>
                ))}
              </div>
            )}
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">{balance.warnings.map(w => <li key={w}>{w}</li>)}</ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl font-serif-display font-normal">Compare scenarios</CardTitle>
          <div className="flex flex-wrap gap-2 justify-end">
            {TEMPLATES.map(d => <Button key={d} size="sm" variant="outline" onClick={() => add(d)}>{d > 0 ? '+' : ''}{d} sessions/wk</Button>)}
            <Button size="sm" onClick={() => add()}>New schedule</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3">Scenario</th>
                <th className="py-2 pr-3">+Sessions/wk</th>
                {Object.keys(currentResult.dates).map(k => <th key={k} className="py-2 pr-3 font-normal">{k}</th>)}
                <th className="py-2 pr-3">Completion</th><th className="py-2 pr-3">Limiting</th>
                <th className="py-2 pr-3">vs target</th><th className="py-2 pr-3">vs current</th><th />
              </tr>
            </thead>
            <tbody>
              <ResultRow name="Current pace" r={currentResult} />
              {results.map(({ s, r }) => (
                <ResultRow key={s.id} name={s.name} r={r} actions={
                  <div className="flex flex-col items-start">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(editingId === s.id ? null : s.id)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => duplicate(s)}>Duplicate</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>Delete</Button>
                  </div>
                } />
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">Current pace uses your recent logs conservatively: logged supervision is assumed to be individual/triadic, and nonclinical hours other than supervision are excluded until verified.</p>
        </CardContent>
      </Card>

      {editingId && (() => {
        const s = studio.scenarios.find(x => x.id === editingId);
        if (!s) return null;
        const errors = scenarioValidation(s);
        const warnings = results.find(x => x.s.id === s.id)?.r.warnings ?? [];
        return (
          <Card>
            <CardHeader><CardTitle className="text-xl font-serif-display font-normal">Edit scenario</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Label>Name</Label><Input value={s.name} onChange={e => update(s.id, { name: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Client sessions/wk ({settings.avgSessionLengthMinutes} min)</Label>
                  <Input type="number" min={0} step="1" value={Math.round(s.direct / sessionHrs * 10) / 10} onChange={e => { const direct = Number(e.target.value) * sessionHrs; update(s.id, { direct, family: Math.min(s.family, direct) }); }} />
                </div>
                {FIELDS.map(([k, label]) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" min={0} step="0.5" value={s[k] as number} onChange={e => update(s.id, { [k]: Number(e.target.value) })} />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2"><Switch checked={s.trainingVerified} onCheckedChange={v => update(s.id, { trainingVerified: v })} />Training is supervisor-approved and MFT-related</label>
                <label className="flex items-center gap-2"><Switch checked={s.otherVerified} onCheckedChange={v => update(s.id, { otherVerified: v })} />Other hours are eligible (notes, reports, advocacy, testing)</label>
              </div>
              {warnings.length > 0 && <ul className="text-xs text-warning list-disc pl-4 space-y-1">{warnings.map(w => <li key={w} className={errors.includes(w) ? 'text-destructive' : 'text-muted-foreground'}>{w}</li>)}</ul>}
              <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Done</Button>
            </CardContent>
          </Card>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif-display font-normal">Cumulative hours</CardTitle>
          <CardDescription>Actual raw hours to date, then qualifying-hour projections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            {studio.scenarios.map(s => (
              <label key={s.id} className="flex items-center gap-2"><Switch checked={visible[s.id] !== false} onCheckedChange={v => setVisible(x => ({ ...x, [s.id]: v }))} />{s.name}</label>
            ))}
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, BBS.total]} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line dataKey="Actual" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} connectNulls />
                <Line dataKey="Current pace" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} connectNulls />
                {targetDate && <Line dataKey="Target trajectory" stroke="hsl(0 70% 60%)" strokeDasharray="2 6" dot={false} connectNulls />}
                {studio.scenarios.filter(s => visible[s.id] !== false).map((s, i) => (
                  <Line key={s.id} dataKey={s.name} stroke={COLORS[i % COLORS.length]} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif-display font-normal">Training trade-off</CardTitle>
            <CardDescription>Move weekly training hours into direct client work. Supervision stays the same.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {studio.scenarios.map(s => <Button key={s.id} size="sm" variant={s.id === selected.id ? 'default' : 'outline'} onClick={() => { setSelectedId(s.id); setShift(0); }}>{s.name}</Button>)}
            </div>
            {selected.training > 0 ? (
              <>
                <Label>Move {shift} of {selected.training} training hours/week to direct work</Label>
                <Slider value={[shift]} min={0} max={selected.training} step={0.5} onValueChange={([v]) => setShift(v)} />
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <Stat label="Before" value={formatScenarioDate(selectedResult?.completionDate ?? null)} />
                  <Stat label="After" value={formatScenarioDate(tradeoff?.completionDate ?? selectedResult?.completionDate ?? null)} />
                  <Stat label="Change" value={tradeoff && selectedResult?.completionDate && tradeoff.completionDate ? diffText(Math.round((new Date(tradeoff.completionDate).getTime() - new Date(selectedResult.completionDate).getTime()) / 86400000)) : '—'} />
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">This scenario has no training hours to reallocate.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg">{value}</div></div>;
}

function ResultRow({ name, r, actions }: { name: string; r: ReturnType<typeof projectScenario>; actions?: React.ReactNode }) {
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="py-2 pr-3 font-medium">{name}{r.warnings.length > 0 && <span className="ml-1 text-xs text-muted-foreground" title={r.warnings.join('\n')}>⚠️</span>}</td>
      <td className="py-2 pr-3">{r.additionalSessions ?? '—'}</td>
      {Object.values(r.dates).map((d, i) => <td key={i} className="py-2 pr-3 whitespace-nowrap">{formatScenarioDate(d)}</td>)}
      <td className="py-2 pr-3 whitespace-nowrap font-medium">{formatScenarioDate(r.completionDate)}</td>
      <td className="py-2 pr-3 text-xs">{r.completionDate ? r.limiting.join(', ') : 'Not enough supervision or hours'}</td>
      <td className="py-2 pr-3 whitespace-nowrap">{diffText(r.targetDifference)}</td>
      <td className="py-2 pr-3 whitespace-nowrap">{diffText(r.currentDifference)}</td>
      <td className="py-2">{actions}</td>
    </tr>
  );
}
