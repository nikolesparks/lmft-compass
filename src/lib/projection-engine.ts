import { OnboardingData, Projection, WeeklyLog, REQUIREMENTS, RequirementStatus } from './types';

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function weeksBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (7 * 24 * 60 * 60 * 1000);
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Calculate weeks needed to accrue `remaining` hours given onboarding params,
 * starting from week 0 of projection (which may be after ramp-up already).
 */
function weeksToAccrue(
  remaining: number,
  onboarding: OnboardingData,
  hoursPerClientPerWeek: number,
  fractionOfDirect: number, // 1 for total/direct, couplesFamilyPercentage/100 for couples
  startWeekOffset: number, // how many weeks have passed since registration
): number {
  if (remaining <= 0) return 0;
  
  const cancelFactor = 1 - onboarding.cancellationRate / 100;
  const workWeeksPerYear = 52 - onboarding.holidayWeeksPerYear - onboarding.vacationWeeksPerYear;
  const workFraction = workWeeksPerYear / 52;
  
  let accumulated = 0;
  let week = 0;
  
  while (accumulated < remaining) {
    const totalWeek = startWeekOffset + week;
    // Determine caseload at this week
    let clients: number;
    if (totalWeek >= onboarding.rampUpWeeks) {
      clients = onboarding.targetClientsPerWeek;
    } else {
      const progress = totalWeek / Math.max(onboarding.rampUpWeeks, 1);
      clients = onboarding.currentClientsPerWeek + 
        (onboarding.targetClientsPerWeek - onboarding.currentClientsPerWeek) * progress;
    }
    
    const effectiveClients = clients * cancelFactor * workFraction;
    const weeklyHours = effectiveClients * hoursPerClientPerWeek * fractionOfDirect;
    accumulated += weeklyHours;
    week++;
    
    if (week > 1000) break; // safety
  }
  
  return week;
}

export function calculateProjection(onboarding: OnboardingData, currentDate?: Date): Projection {
  const start = new Date(onboarding.startDate);
  const now = currentDate || new Date();
  const weeksSinceStart = Math.max(0, weeksBetween(start, now));
  
  const hoursPerClient = onboarding.avgSessionLengthMinutes / 60;
  const cfFraction = onboarding.couplesFamilyPercentage / 100;
  
  // Remaining hours
  const remainingTotal = Math.max(0, REQUIREMENTS.totalHours - onboarding.accruedTotal);
  const remainingDirect = Math.max(0, REQUIREMENTS.directClientHours - onboarding.accruedDirect);
  const remainingCF = Math.max(0, REQUIREMENTS.couplesFamilyHours - onboarding.accruedCouplesFamily);
  const remainingSupWeeks = Math.max(0, REQUIREMENTS.supervisionWeeks - onboarding.accruedSupervisionWeeks);
  
  // For total hours: direct hours + supervision hours per week
  // Simplified: we model total hours accrual as direct client hours + supervision
  const cancelFactor = 1 - onboarding.cancellationRate / 100;
  const workWeeksPerYear = 52 - onboarding.holidayWeeksPerYear - onboarding.vacationWeeksPerYear;
  const workFraction = workWeeksPerYear / 52;
  
  // Calculate weeks for each category
  const weeksForDirect = weeksToAccrue(remainingDirect, onboarding, hoursPerClient, 1, weeksSinceStart);
  const weeksForCF = weeksToAccrue(remainingCF, onboarding, hoursPerClient, cfFraction, weeksSinceStart);
  
  // Total hours includes supervision
  // We need a custom calc: each work week gives direct hours + supervision hours
  let totalAccum = 0;
  let weeksForTotal = 0;
  const remTotal = remainingTotal;
  while (totalAccum < remTotal && weeksForTotal < 1000) {
    const totalWeek = weeksSinceStart + weeksForTotal;
    let clients: number;
    if (totalWeek >= onboarding.rampUpWeeks) {
      clients = onboarding.targetClientsPerWeek;
    } else {
      const progress = totalWeek / Math.max(onboarding.rampUpWeeks, 1);
      clients = onboarding.currentClientsPerWeek + 
        (onboarding.targetClientsPerWeek - onboarding.currentClientsPerWeek) * progress;
    }
    const effectiveClients = clients * cancelFactor * workFraction;
    const directWeekly = effectiveClients * hoursPerClient;
    const supWeekly = onboarding.supervisionHoursPerWeek * workFraction;
    totalAccum += directWeekly + supWeekly;
    weeksForTotal++;
  }
  
  const supervisionWeeksDate = addWeeks(start, onboarding.accruedSupervisionWeeks + remainingSupWeeks);
  
  const totalDate = addWeeks(now, weeksForTotal);
  const directDate = addWeeks(now, weeksForDirect);
  const cfDate = addWeeks(now, weeksForCF);
  
  // Licensure date = latest of all
  const dates = [totalDate, directDate, cfDate, supervisionWeeksDate];
  const licensureDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  return {
    totalCompletionDate: formatDate(totalDate),
    directCompletionDate: formatDate(directDate),
    couplesFamilyCompletionDate: formatDate(cfDate),
    supervisionWeeksCompletionDate: formatDate(supervisionWeeksDate),
    licensureDate: formatDate(licensureDate),
  };
}

