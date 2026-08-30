// The "verdict" headline shown at the top of a turn reveal — distinct
// from buildExplanation() in dashboard/page.tsx, which explains WHY
// the turn went that way. This just judges HOW it went, in one line,
// so the reveal has a punchline before the numbers.

export interface HeadlineInputs {
  netCashChange: number;
  capitalAfter: number;
  leveledUp?: boolean;
  level?: number;
  breakdownOccurred?: boolean;
}

export function buildHeadline(inputs: HeadlineInputs): string {
  if (inputs.leveledUp) {
    return `Level up — you're now level ${inputs.level}.`;
  }
  if (inputs.breakdownOccurred) {
    return "Rough turn — the machine broke down and production stopped.";
  }

  const capitalBefore = inputs.capitalAfter - inputs.netCashChange;
  const pctChange = capitalBefore > 0 ? inputs.netCashChange / capitalBefore : 0;

  if (pctChange > 0.05) return "Strong turn — capital is climbing fast.";
  if (pctChange > 0) return "Good turn — you came out ahead.";
  if (pctChange === 0) return "Flat turn — cash held steady.";
  if (pctChange > -0.05) return "Tight turn — costs nearly matched revenue.";
  return "Tough turn — costs outpaced revenue.";
}
