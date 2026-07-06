import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getZodErrorMessage, profileUpdateSchema } from "@/lib/validation";
import { isMoolreConfigured, validateWalletName } from "@/lib/moolre";

export async function GET() {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [savedJobsCount, resumesCount, alertsCount, applicationsCount] =
      await Promise.all([
        prisma.savedJob.count({ where: { userId: user.id } }),
        prisma.resume.count({ where: { userId: user.id } }),
        prisma.savedSearch.count({ where: { userId: user.id } }),
        prisma.application.count({ where: { userId: user.id } }),
      ]);

    return NextResponse.json({
      user,
      counts: {
        savedJobs: savedJobsCount,
        resumes: resumesCount,
        alerts: alertsCount,
        applications: applicationsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = profileUpdateSchema.parse(body);

    // Confirm the wallet holder's name with Moolre before saving a payout
    // number. Validation runs on the EFFECTIVE pair (incoming merged with
    // stored), so setting number and network in separate requests can't
    // bypass the check.
    let walletName: string | null = null;
    const effectiveNumber = data.momoNumber !== undefined ? data.momoNumber : user.momoNumber;
    const effectiveChannel = data.momoChannel !== undefined ? data.momoChannel : user.momoChannel;
    const walletTouched = data.momoNumber !== undefined || data.momoChannel !== undefined;

    if (walletTouched && effectiveNumber && effectiveChannel && isMoolreConfigured()) {
      const validation = await validateWalletName(effectiveNumber, effectiveChannel);
      if (!validation.ok) {
        return NextResponse.json(
          { error: "This mobile money number could not be verified. Check the number and network." },
          { status: 400 },
        );
      }
      walletName = validation.name;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: updatedUser, walletName });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

