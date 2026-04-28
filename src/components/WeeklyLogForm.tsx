import { useState, useEffect } from 'react';
import { WeeklyLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WeeklyLogFormProps {
  onSubmit: (log: WeeklyLog) => void;
  editingLog?: WeeklyLog | null;
  onCancelEdit?: () => void;
}

export function WeeklyLogForm({ onSubmit, editingLog, onCancelEdit }: WeeklyLogFormProps) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const [weekDate, setWeekDate] = useState(monday.toISOString().split('T')[0]);
  const [totalHours, setTotalHours] = useState(0);
  const [directClientHours, setDirectClientHours] = useState(0);
  const [couplesFamilyHours, setCouplesFamilyHours] = useState(0);
  const [supervisionHours, setSupervisionHours] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingLog) {
      setWeekDate(editingLog.weekDate);
      setTotalHours(editingLog.totalHours);
      setDirectClientHours(editingLog.directClientHours);
      setCouplesFamilyHours(editingLog.couplesFamilyHours);
      setSupervisionHours(editingLog.supervisionHours);
      setNotes(editingLog.notes);
    }
  }, [editingLog]);

  const resetForm = () => {
    setWeekDate(monday.toISOString().split('T')[0]);
    setTotalHours(0);
    setDirectClientHours(0);
    setCouplesFamilyHours(0);
    setSupervisionHours(0);
    setNotes('');
  };

  const handleSubmit = () => {
    const log: WeeklyLog = {
      id: editingLog?.id ?? crypto.randomUUID(),
      weekDate,
      totalHours,
      directClientHours,
      couplesFamilyHours,
      supervisionHours,
      notes,
    };
    onSubmit(log);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancelEdit?.();
  };

  const isEditing = !!editingLog;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{isEditing ? 'Edit Weekly Log' : 'Log Weekly Hours'}</CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update this week\'s entry. Saving recalculates your live projection.'
            : 'Record your hours for the week. Submitting recalculates your live projection.'}
        </CardDescription>
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
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Submit Weekly Log'}
          </Button>
          {isEditing && (
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
