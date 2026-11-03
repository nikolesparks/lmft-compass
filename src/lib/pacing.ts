import { RequirementStatus, WeeklyLog } from './types';

export const RECENT_WINDOW = 8;

export function weeksUntil(dateStr: string, now = Date.now()): number {
  return (new Date(dateStr).getTime() - now) / (7 * 24 * 60 * 60 * 1000);
}

export function recentAverages(weeklyLogs: WeeklyLog[]) {
  const recent = [...weeklyLogs]
    .sort((a, b) => new Date(a.weekDate).getTime() - new Date(b.weekDate).getTime())
    .slice(-RECENT_WINDOW);
  const avg = (pick: (l: WeeklyLog) => number) =>
    recent.length ? recent.reduce((s, l) => s + pick(l), 0) / recent.length : 0;
  return {
    count: recent.length,
    byLabel: {
      'Total Supervised Hours': avg(l => l.totalHours),
      'Direct Client Hours': avg(l => l.directClientHours),
      'Couples/Family Therapy': avg(l => l.couplesFamilyHours),
      'Supervision Weeks': recent.length ? 1 : 0,
    } as Record<string, number>,
  };
}

export function computePacing(requirements: RequirementStatus[], weeklyLogs: WeeklyLog[], targetDate: string, now = Date.now()) {
  const weeks = weeksUntil(targetDate, now);
  const { count, byLabel } = recentAverages(weeklyLogs);
  const rows = requirements.map(r => {
    const needed = weeks > 0 ? r.remaining / weeks : Infinity;
    const current = byLabel[r.label] ?? 0;
    const met = r.remaining <= 0;
    return { ...r, needed, current, met, onTrack: met || current >= needed };
  });
  return { weeks, rows, recentCount: count, feasible: weeks > 0, allOnTrack: rows.every(r => r.onTrack) };
}
