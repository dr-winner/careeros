import { prisma } from "./db";

export interface EnsureJobRecordInput {
  jobId: string;
  title?: string | null;
  companyName?: string | null;
  location?: string | null;
  country?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  description?: string | null;
  requirementsText?: string | null;
  applicationUrl?: string | null;
  postedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  status?: string | null;
}

function nullIfBlank(value?: string | null): string | null {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseExternalJobId(jobId: string): {
  normalizedId: string;
  externalSource: string | null;
  externalJobId: string | null;
} {
  const normalizedId = jobId.trim();

  if (!normalizedId) {
    throw new Error("Job ID is required");
  }

  const separatorIndex = normalizedId.indexOf("-");

  if (separatorIndex <= 0 || separatorIndex === normalizedId.length - 1) {
    return {
      normalizedId,
      externalSource: null,
      externalJobId: normalizedId,
    };
  }

  return {
    normalizedId,
    externalSource: normalizedId.slice(0, separatorIndex),
    externalJobId: normalizedId.slice(separatorIndex + 1),
  };
}

export async function ensureJobRecord(input: EnsureJobRecordInput) {
  const { normalizedId, externalSource, externalJobId } = parseExternalJobId(
    input.jobId
  );

  const title = nullIfBlank(input.title) ?? "Unknown Position";

  const existing = await prisma.job.findUnique({ where: { id: normalizedId } });

  if (existing) {
    // Employer-submitted jobs are moderated content — user-triggered cache
    // calls (save/analyze) must never rewrite them or flip their status.
    if (existing.externalSource === "employer") {
      return existing;
    }

    // Cache semantics: only fill fields that are still missing. One user's
    // request must not overwrite the title/description/applicationUrl other
    // users already see, and status never changes on update.
    return prisma.job.update({
      where: { id: normalizedId },
      data: {
        title: existing.title === "Unknown Position" ? title : undefined,
        companyName: existing.companyName ?? nullIfBlank(input.companyName) ?? undefined,
        location: existing.location ?? nullIfBlank(input.location) ?? undefined,
        country: existing.country ?? nullIfBlank(input.country) ?? undefined,
        workMode: existing.workMode ?? nullIfBlank(input.workMode) ?? undefined,
        employmentType:
          existing.employmentType ?? nullIfBlank(input.employmentType) ?? undefined,
        description: existing.description ?? nullIfBlank(input.description) ?? undefined,
        requirementsText:
          existing.requirementsText ?? nullIfBlank(input.requirementsText) ?? undefined,
        applicationUrl:
          existing.applicationUrl ?? nullIfBlank(input.applicationUrl) ?? undefined,
        postedAt: existing.postedAt ?? parseDate(input.postedAt) ?? undefined,
        expiresAt: existing.expiresAt ?? parseDate(input.expiresAt) ?? undefined,
      },
    });
  }

  return prisma.job.create({
    data: {
      id: normalizedId,
      externalSource,
      externalJobId,
      title,
      companyName: nullIfBlank(input.companyName),
      location: nullIfBlank(input.location),
      country: nullIfBlank(input.country),
      workMode: nullIfBlank(input.workMode),
      employmentType: nullIfBlank(input.employmentType),
      description: nullIfBlank(input.description),
      requirementsText: nullIfBlank(input.requirementsText),
      applicationUrl: nullIfBlank(input.applicationUrl),
      postedAt: parseDate(input.postedAt),
      expiresAt: parseDate(input.expiresAt),
      status: nullIfBlank(input.status),
    },
  });
}
