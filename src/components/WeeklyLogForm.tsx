import { useState } from 'react';
import { WeeklyLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WeeklyLogFormProps {
  onSubmit: (log: WeeklyLog) => void;
}

export function WeeklyLogForm({ onSubmit }: WeeklyLogFormProps) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const [weekDate, setWeekDate] = useState(monday.toISOString().split('T')[0]);
  const [totalHours, setTotalHours] = useState(0);
  const [directClientHours, setDirectClientHours] = useState(0);
  const [couplesFamilyHours, setCouplesFamilyHours] = useState(0);
  const [supervisionHours, setSupervisionHours] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const log: WeeklyLog = {
      id: crypto.randomUUID(),
      weekDate,
      totalHours,
      directClientHours,
      couplesFamilyHours,
      supervisionHours,
      notes,
    };
    onSubmit(log);
    setTotalHours(0);
    setDirectClientHours(0);
    setCouplesFamilyHours(0);
    setSupervisionHours(0);
    setNotes('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Log Weekly Hours</CardTitle>
        <CardDescription>Record your hours for the week. Submitting recalculates your live projection.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Week of</Label>
            <Input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Total Hours</Label>
            <Input type="number" min={0} step={0.5} value={totalHours} onChange={e => setTotalHours(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Direct Client</Label>
            <Input type="number" min={0} step={0.5} value={directClientHours} onChange={e => setDirectClientHours(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Couples/Family</Label>
            <Input type="number" min={0} step={0.5} value={couplesFamilyHours} onChange={e => setCouplesFamilyHours(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Supervision</Label>
            <Input type="number" min={0} step={0.5} value={supervisionHours} onChange={e => setSupervisionHours(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Holiday week" />
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={handleSubmit}>Submit Weekly Log</Button>
      </CardContent>
    </Card>
  );
}
