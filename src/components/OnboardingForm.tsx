import { useState } from 'react';
import { OnboardingData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OnboardingFormProps {
  onComplete: (data: OnboardingData) => void;
}

const defaultValues: OnboardingData = {
  startDate: new Date().toISOString().split('T')[0],
  accruedTotal: 0,
  accruedDirect: 0,
  accruedCouplesFamily: 0,
  accruedSupervisionWeeks: 0,
  currentClientsPerWeek: 5,
  targetClientsPerWeek: 20,
  rampUpWeeks: 26,
  cancellationRate: 10,
  holidayWeeksPerYear: 2,
  vacationWeeksPerYear: 2,
  avgSessionLengthMinutes: 50,
  couplesFamilyPercentage: 30,
  supervisionHoursPerWeek: 2,
};

const steps = [
  { title: 'Registration', description: 'When did your AMFT journey begin?' },
  { title: 'Hours Accrued', description: 'What hours have you already logged?' },
  { title: 'Caseload', description: 'Tell us about your current and target caseload.' },
  { title: 'Schedule', description: 'Set your time-off and session parameters.' },
];

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(defaultValues);

  const update = (field: keyof OnboardingData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const numField = (label: string, field: keyof OnboardingData, opts?: { min?: number; max?: number; step?: number; suffix?: string }) => (
    <div className="space-y-2">
      <Label>{label}{opts?.suffix ? ` (${opts.suffix})` : ''}</Label>
      <Input
        type="number"
        min={opts?.min ?? 0}
        max={opts?.max}
        step={opts?.step ?? 1}
        value={data[field] as number}
        onChange={e => update(field, parseFloat(e.target.value) || 0)}
      />
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>AMFT Registration Start Date</Label>
              <Input
                type="date"
                value={data.startDate}
                onChange={e => update('startDate', e.target.value)}
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            {numField('Total supervised hours accrued', 'accruedTotal')}
            {numField('Direct client hours accrued', 'accruedDirect')}
            {numField('Couples/family therapy hours accrued', 'accruedCouplesFamily')}
            {numField('Supervision weeks completed', 'accruedSupervisionWeeks')}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            {numField('Current clients per week', 'currentClientsPerWeek')}
            {numField('Target clients per week', 'targetClientsPerWeek')}
            {numField('Weeks to reach target caseload', 'rampUpWeeks')}
            {numField('Client cancellation rate', 'cancellationRate', { max: 100, suffix: '%' })}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {numField('Holiday weeks per year', 'holidayWeeksPerYear')}
            {numField('Vacation weeks per year', 'vacationWeeksPerYear')}
            {numField('Average session length', 'avgSessionLengthMinutes', { suffix: 'minutes' })}
            {numField('Couples/family as % of direct hours', 'couplesFamilyPercentage', { max: 100, suffix: '%' })}
            {numField('Supervision hours per week', 'supervisionHoursPerWeek', { step: 0.5 })}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <CardTitle className="text-xl">{steps[step].title}</CardTitle>
          <CardDescription>{steps[step].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep()}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)}>Continue</Button>
            ) : (
              <Button onClick={() => onComplete(data)}>Start Tracking</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
