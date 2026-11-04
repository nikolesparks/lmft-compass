import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PacingCoachProps {
  context: unknown;
}

const SUGGESTIONS = [
  'Why am I off track for my target date?',
  'How many more clients a week would I need?',
  'What if I take 3 weeks of vacation this year?',
];

export function PacingCoach({ context }: PacingCoachProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError('');
    setAnswer('');
    const { data, error: err } = await supabase.functions.invoke('pacing-coach', { body: { question: q, context } });
    setLoading(false);
    if (err) {
      let msg = 'Something went wrong. Please try again.';
      try { msg = (await (err as { context?: Response }).context?.json())?.error ?? msg; } catch { /* keep default */ }
      setError(msg);
      return;
    }
    if (data?.error) setError(data.error);
    else setAnswer(data?.answer ?? '');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ask the Pacing Assistant</CardTitle>
        <CardDescription>
          Ask about your target date and weekly pace. The AI-powered assistant explains the math using your numbers and suggests ways to stay on track.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <Button key={s} size="sm" variant="outline" onClick={() => { setQuestion(s); ask(s); }} disabled={loading}>{s}</Button>
          ))}
        </div>
        <Textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. Is my target date realistic given my couples/family hours?"
          rows={3}
          maxLength={2000}
        />
        <Button onClick={() => ask(question)} disabled={loading || !question.trim()}>
          {loading ? 'Thinking…' : 'Ask'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {answer && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed">{answer.replace(/\*\*/g, '')}</div>
        )}
        <p className="text-xs text-muted-foreground">Your pacing numbers are sent to Lovable AI only when you ask a question.</p>
      </CardContent>
    </Card>
  );
}
