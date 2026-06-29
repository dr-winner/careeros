import { prisma } from "@/lib/db";

// Parse externalref formats:
//   new: co-{userId}-{planCode}-{timestamp}  (planCode = "m" | "a")
//   legacy: co-{userId}-{timestamp}          (treated as lifetime)
export function parseExternalRef(ref: string): {
  userId: string | null;
  billingCycle: "monthly" | "annual" | "lifetime";
} {
  if (!ref.startsWith("co-")) return { userId: null, billingCycle: "monthly" };

  const parts = ref.split("-");
  // parts[0] = "co", parts[1] = userId (cuid, no hyphens)
  const userId = parts[1] || null;

  if (parts.length === 4) {
    // New format: co-{userId}-{planCode}-{timestamp}
    const planCode = parts[2];
    const billingCycle = planCode === "a" ? "annual" : "monthly";
    return { userId, billingCycle };
  }

  // Legacy format: co-{userId}-{timestamp} — one-time lifetime purchase
  return { userId, billingCycle: "lifetime" };
}

// Compute the next period end date from now
function periodEnd(billingCycle: "monthly" | "annual" | "lifetime"): Date | null {
  if (billingCycle === "lifetime") return null;
  const d = new Date();
  if (billingCycle === "annual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export async function activateSubscription(
  userId: string,
  billingCycle: "monthly" | "annual" | "lifetime",
): Promise<void> {
  const isLifetime = billingCycle === "lifetime";
  const end = periodEnd(billingCycle);

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium:          true,
      premiumSince:       new Date(),
      subscriptionStatus: isLifetime ? "lifetime" : "active",
      billingCycle:       isLifetime ? null : billingCycle,
      currentPeriodEnd:   end,
    },
  });
}
