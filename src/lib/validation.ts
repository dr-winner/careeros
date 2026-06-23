import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const nullableTrimmedString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const emailSchema = z.email().transform((value) => value.toLowerCase());

export const applicationStatuses = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;

export const alertFrequencies = ["daily", "weekly"] as const;

export const profileUpdateSchema = z
  .object({
    fullName: nullableTrimmedString,
    phone: nullableTrimmedString,
    headline: nullableTrimmedString,
    country: nullableTrimmedString,
    experience: nullableTrimmedString,
    desiredRole: nullableTrimmedString,
    roleType: nullableTrimmedString,
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: "At least one profile field must be provided" }
  );

export const createApplicationSchema = z.object({
  jobId: z.string().trim().min(1, "Job ID required"),
  jobTitle: nullableTrimmedString,
  companyName: nullableTrimmedString,
  location: nullableTrimmedString,
  workMode: nullableTrimmedString,
  notes: nullableTrimmedString,
});

export const updateApplicationSchema = z
  .object({
    status: z.enum(applicationStatuses).optional(),
    notes: nullableTrimmedString,
  })
  .refine(
    (data) => data.status !== undefined || data.notes !== undefined,
    { message: "At least one field must be provided" }
  );

export const fitAnalysisRequestSchema = z.object({
  jobId: z.string().trim().min(1, "Job ID required"),
  jobTitle: z.string().trim().min(1, "Job title required"),
});

export const createSavedSearchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  searchQuery: z.string().trim().min(1, "Search query is required").max(200),
  location: nullableTrimmedString,
  workMode: nullableTrimmedString,
  seniority: nullableTrimmedString,
  alertEnabled: z.boolean().optional(),
  alertFrequency: z.enum(alertFrequencies).optional(),
});

export const updateSavedSearchSchema = z
  .object({
    alertEnabled: z.boolean().optional(),
    alertFrequency: z.enum(alertFrequencies).optional(),
  })
  .refine(
    (data) => data.alertEnabled !== undefined || data.alertFrequency !== undefined,
    { message: "At least one alert field must be provided" }
  );

export const saveJobSchema = z.object({
  jobId: z.string().trim().min(1, "Job ID required"),
  title: optionalTrimmedString,
  companyName: nullableTrimmedString,
  location: nullableTrimmedString,
  country: nullableTrimmedString,
  workMode: nullableTrimmedString,
  description: nullableTrimmedString,
  applicationUrl: z
    .union([z.url(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (!value) return null;
      return value;
    }),
});

export const referralInviteSchema = z.object({
  refereeEmail: emailSchema,
});

export const coverLetterRequestSchema = z.object({
  jobTitle: z.string().trim().min(1, "Job title required").max(200),
  companyName: z.string().trim().min(1, "Company name required").max(200),
  jobDescription: nullableTrimmedString,
  recipientName: nullableTrimmedString,
});

export const mockInterviewSchema = z.object({
  action: z.enum(["start", "respond", "feedback"]),
  role: z.string().trim().min(1, "Role required").max(200),
  experienceLevel: z.string().trim().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
  currentQuestion: z.string().optional(),
  userResponse: z.string().optional(),
});

export function getCronSecretFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  const bearerPrefix = "Bearer ";

  if (authHeader?.startsWith(bearerPrefix)) {
    return authHeader.slice(bearerPrefix.length).trim() || null;
  }

  return request.headers.get("x-cron-secret")?.trim() || null;
}

export function isValidCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();

  if (!expected) {
    return false;
  }

  const provided = getCronSecretFromRequest(request);
  return !!provided && provided === expected;
}

export function getZodErrorMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message || "Invalid request";
}