export function calculateLiveProjection(
  onboarding: OnboardingData,
  weeklyLogs: WeeklyLog[],
): Projection {
  // Sum logged hours
  const loggedTotal = weeklyLogs.reduce((s, l) => s + l.totalHours, 0);
  const loggedDirect = weeklyLogs.reduce((s, l) => s + l.directClientHours, 0);
  const loggedCF = weeklyLogs.reduce((s, l) => s + l.couplesFamilyHours, 0);
  const loggedSupWeeks = weeklyLogs.length; // each log = 1 supervision week
  
  // Create modified onboarding with updated accrued values
  const updated: OnboardingData = {
    ...onboarding,
    accruedTotal: onboarding.accruedTotal + loggedTotal,
    accruedDirect: onboarding.accruedDirect + loggedDirect,
    accruedCouplesFamily: onboarding.accruedCouplesFamily + loggedCF,
    accruedSupervisionWeeks: onboarding.accruedSupervisionWeeks + loggedSupWeeks,
  };
  
  return calculateProjection(updated);
}

export function getRequirementStatuses(
  onboarding: OnboardingData,
  weeklyLogs: WeeklyLog[],
  originalProjection: Projection,
  liveProjection: Projection,
): RequirementStatus[] {
  const loggedTotal = weeklyLogs.reduce((s, l) => s + l.totalHours, 0);
  const loggedDirect = weeklyLogs.reduce((s, l) => s + l.directClientHours, 0);
  const loggedCF = weeklyLogs.reduce((s, l) => s + l.couplesFamilyHours, 0);
  const loggedSupWeeks = weeklyLogs.length;
  
  const accruedTotal = onboarding.accruedTotal + loggedTotal;
  const accruedDirect = onboarding.accruedDirect + loggedDirect;
  const accruedCF = onboarding.accruedCouplesFamily + loggedCF;
  const accruedSupWeeks = onboarding.accruedSupervisionWeeks + loggedSupWeeks;
  
  function getStatus(originalDate: string, liveDate: string, accrued: number, required: number): RequirementStatus['status'] {
    if (accrued >= required) return 'met';
    const orig = new Date(originalDate).getTime();
    const live = new Date(liveDate).getTime();
    const diffWeeks = (live - orig) / (7 * 24 * 60 * 60 * 1000);
    if (diffWeeks <= 2) return 'on-track';
    if (diffWeeks <= 4) return 'slightly-behind';
    return 'falling-behind';
  }
  
  // Check if supervision weeks is the bottleneck
  const supIsBottleneck = new Date(liveProjection.supervisionWeeksCompletionDate).getTime() >=
    Math.max(
      new Date(liveProjection.totalCompletionDate).getTime(),
      new Date(liveProjection.directCompletionDate).getTime(),
      new Date(liveProjection.couplesFamilyCompletionDate).getTime(),
    );
  
  return [
    {
      label: 'Total Supervised Hours',
      required: REQUIREMENTS.totalHours,
      accrued: Math.round(accruedTotal * 10) / 10,
      remaining: Math.max(0, Math.round((REQUIREMENTS.totalHours - accruedTotal) * 10) / 10),
      originalProjectedDate: originalProjection.totalCompletionDate,
      liveProjectedDate: liveProjection.totalCompletionDate,
      status: getStatus(originalProjection.totalCompletionDate, liveProjection.totalCompletionDate, accruedTotal, REQUIREMENTS.totalHours),
    },
    {
      label: 'Direct Client Hours',
      required: REQUIREMENTS.directClientHours,
      accrued: Math.round(accruedDirect * 10) / 10,
      remaining: Math.max(0, Math.round((REQUIREMENTS.directClientHours - accruedDirect) * 10) / 10),
      originalProjectedDate: originalProjection.directCompletionDate,
      liveProjectedDate: liveProjection.directCompletionDate,
      status: getStatus(originalProjection.directCompletionDate, liveProjection.directCompletionDate, accruedDirect, REQUIREMENTS.directClientHours),
    },
    {
      label: 'Couples/Family Therapy',
      required: REQUIREMENTS.couplesFamilyHours,
      accrued: Math.round(accruedCF * 10) / 10,
      remaining: Math.max(0, Math.round((REQUIREMENTS.couplesFamilyHours - accruedCF) * 10) / 10),
      originalProjectedDate: originalProjection.couplesFamilyCompletionDate,
      liveProjectedDate: liveProjection.couplesFamilyCompletionDate,
      status: getStatus(originalProjection.couplesFamilyCompletionDate, liveProjection.couplesFamilyCompletionDate, accruedCF, REQUIREMENTS.couplesFamilyHours),
    },
    {
      label: 'Supervision Weeks',
      required: REQUIREMENTS.supervisionWeeks,
      accrued: accruedSupWeeks,
      remaining: Math.max(0, REQUIREMENTS.supervisionWeeks - accruedSupWeeks),
      originalProjectedDate: originalProjection.supervisionWeeksCompletionDate,
      liveProjectedDate: liveProjection.supervisionWeeksCompletionDate,
      status: getStatus(originalProjection.supervisionWeeksCompletionDate, liveProjection.supervisionWeeksCompletionDate, accruedSupWeeks, REQUIREMENTS.supervisionWeeks),
      isWeekConstraint: supIsBottleneck,
    },
  ];
}

export function getOverallProgress(onboarding: OnboardingData, weeklyLogs: WeeklyLog[]): number {
  const loggedTotal = weeklyLogs.reduce((s, l) => s + l.totalHours, 0);
  const accruedTotal = onboarding.accruedTotal + loggedTotal;
  return Math.min(100, Math.round((accruedTotal / REQUIREMENTS.totalHours) * 100));
}
