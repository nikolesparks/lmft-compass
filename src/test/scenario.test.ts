import { describe, it, expect } from 'vitest';
import { qualifyWeek, projectScenario, reallocateTraining } from '@/lib/scenario-engine';
import { Scenario, QualifyingBalance } from '@/lib/scenario-types';

const base: Scenario = { id: 'a', name: 'A', direct: 20, family: 5, training: 4, individualSupervision: 2, groupSupervision: 2, other: 0, workingWeeks: 52, cancellationRate: 0, trainingVerified: true, otherVerified: true };
const zero: QualifyingBalance = { raw: 0, direct: 0, family: 0, training: 0, nonclinical: 0, total: 0, weeks: 0, individualWeeks: 0, warnings: [] };

describe('scenario rules', () => {
  it('caps weekly credit at 40 hours', () => {
    const w = qualifyWeek({ ...base, direct: 45, family: 0 });
    expect(w.direct + w.nonclinical).toBeLessThanOrEqual(40);
  });
  it('caps credited supervision at 6 hours/week', () => {
    expect(qualifyWeek({ ...base, individualSupervision: 5, groupSupervision: 5, training: 0 }).nonclinical).toBe(6);
  });
  it('credits nothing when over 10 direct hours with only 1 supervision unit', () => {
    expect(qualifyWeek({ ...base, individualSupervision: 1, groupSupervision: 0 }).direct).toBe(0);
  });
  it('never counts more than 1,250 nonclinical hours', () => {
    const r = projectScenario({ ...base, direct: 1, family: 1, training: 30 }, zero, '2026-01-05', null);
    const last = r.points[r.points.length - 1];
    expect(last.qualifying).toBeLessThanOrEqual(3000 + 40);
  });
  it('reallocating training moves hours to direct without exceeding training', () => {
    const s = reallocateTraining(base, 10);
    expect(s.direct).toBe(24);
    expect(s.training).toBe(0);
  });
});
