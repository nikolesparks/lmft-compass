import { OnboardingData, WeeklyLog } from './types';
import { HistoricalReview, QualifyingBalance, Scenario, ScenarioResult } from './scenario-types';

// Official BBS LMFT handbook, pp. 20–21; AMFT, single-setting planning.
export const BBS = { total: 3000, direct: 1750, family: 500, nonclinical: 1250, weekly: 40, supervisionWeekly: 6, weeks: 104, individualWeeks: 52 };
export const BBS_SOURCE = 'https://www.bbs.ca.gov/pdf/publications/lmft_handbook.pdf';
const WEEK = 7 * 86400000;
const positive = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
const iso = (n: number) => new Date(n).toISOString().slice(0, 10);
export const formatScenarioDate = (d: string | null) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not reachable';

export function reviewHistory(onboarding: OnboardingData, logs: WeeklyLog[], review: HistoricalReview): QualifyingBalance {
  const raw = positive(onboarding.accruedTotal) + logs.reduce((s, l) => s + positive(l.totalHours), 0);
  const rawDirect = positive(onboarding.accruedDirect) + logs.reduce((s, l) => s + positive(l.directClientHours), 0);
  const direct = Math.min(raw, rawDirect);
  const family = Math.min(direct, positive(onboarding.accruedCouplesFamily) + logs.reduce((s, l) => s + positive(l.couplesFamilyHours), 0));
  const inferred = Math.max(0, raw - direct);
  const reviewed = positive(review.training) + positive(review.supervision) + positive(review.other);
  const nonclinical = review.verified ? Math.min(BBS.nonclinical, inferred, reviewed) : 0;
  const warnings = ['Legacy logs do not verify setting-specific supervision, weekly limits, registration validity, pre/post-degree limits, or the six-year experience window. Dates assume your confirmed clinical hours remain eligible at application.'];
  if (!review.verified) warnings.push(`${inferred.toFixed(1)} historical nonclinical hours are unverified and excluded from qualifying projections. Individual/triadic weeks are unverified and start at zero.`);
  if (review.verified && Math.abs(reviewed - inferred) > 0.1) warnings.push('Reviewed nonclinical categories do not match raw nonclinical hours. Only the smaller amount is included.');
  if (inferred > BBS.nonclinical) warnings.push(`${(inferred - BBS.nonclinical).toFixed(1)} nonclinical hours exceed the 1,250-hour combined cap.`);
  if (rawDirect > raw) warnings.push('Historical direct hours exceed total hours; clinical credit is limited to the raw total.');
  const weekSet = new Map<string, { direct: number; sup: number }>();
  logs.forEach(l => {
    const d = new Date(`${l.weekDate}T12:00:00Z`);
    if (!Number.isFinite(d.getTime())) return;
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    const key = iso(d.getTime());
    const prev = weekSet.get(key) ?? { direct: 0, sup: 0 };
    weekSet.set(key, { direct: prev.direct + positive(l.directClientHours), sup: prev.sup + positive(l.supervisionHours) });
  });
  // Legacy supervision mode is unknown: use the conservative group conversion.
  const loggedWeeks = [...weekSet.values()].filter(w => w.sup / 2 >= (w.direct > 10 ? 2 : 1)).length;
  const weeks = Math.min(104, positive(onboarding.accruedSupervisionWeeks) + loggedWeeks);
  if (logs.length) warnings.push('Legacy supervision mode is unknown; logged weeks use conservative group-hour conversion and duplicate calendar weeks count once.');
  return { raw, direct, family, nonclinical, total: direct + nonclinical, training: review.verified ? Math.min(nonclinical, positive(review.training)) : 0, weeks, individualWeeks: review.verified ? Math.min(weeks, positive(review.individualWeeks)) : 0, warnings };
}

export function scenarioValidation(s: Scenario): string[] {
  const errors: string[] = [];
  if (!s.name.trim()) errors.push('Give this scenario a name.');
  if ([s.direct, s.family, s.training, s.individualSupervision, s.groupSupervision, s.other].some(n => !Number.isFinite(n) || n < 0)) errors.push('Hours must be nonnegative numbers.');
  if (s.family > s.direct) errors.push('Couples/family/children hours cannot exceed direct clinical hours.');
  if (!Number.isInteger(s.workingWeeks) || s.workingWeeks < 1 || s.workingWeeks > 52) errors.push('Working weeks must be an integer between 1 and 52.');
  if (!Number.isFinite(s.cancellationRate) || s.cancellationRate < 0 || s.cancellationRate > 100) errors.push('Cancellation rate must be between 0 and 100%.');
  return errors;
}

export function qualifyWeek(s: Scenario) {
  const warnings = scenarioValidation(s);
  const directRaw = positive(s.direct) * (1 - Math.min(100, positive(s.cancellationRate)) / 100);
  const supRaw = positive(s.individualSupervision) + positive(s.groupSupervision);
  const raw = directRaw + positive(s.training) + supRaw + positive(s.other);
  const supScale = supRaw > 6 ? 6 / supRaw : 1;
  const individual = positive(s.individualSupervision) * supScale;
  const group = positive(s.groupSupervision) * supScale;
  const units = individual + group / 2;
  // Require supervision for the planned (pre-cancellation) caseload too.
  const valid = !warnings.length && units >= (s.direct > 10 ? 2 : 1);
  if (!valid && !warnings.length) warnings.push(`Insufficient supervision: ${s.direct > 10 ? 2 : 1} units required per work week in this setting. No future hours are credited.`);
  if (supRaw > 6) warnings.push('Supervision credit is capped at six hours per week.');
  if (raw > 40) warnings.push('Weekly qualifying credit is capped at 40 hours; supervision is reserved first, then direct, training, and other hours.');
  if (s.training > 0 && !s.trainingVerified) warnings.push('Training eligibility is unverified; training hours are excluded.');
  if (s.other > 0 && !s.otherVerified) warnings.push('Other nonclinical eligibility is unverified; those hours are excluded.');
  const supervision = valid ? individual + group : 0;
  const direct = valid ? Math.min(directRaw, Math.max(0, 40 - supervision)) : 0;
  const family = directRaw > 0 ? direct * Math.min(s.family, s.direct) / Math.max(s.direct, 0.0001) : 0;
  const training = valid && s.trainingVerified ? Math.min(s.training, Math.max(0, 40 - supervision - direct)) : 0;
  const other = valid && s.otherVerified ? Math.min(s.other, Math.max(0, 40 - supervision - direct - training)) : 0;
  return { raw, direct, family, training, nonclinical: supervision + training + other, weeks: valid ? 1 : 0, individualWeeks: valid && individual >= 1 ? 1 : 0, warnings };
}

