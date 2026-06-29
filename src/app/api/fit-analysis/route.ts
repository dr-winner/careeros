import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUser } from "@/lib/auth";

export async function GET() {
  const dbUser = await getDbUser();
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analyses = await prisma.fitAnalysis.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      fitScore: true,
      createdAt: true,
      job: { select: { title: true, companyName: true, location: true } },
    },
  });

  return NextResponse.json({ analyses });
}
