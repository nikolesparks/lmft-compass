import { HistoricalReview, Scenario } from './scenario-types';

const KEY = 'lmft-scenario-studio-v1';
export interface StudioState { scenarios: Scenario[]; review: HistoricalReview }
export const emptyReview: HistoricalReview = { verified: false, training: 0, supervision: 0, other: 0, individualWeeks: 0 };
export function loadStudio(): StudioState {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (data && Array.isArray(data.scenarios) && data.scenarios.every((s: Scenario) =>
      typeof s.id === 'string' && typeof s.name === 'string' &&
      ['direct', 'family', 'training', 'individualSupervision', 'groupSupervision', 'other', 'workingWeeks', 'cancellationRate'].every(k => Number.isFinite(s[k as keyof Scenario])))) {
      return { scenarios: data.scenarios, review: { ...emptyReview, ...data.review } };
    }
  } catch { /* Existing tracker data lives under a different key and remains untouched. */ }
  return { scenarios: [], review: { ...emptyReview } };
}
export function saveStudio(state: StudioState): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}