export function projectScenario(s: Scenario, balance: QualifyingBalance, now: string, target: string | null, currentDate: string | null = null, sessionMinutes = 60): ScenarioResult {
  const week = qualifyWeek(s);
  const fraction = Math.min(52, positive(s.workingWeeks)) / 52;
  const start = new Date(`${now}T00:00:00Z`).getTime();
  const dates: Record<string, string | null> = { 'Total qualifying hours': null, 'Direct clinical': null, 'Couples / family / children': null, 'Supervised weeks': null, 'Individual / triadic weeks': null };
  const points: ScenarioResult['points'] = [];
  let raw = balance.raw, direct = balance.direct, family = balance.family, nonclinical = balance.nonclinical, weeks = balance.weeks, individual = balance.individualWeeks;
  for (let i = 0; i <= 1040; i++) {
    const date = iso(start + i * WEEK);
    const reached = [direct + nonclinical >= 3000, direct >= 1750, family >= 500, weeks >= 104 - 1e-8, individual >= 52 - 1e-8];
    Object.keys(dates).forEach((k, j) => { if (reached[j] && dates[k] === null) dates[k] = date; });
    points.push({ date, qualifying: direct + nonclinical, raw });
    if (reached.every(Boolean)) break;
    raw += week.raw * fraction;
    direct += week.direct * fraction;
    family += week.family * fraction;
    nonclinical = Math.min(1250, nonclinical + week.nonclinical * fraction);
    weeks += week.weeks * fraction;
    individual += week.individualWeeks * fraction;
  }
  const values = Object.values(dates);
  const completionDate = values.every(Boolean) ? values.reduce<string>((a, b) => b && b > a ? b : a, now) : null;
  const limiting = Object.keys(dates).filter(k => completionDate ? dates[k] === completionDate : dates[k] === null);
  const diff = (d: string | null) => completionDate && d ? Math.round((new Date(completionDate).getTime() - new Date(d).getTime()) / 86400000) : null;
  let additionalSessions: number | null = null;
  if (target && new Date(target).getTime() > start && sessionMinutes > 0 && s.cancellationRate < 100) {
    const horizon = (new Date(target).getTime() - start) / WEEK;
    const projectedNonclinical = Math.min(1250, balance.nonclinical + week.nonclinical * fraction * horizon);
    const directNeeded = Math.max(0, 1750 - balance.direct, 3000 - balance.direct - projectedNonclinical) / (horizon * fraction);
    additionalSessions = Math.ceil(Math.max(0, directNeeded - week.direct) / ((sessionMinutes / 60) * (1 - s.cancellationRate / 100)));
  }
  return { dates, completionDate, limiting, warnings: week.warnings, weeklyRaw: week.raw, weeklyQualifying: week.direct + week.nonclinical, targetDifference: diff(target), currentDifference: diff(currentDate), additionalSessions, points };
}

export function currentPaceScenario(o: OnboardingData, logs: WeeklyLog[]): Scenario {
  const dated = logs.filter(l => Number.isFinite(new Date(l.weekDate).getTime())).sort((a, b) => a.weekDate.localeCompare(b.weekDate));
  const end = dated.length ? new Date(dated[dated.length - 1].weekDate).getTime() : 0;
  const recent = dated.filter(l => new Date(l.weekDate).getTime() >= end - 7 * WEEK);
  const divisor = recent.length ? Math.min(8, Math.max(1, Math.floor((end - new Date(dated[0].weekDate).getTime()) / WEEK) + 1)) : 1;
  const avg = (fn: (l: WeeklyLog) => number) => recent.reduce((a, l) => a + positive(fn(l)), 0) / divisor;
  const direct = recent.length ? avg(l => l.directClientHours) : o.targetClientsPerWeek * o.avgSessionLengthMinutes / 60;
  return { id: 'current', name: 'Current pace', direct, family: recent.length ? avg(l => l.couplesFamilyHours) : direct * o.couplesFamilyPercentage / 100, training: 0, other: recent.length ? avg(l => Math.max(0, l.totalHours - l.directClientHours - l.supervisionHours)) : 0, individualSupervision: recent.length ? avg(l => l.supervisionHours) : o.supervisionHoursPerWeek, groupSupervision: 0, workingWeeks: recent.length ? 52 : Math.max(1, 52 - o.holidayWeeksPerYear - o.vacationWeeksPerYear), cancellationRate: recent.length ? 0 : o.cancellationRate, trainingVerified: false, otherVerified: false };
}

export function reallocateTraining(s: Scenario, hours: number): Scenario {
  const moved = Math.min(positive(hours), positive(s.training));
  return { ...s, direct: s.direct + moved, training: s.training - moved };
}