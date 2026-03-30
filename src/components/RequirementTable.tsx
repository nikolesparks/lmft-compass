import { RequirementStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RequirementTableProps {
  requirements: RequirementStatus[];
}

function statusEmoji(s: RequirementStatus['status']) {
  switch (s) {
    case 'met': return '✅';
    case 'on-track': return '🟢';
    case 'slightly-behind': return '🟡';
    case 'falling-behind': return '🔴';
  }
}

export function RequirementTable({ requirements }: RequirementTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Requirement Details</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Requirement</th>
              <th className="pb-3 font-medium text-right">Required</th>
              <th className="pb-3 font-medium text-right">Accrued</th>
              <th className="pb-3 font-medium text-right">Remaining</th>
              <th className="pb-3 font-medium text-right">Original Date</th>
              <th className="pb-3 font-medium text-right">Live Date</th>
              <th className="pb-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map(r => (
              <tr key={r.label} className="border-b last:border-0">
                <td className="py-3 font-medium">
                  {r.label}
                  {r.isWeekConstraint && <span className="ml-2 text-xs text-warning">⚠️ Binding constraint</span>}
                </td>
                <td className="py-3 text-right">{r.required.toLocaleString()}</td>
                <td className="py-3 text-right font-medium">{r.accrued.toLocaleString()}</td>
                <td className="py-3 text-right text-muted-foreground">{r.remaining.toLocaleString()}</td>
                <td className="py-3 text-right">{new Date(r.originalProjectedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                <td className="py-3 text-right font-medium">{new Date(r.liveProjectedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                <td className="py-3 text-center">{statusEmoji(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
