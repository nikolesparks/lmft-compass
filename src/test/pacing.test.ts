import { describe, it, expect } from 'vitest';
import { computePacing } from '@/lib/pacing';
import { RequirementStatus } from '@/lib/types';

const req = (label: string, remaining: number): RequirementStatus => ({
  label, required: 0, accrued: 0, remaining, originalProjectedDate: '', liveProjectedDate: '', status: 'on-track',
});
const now = new Date('2026-01-01').getTime();
const target = new Date(now + 10 * 7 * 86400000).toISOString();

describe('computePacing', () => {
  it('needed per week = remaining / weeks until target', () => {
    const r = computePacing([req('Direct Client Hours', 200)], [], target, now);
    expect(r.rows[0].needed).toBeCloseTo(20);
  });
  it('flags off track when recent average is below needed', () => {
    const logs = [{ id: '1', weekDate: '2025-12-25', totalHours: 0, directClientHours: 15, couplesFamilyHours: 0, supervisionHours: 0, notes: '' }];
    const r = computePacing([req('Direct Client Hours', 200)], logs, target, now);
    expect(r.rows[0].onTrack).toBe(false);
  });
});
