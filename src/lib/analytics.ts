"use client";

import { usePostHog } from "posthog-js/react";

export function useAnalytics() {
  const ph = usePostHog();

  return {
    track: (event: string, props?: Record<string, unknown>) => {
      ph?.capture(event, props);
    },
    // Key product events
    cvUploaded: () => ph?.capture("cv_uploaded"),
    jobAnalyzed: (props: { score: number; jobTitle: string; isPremium: boolean }) =>
      ph?.capture("job_analyzed", props),
    paywallShown: (feature: string) => ph?.capture("paywall_shown", { feature }),
    upgradeClicked: (source: string) => ph?.capture("upgrade_clicked", { source }),
    coverLetterGenerated: () => ph?.capture("cover_letter_generated"),
    applicationTracked: (status: string) => ph?.capture("application_tracked", { status }),
    interviewStarted: () => ph?.capture("interview_started"),
    feedbackGiven: (props: { sentiment: "up" | "down"; context: string }) =>
      ph?.capture("feedback_given", props),
  };
}
