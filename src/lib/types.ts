export interface OnboardingData {
  startDate: string; // ISO date
  accruedTotal: number;
  accruedDirect: number;
  accruedCouplesFamily: number;
  accruedSupervisionWeeks: number;
  currentClientsPerWeek: number;
  targetClientsPerWeek: number;
  rampUpWeeks: number;
  cancellationRate: number; // 0-100
  holidayWeeksPerYear: number;
  vacationWeeksPerYear: number;
  avgSessionLengthMinutes: number;
  couplesFamilyPercentage: number; // % of direct hours that are couples/family
  supervisionHoursPerWeek: number;
}

export interface WeeklyLog {
  id: string;
  weekDate: string; // ISO date of week start
  totalHours: number;
  directClientHours: number;
  couplesFamilyHours: number;
  supervisionHours: number;
  notes: string;
}

export interface Projection {
  totalCompletionDate: string;
  directCompletionDate: string;
  couplesFamilyCompletionDate: string;
  supervisionWeeksCompletionDate: string;
  licensureDate: string;
}

export interface RequirementStatus {
  label: string;
  required: number;
  accrued: number;
  remaining: number;
  originalProjectedDate: string;
  liveProjectedDate: string;
  status: 'on-track' | 'slightly-behind' | 'falling-behind' | 'met';
  isWeekConstraint?: boolean;
}

export interface AppState {
  onboarding: OnboardingData | null;
  weeklyLogs: WeeklyLog[];
  originalProjection: Projection | null;
  isOnboarded: boolean;
}

export const REQUIREMENTS = {
  totalHours: 3000,
  directClientHours: 1750,
  couplesFamilyHours: 500,
  supervisionWeeks: 104,
} as const;
