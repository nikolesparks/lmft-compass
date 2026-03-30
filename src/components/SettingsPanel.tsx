import { OnboardingData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface SettingsPanelProps {
  settings: OnboardingData;
  onSave: (updated: OnboardingData) => void;
}

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [data, setData] = useState<OnboardingData>(settings);

  const update = (field: keyof OnboardingData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const field = (label: string, key: keyof OnboardingData, opts?: { type?: string; step?: number; suffix?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{opts?.suffix ? ` (${opts.suffix})` : ''}</Label>
      <Input
        type={opts?.type || 'number'}
        step={opts?.step || 1}
        min={0}
        value={data[key] as string | number}
        onChange={e => update(key, opts?.type === 'date' ? e.target.value : (parseFloat(e.target.value) || 0))}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Settings</CardTitle>
        <CardDescription>Update your projection assumptions. Changes affect the live projection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {field('Registration Start Date', 'startDate', { type: 'date' })}
          {field('Target Clients/Week', 'targetClientsPerWeek')}
          {field('Current Clients/Week', 'currentClientsPerWeek')}
          {field('Ramp-up Weeks', 'rampUpWeeks')}
          {field('Cancellation Rate', 'cancellationRate', { suffix: '%' })}
          {field('Holiday Weeks/Year', 'holidayWeeksPerYear')}
          {field('Vacation Weeks/Year', 'vacationWeeksPerYear')}
          {field('Avg Session Length', 'avgSessionLengthMinutes', { suffix: 'min' })}
          {field('Couples/Family %', 'couplesFamilyPercentage', { suffix: '%' })}
          {field('Supervision Hours/Week', 'supervisionHoursPerWeek', { step: 0.5 })}
        </div>
        <Button onClick={() => onSave(data)} className="w-full">Save Settings</Button>
      </CardContent>
    </Card>
  );
}
