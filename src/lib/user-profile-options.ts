/** Shared between profile, guided onboarding, and API-related UI so saved values always match a select option. */
export const PROFILE_COUNTRIES = [
  "Ghana",
  "Nigeria",
  "Kenya",
  "South Africa",
  "Global / Remote Only",
  "Other",
] as const;

/** Profile page role buckets */
export const ROLE_TYPES = [
  "Developer",
  "Designer",
  "Data/Analytics",
  "Marketing",
  "Sales",
  "Operations",
  "HR",
  "Finance",
  "Other",
] as const;

/**
 * Include both year ranges (profile) and level labels (onboarding) so values from either flow stay valid.
 */
export const EXPERIENCE_LEVELS = [
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
  "Entry Level",
  "Mid Level",
  "Senior",
  "Lead",
  "Manager",
  "Director",
] as const;
