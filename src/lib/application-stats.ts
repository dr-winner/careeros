/** Statuses the user marked past Applied. Not confirmed employer replies. */
export const ADVANCED_STATUSES = ["Screening", "Interview", "Offer"] as const;

export const INTERVIEW_PIPELINE_STATUSES = ["Screening", "Interview"] as const;

export function isAdvancedStatus(status: string): boolean {
  return (ADVANCED_STATUSES as readonly string[]).includes(status);
}

export function isInterviewPipelineStatus(status: string): boolean {
  return (INTERVIEW_PIPELINE_STATUSES as readonly string[]).includes(status);
}

export function advancedPastAppliedCount(statuses: string[]): number {
  return statuses.filter(isAdvancedStatus).length;
}

/** Percent of tracked apps the user moved past Applied. */
export function advancedRatePercent(statuses: string[]): number {
  if (statuses.length === 0) return 0;
  return Math.round((advancedPastAppliedCount(statuses) / statuses.length) * 100);
}

export const ADVANCED_RATE_HELPER =
  "Statuses you set past Applied — not confirmed employer replies";
