import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const searches = await prisma.savedSearch.findMany({
      where: {
        alertEnabled: true,
        alertFrequency: "daily",
        OR: [
          { lastNotified: null },
          { lastNotified: { lt: yesterday } },
        ],
      },
      include: {
        user: true,
      },
    });

    let emailsSent = 0;

    for (const search of searches) {
      if (!search.user?.email) continue;

      const mockJobs = getMockJobs(search.searchQuery, search.location);

      if (mockJobs.length > 0) {
        const jobList = mockJobs
          .slice(0, 5)
          .map(
            (job) => `
          <li style="margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
            <strong style="color: #059669;">${job.title}</strong> at ${job.companyName}<br>
            <span style="color: #6b7280; font-size: 14px;">${job.location} • ${job.workMode}</span><br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}" style="color: #059669; font-size: 14px;">View Job →</a>
          </li>
        `
          )
          .join("");

        await resend.emails.send({
          from: "CareerOS <noreply@careeros.app>",
          to: search.user.email,
          subject: `New jobs matching "${search.searchQuery}"`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #059669; margin: 0;">CareerOS</h1>
                <p style="color: #6b7280; margin: 8px 0 0;">New jobs matching your alert</p>
              </div>
              
              <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <strong style="color: #059669;">Alert:</strong> ${search.name}<br>
                <span style="color: #6b7280; font-size: 14px;">${search.searchQuery}${search.location ? ` in ${search.location}` : ""}</span>
              </div>
              
              <h2 style="color: #1f2937; margin-bottom: 16px;">${mockJobs.length} new job${mockJobs.length > 1 ? "s" : ""} found</h2>
              
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${jobList}
              </ul>
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Manage Alerts
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                You're receiving this because you set up a job alert on CareerOS.
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts" style="color: #059669;">Manage preferences</a>
              </p>
            </div>
          `,
        });

        await prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastNotified: now },
        });

        emailsSent++;
      }
    }

    return NextResponse.json({
      success: true,
      searchesChecked: searches.length,
      emailsSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Failed to send alerts" }, { status: 500 });
  }
}

function getMockJobs(search: string, location?: string | null) {
  const allJobs = [
    { id: "sample-1", title: "Frontend Developer", companyName: "TechHub Ghana", location: "Accra, Ghana", workMode: "Hybrid" },
    { id: "sample-2", title: "Software Engineer", companyName: "Andela", location: "Remote", workMode: "Remote" },
    { id: "sample-3", title: "Data Analyst", companyName: "MTN Ghana", location: "Accra, Ghana", workMode: "On-site" },
    { id: "sample-4", title: "UX Designer", companyName: "Paystack", location: "Lagos, Nigeria", workMode: "Hybrid" },
    { id: "sample-5", title: "Backend Developer", companyName: "Flutterwave", location: "Nairobi, Kenya", workMode: "Hybrid" },
    { id: "sample-6", title: "Product Manager", companyName: "Jumia", location: "Lagos, Nigeria", workMode: "On-site" },
    { id: "sample-7", title: "DevOps Engineer", companyName: "GhanaWater", location: "Accra, Ghana", workMode: "On-site" },
    { id: "sample-8", title: "Mobile Developer", companyName: "Carbon", location: "Lagos, Nigeria", workMode: "Remote" },
  ];

  const searchLower = search.toLowerCase();

  return allJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchLower) ||
      job.companyName.toLowerCase().includes(searchLower) ||
      (location && job.location.toLowerCase().includes(location.toLowerCase()))
  );
}
