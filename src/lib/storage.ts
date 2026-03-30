import { AppState } from './types';

const STORAGE_KEY = 'lmft-tracker-state';

const defaultState: AppState = {
  onboarding: null,
  weeklyLogs: [],
  originalProjection: null,
  isOnboarded: false,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
