export interface Scenario {
  id: string;
  name: string;
  direct: number;
  family: number;
  training: number;
  individualSupervision: number;
  groupSupervision: number;
  other: number;
  workingWeeks: number;
  cancellationRate: number;
  trainingVerified: boolean;
  otherVerified: boolean;
}

export interface HistoricalReview {
  verified: boolean;
  training: number;
  supervision: number;
  other: number;
  individualWeeks: number;
}

export interface QualifyingBalance {
  raw: number;
  direct: number;
  family: number;
  training: number;
  nonclinical: number;
  total: number;
  weeks: number;
  individualWeeks: number;
  warnings: string[];
}

export interface ScenarioResult {
  dates: Record<string, string | null>;
  completionDate: string | null;
  limiting: string[];
  warnings: string[];
  weeklyRaw: number;
  weeklyQualifying: number;
  targetDifference: number | null;
  currentDifference: number | null;
  additionalSessions: number | null;
  points: { date: string; qualifying: number; raw: number }[];
}