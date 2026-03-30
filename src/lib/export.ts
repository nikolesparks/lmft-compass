import { RequirementStatus, Projection } from './types';

export function exportSummary(
  requirements: RequirementStatus[],
  originalProjection: Projection,
  liveProjection: Projection,
  overallProgress: number,
): void {
  const statusEmoji = (s: RequirementStatus['status']) => {
    switch (s) {
      case 'met': return '✅';
      case 'on-track': return '🟢';
      case 'slightly-behind': return '🟡';
      case 'falling-behind': return '🔴';
    }
  };

  const lines = [
    'LMFT LICENSURE PROGRESS SUMMARY',
    `Generated: ${new Date().toLocaleDateString()}`,
    `Overall Progress: ${overallProgress}%`,
    '',
    `Original Target Licensure Date: ${new Date(originalProjection.licensureDate).toLocaleDateString()}`,
    `Live Projected Licensure Date: ${new Date(liveProjection.licensureDate).toLocaleDateString()}`,
    '',
    '─'.repeat(80),
    '',
  ];

  for (const r of requirements) {
    lines.push(`${statusEmoji(r.status)} ${r.label}${r.isWeekConstraint ? ' ⚠️ BOTTLENECK' : ''}`);
    lines.push(`   Required: ${r.required}  |  Accrued: ${r.accrued}  |  Remaining: ${r.remaining}`);
    lines.push(`   Original Projection: ${new Date(r.originalProjectedDate).toLocaleDateString()}`);
    lines.push(`   Live Projection: ${new Date(r.liveProjectedDate).toLocaleDateString()}`);
    lines.push('');
  }

  lines.push('─'.repeat(80));
  lines.push('California BBS LMFT Requirements Tracker');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lmft-progress-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
