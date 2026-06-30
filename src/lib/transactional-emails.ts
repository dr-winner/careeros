import { Resend } from "resend";
import { getEmailFrom, getOptionalEnv } from "@/lib/env";

const resendApiKey = getOptionalEnv("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM = getEmailFrom();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://careeros.live";

function isConfigured(): boolean {
  return Boolean(resend);
}

function baseStyles(): string {
  return [
    "body { margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
    ".container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }",
    ".header { text-align: center; margin-bottom: 32px; }",
    ".logo { color: #a78bfa; font-size: 24px; font-weight: bold; text-decoration: none; }",
    ".card { background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 32px; margin-bottom: 24px; }",
    ".greeting { color: #fafafa; font-size: 18px; margin: 0 0 16px; }",
    ".body-text { color: #d1d5db; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }",
    ".highlight { color: #a78bfa; font-weight: 500; }",
    ".cta-button { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 8px 0; }",
    ".cta-secondary { display: inline-block; background: transparent; color: #22d3ee; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid #22d3ee; margin-left: 8px; }",
    ".tip-box { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin: 20px 0; }",
    ".tip-title { color: #22c55e; font-size: 14px; font-weight: 600; margin: 0 0 8px; }",
    ".tip-text { color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.6; }",
    ".footer { text-align: center; padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 32px; }",
    ".footer-text { color: #6b7280; font-size: 12px; margin: 8px 0; }",
    ".footer-link { color: #8b5cf6; text-decoration: none; }",
    ".emoji { font-size: 20px; }",
    ".celebration { text-align: center; padding: 40px 0; }",
    ".big-number { font-size: 64px; font-weight: bold; background: linear-gradient(135deg, #22c55e, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }",
  ].join("\n");
}

function wrapHtml(content: string): string {
  return "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<style>" + baseStyles() + "</style>\n</head>\n<body>\n" + content + "\n</body>\n</html>";
}

export async function sendWelcomeEmail(
  to: string,
  firstName?: string | null
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim() || "there";
  const isNamed = name !== "there";
  const greeting = isNamed ? "Hey " + name : "Hey there";
  const subjectName = isNamed ? "Hey " + name + ", welcome to CareerOS" : "Welcome to CareerOS";

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card">',
    '<p class="greeting">' + greeting + ' 👋</p>',
    '<p class="body-text">',
    "I'm Winner, the founder of CareerOS. I built this because I know how exhausting job searching can be — sending applications into the void and never knowing if you're actually a good fit.",
    '</p>',
    '<p class="body-text">',
    '<span class="highlight">CareerOS helps you see your match score before you apply.</span> No more guessing. No more wasting hours on jobs you had no chance at anyway.',
    '</p>',
    '<p class="body-text">',
    "Here's what you can do right now:",
    '</p>',
    '<div class="tip-box">',
    '<p class="tip-title">🚀 Quick wins:</p>',
    '<p class="tip-text">',
    '1. Upload your CV and we\'ll analyze what jobs you should target<br>',
    '2. Track your applications so nothing falls through the cracks<br>',
    '3. Set up job alerts so fresh opportunities come to you',
    '</p>',
    '</div>',
    '<p class="body-text">',
    "I'll be honest — finding a job that's actually right for you takes strategy, not just spray-and-pray applications. This tool helps with the strategy part.",
    '</p>',
    '<p class="body-text">',
    "Any questions? Just reply to this email. I read every single one.",
    '</p>',
    '<p class="body-text" style="margin-bottom: 0;">',
    "Good luck out there.<br>",
    '<span class="highlight">— Winner</span>',
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/resumes" class="cta-button">Upload Your CV</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">You\'re getting this because you signed up for CareerOS.</p>',
    '<p class="footer-text">',
    '<a href="' + APP_URL + '/alerts" class="footer-link">Manage alerts</a> · ',
    '<a href="' + APP_URL + '/profile" class="footer-link">Update profile</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: subjectName,
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendApplicationTrackedEmail(
  to: string,
  firstName: string | null,
  jobTitle: string,
  companyName: string
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();
  const greeting = name ? "Hey " + name : "Hey there";

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card">',
    '<p class="greeting">' + greeting + ' 👏</p>',
    '<p class="body-text">',
    "Application tracked for <span class=\"highlight\">" + jobTitle + "</span> at <span class=\"highlight\">" + companyName + "</span>.",
    '</p>',
    '<p class="body-text">',
    "Most people apply to jobs and then forget about them. The fact that you're tracking yours means you're serious about this. I respect that.",
    '</p>',
    '<div class="tip-box">',
    '<p class="tip-title">💡 While you wait:</p>',
    '<p class="tip-text">',
    "• Research the company deeply — not just their website, but recent news, their competitors, their culture<br>",
    "• Prepare 3-5 stories from your experience that show your skills<br>",
    "• Prepare questions for them — thoughtful questions show you're serious<br>",
    "• Do a mock interview with a friend or in front of a mirror",
    '</p>',
    '</div>',
    '<p class="body-text">',
    "I'll send you updates when there are new jobs that match your profile. And if this one doesn't work out — keep going. The right opportunity always shows up eventually.",
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/applications" class="cta-button">View Your Applications</a>',
    '<a href="' + APP_URL + '/interview" class="cta-secondary">Prep for Interviews</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    '<a href="' + APP_URL + '/alerts" class="footer-link">Manage alerts</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: "Application tracked — " + jobTitle + " at " + companyName,
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send application tracked email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendInterviewEmail(
  to: string,
  firstName: string | null,
  jobTitle: string,
  companyName: string
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();
  const first = name ? name.split(" ")[0] : null;
  const greeting = first ? "Hey " + first : "Hey there";
  const subjectPart = first ? first + ", you" : "You";

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card" style="border-color: rgba(34, 197, 94, 0.3);">',
    '<p class="greeting">' + greeting + ' 🎉</p>',
    '<p class="body-text">',
    "You're getting an interview for <span class=\"highlight\">" + jobTitle + "</span> at <span class=\"highlight\">" + companyName + "</span>.",
    '</p>',
    '<p class="body-text">',
    "This is huge. Seriously. Companies don't interview people they don't think can do the job. They see something in you.",
    '</p>',
    '<p class="body-text">',
    "Now comes the part where you prove them right. Here's what I'd recommend:",
    '</p>',
    '<div class="tip-box" style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3);">',
    '<p class="tip-title" style="color: #a78bfa;">📋 Before the interview:</p>',
    '<p class="tip-text">',
    "• Research the company deeply — not just their website, but recent news, their competitors, their culture<br>",
    "• Prepare 3-5 stories from your experience that show your skills<br>",
    "• Prepare questions for them — thoughtful questions show you're serious<br>",
    "• Do a mock interview with a friend or in front of a mirror",
    '</p>',
    '</div>',
    '<div class="tip-box">',
    '<p class="tip-title">🎯 During the interview:</p>',
    '<p class="tip-text">',
    "• Be yourself. They're hiring a person, not a resume<br>",
    "• Ask clarifying questions before answering<br>",
    "• Don't be afraid of silence — it's okay to think<br>",
    "• Follow up with a thank-you email within 24 hours",
    '</p>',
    '</div>',
    '<p class="body-text">',
    "You made it this far. The least you can do is give it your best shot. And honestly? You already have what it takes. You just need to show them.",
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/interview" class="cta-button">Interview Prep Resources</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    "You've got this. Now go show them what you've got.<br>",
    '<span class="highlight">— Winner</span>',
    '</p>',
    '<p class="footer-text" style="margin-top: 16px;">',
    '<a href="' + APP_URL + '/applications" class="footer-link">View applications</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: subjectPart + "'re getting an interview! 🎉",
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send interview email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendOfferEmail(
  to: string,
  firstName: string | null,
  jobTitle: string,
  companyName: string
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();
  const first = name ? name.split(" ")[0] : null;
  const greeting = name ? "Hey " + name : "Hey there";
  const subjectPart = first ? first + ", you" : "You";
  const closeName = name || "friend";

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(6, 182, 212, 0.1)); border-color: rgba(34, 197, 94, 0.4);">',
    '<div class="celebration">',
    '<p class="emoji">🏆</p>',
    '<p class="big-number">OFFER</p>',
    '</div>',
    '<p class="body-text" style="text-align: center;">',
    '<span class="highlight" style="font-size: 18px;">' + jobTitle + '</span><br>',
    'at <span class="highlight" style="font-size: 18px;">' + companyName + '</span>',
    '</p>',
    '<p class="body-text">',
    greeting + ", you did it. You actually did it. Whether this is your first job or you're making a career change, this moment matters. Take it in.",
    '</p>',
    '<p class="body-text">',
    "Take your time reviewing the offer. Don't rush, don't feel pressured. If something feels off, trust your gut. But if it feels right? Go for it.",
    '</p>',
    '<p class="body-text">',
    "And hey — if you want to share CareerOS with someone who could use it, I'd really appreciate it. Word of mouth from people like you is how this grows.",
    '</p>',
    '<p class="body-text" style="margin-bottom: 0;">',
    "Congrats, " + closeName + ". You earned this.<br>",
    '<span class="highlight">— Winner</span>',
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/referrals" class="cta-button">Share CareerOS</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    '<a href="' + APP_URL + '/applications" class="footer-link">View your journey</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: subjectPart + " got an offer! 🏆",
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send offer email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendReEngagementEmail(
  to: string,
  firstName: string | null,
  daysSinceActive: number
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();
  const first = name ? name.split(" ")[0] : null;
  const greeting = name ? "Hey " + name : "Hey there";
  const subjectFirst = first ? first + ", just checking in" : "Been a while — here's what's new";

  const openings = [
    "Just checking in.",
    "Been thinking about you.",
    "Hope things are going well.",
    "Long time no hear.",
  ];
  const randomOpening = openings[Math.floor(Math.random() * openings.length)];

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card">',
    '<p class="greeting">' + greeting + ' 👋</p>',
    '<p class="body-text">',
    randomOpening + " It's been " + daysSinceActive + " days since you last visited CareerOS. Not judging — life happens.",
    '</p>',
    '<p class="body-text">',
    "But if you're still in the job hunt, I'm here. And the job market doesn't wait.",
    '</p>',
    '<div class="tip-box" style="background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.3);">',
    '<p class="tip-title" style="color: #22d3ee;">🔄 What\'s new:</p>',
    '<p class="tip-text">',
    "• We've added more job sources — more opportunities for you<br>",
    "• Better match scoring so you know where you stand<br>",
    "• Interview prep resources to help you shine",
    '</p>',
    '</div>',
    '<p class="body-text">',
    "No pressure. Just know that the jobs won't apply to themselves.",
    '</p>',
    '<p class="body-text" style="margin-bottom: 0;">',
    "Whatever you're going through — keep pushing.<br>",
    '<span class="highlight">— Winner</span>',
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/jobs" class="cta-button">Browse Jobs</a>',
    '<a href="' + APP_URL + '/dashboard" class="cta-secondary">Back to Dashboard</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    "Still not ready? No worries.<br>",
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a> · ',
    '<a href="' + APP_URL + '/alerts" class="footer-link">Manage alerts</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: subjectFirst,
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send re-engagement email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendWeeklyDigestEmail(
  to: string,
  firstName: string | null,
  stats: {
    totalApplications: number;
    activeApplications: number;
    newJobsMatched: number;
  }
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();
  const first = name ? name.split(" ")[0] : null;
  const greeting = name ? "Hey " + name : "Hey there";
  const subjectName = first ? "Your weekly job search update for " + first : "Your weekly job search update";

  const activeMsg = stats.activeApplications === 0
    ? "No active applications right now. That's okay — quality over quantity. But maybe it's time to put yourself out there again?"
    : "You've got " + stats.activeApplications + " application" + (stats.activeApplications === 1 ? '' : 's') + " in the pipeline. Keep following up and don't give up.";

  const newJobsMsg = stats.newJobsMatched > 0
    ? '<p class="body-text"><span class="highlight">' + stats.newJobsMatched + " new job" + (stats.newJobsMatched === 1 ? '' : 's') + '</span> matched your profile this week. Worth a look?</p>'
    : '<p class="body-text">No new matches this week? Expand your search criteria or check back soon — the job market moves fast.</p>';

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '<p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your weekly job search update</p>',
    '</div>',
    '<div class="card">',
    '<p class="greeting">' + greeting + ' 👋</p>',
    '<p class="body-text">',
    "Here's your weekly snapshot. Let's see how you're doing:",
    '</p>',
    '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 24px 0;">',
    '<div style="text-align: center; padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 12px;">',
    '<p style="font-size: 32px; font-weight: bold; color: #a78bfa; margin: 0;">' + stats.totalApplications + '</p>',
    '<p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Total Applied</p>',
    '</div>',
    '<div style="text-align: center; padding: 20px; background: rgba(34, 197, 94, 0.1); border-radius: 12px;">',
    '<p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 0;">' + stats.activeApplications + '</p>',
    '<p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Active</p>',
    '</div>',
    '<div style="text-align: center; padding: 20px; background: rgba(6, 182, 212, 0.1); border-radius: 12px;">',
    '<p style="font-size: 32px; font-weight: bold; color: #22d3ee; margin: 0;">' + stats.newJobsMatched + '</p>',
    '<p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">New Matches</p>',
    '</div>',
    '</div>',
    '<p class="body-text">' + activeMsg + '</p>',
    newJobsMsg,
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/jobs" class="cta-button">Browse New Jobs</a>',
    '<a href="' + APP_URL + '/dashboard" class="cta-secondary">View Dashboard</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    "Sent every week · ",
    '<a href="' + APP_URL + '/alerts" class="footer-link">Manage alerts</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: subjectName,
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send weekly digest email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendReferralConvertedEmail(
  to: string,
  firstName: string | null,
  refereeName: string | null
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();
  const greeting = name ? "Hey " + name : "Hey there";
  const referee = refereeName?.trim() || "Someone you referred";

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(6, 182, 212, 0.08)); border-color: rgba(34, 197, 94, 0.3);">',
    '<p class="greeting">' + greeting + ' 🎉</p>',
    '<p class="body-text">',
    "<span class=\"highlight\">" + referee + "</span> just joined CareerOS and ran their first job analysis.",
    '</p>',
    '<p class="body-text">',
    "Because of that, you've earned <span class=\"highlight\">1 bonus analysis</span> on top of your monthly limit. It's already in your account.",
    '</p>',
    '<div class="tip-box">',
    '<p class="tip-title">💡 What\'s a bonus analysis?</p>',
    '<p class="tip-text">',
    "Every time you refer someone and they actively use CareerOS, you get an extra job fit analysis — on top of your free monthly quota. There's no cap on how many you can earn.",
    '</p>',
    '</div>',
    '<p class="body-text">',
    "Keep sharing — every person you bring in earns you another one.",
    '</p>',
    '<p class="body-text" style="margin-bottom: 0;">',
    "— <span class=\"highlight\">Winner</span>",
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/referrals" class="cta-button">Share More · Earn More</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    '<a href="' + APP_URL + '/dashboard" class="footer-link">Back to CareerOS</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: "Your referral just joined — you earned a bonus analysis 🎉",
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send referral converted email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendReferralReceivedEmail(
  to: string,
  firstName: string | null,
  refereeEmail: string
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card">',
    '<p class="greeting">Yo ' + (name || "there") + ' ✌️</p>',
    '<p class="body-text">',
    "Your referral invite was sent to <span class=\"highlight\">" + refereeEmail + "</span>. Whoever you sent it to is lucky to have someone in their corner looking out for them.",
    '</p>',
    '<div class="tip-box">',
    '<p class="tip-title">💡 Here\'s the deal:</p>',
    '<p class="tip-text">',
    "When they sign up and land a job through CareerOS, we both win. They get better job matches, and you get credit for helping them find their next role.",
    '</p>',
    '</div>',
    '<p class="body-text">',
    "Thanks for spreading the word. It means more than you know.",
    '</p>',
    '<p class="body-text" style="margin-bottom: 0;">',
    "— <span class=\"highlight\">Winner</span>",
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/referrals" class="cta-button">View Your Referrals</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    '<a href="' + APP_URL + '/dashboard" class="footer-link">Back to CareerOS</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: "Your CareerOS referral is on its way ✌️",
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send referral received email:", error);
    return { success: false, error: error as Error };
  }
}

export async function sendRejectionEmail(
  to: string,
  firstName: string | null,
  jobTitle: string,
  companyName: string
): Promise<{ success: boolean; error?: Error }> {
  if (!isConfigured()) {
    return { success: false, error: new Error("Email not configured") };
  }

  const name = firstName?.trim();
  const first = name ? name.split(" ")[0] : null;
  const greeting = name ? "Hey " + name : "Hey there";

  const content = [
    '<div class="container">',
    '<div class="header">',
    '<span class="logo">CareerOS</span>',
    '</div>',
    '<div class="card">',
    '<p class="greeting">' + greeting + ' 💙</p>',
    '<p class="body-text">',
    "I saw you updated your application for <span class=\"highlight\">" + jobTitle + "</span> at <span class=\"highlight\">" + companyName + "</span>.",
    '</p>',
    '<p class="body-text">',
    "That one didn't work out. I'm not gonna sugarcoat it — rejection sucks. It's okay to feel whatever you're feeling right now.",
    '</p>',
    '<p class="body-text">',
    "But here's what I want you to remember: <span class=\"highlight\">one \"no\" brings you closer to your \"yes.\"</span> Every interview, every application, every rejection — it's all data. It's all pointing you toward the right fit.",
    '</p>',
    '<p class="body-text">',
    "The right opportunity is out there. It might take longer than you want, but it will come. And when it does, you'll be ready.",
    '</p>',
    '<p class="body-text">',
    "Keep going. I've got your back.",
    '</p>',
    '<p class="body-text" style="margin-bottom: 0;">',
    "— <span class=\"highlight\">Winner</span>",
    '</p>',
    '</div>',
    '<div style="text-align: center;">',
    '<a href="' + APP_URL + '/jobs" class="cta-button">Find New Opportunities</a>',
    '<a href="' + APP_URL + '/dashboard" class="cta-secondary">Back to Dashboard</a>',
    '</div>',
    '<div class="footer">',
    '<p class="footer-text">',
    '<a href="' + APP_URL + '/applications" class="footer-link">View applications</a> · ',
    '<a href="' + APP_URL + '/alerts" class="footer-link">Manage alerts</a> · ',
    '<a href="' + APP_URL + '/unsubscribe" class="footer-link">Unsubscribe</a>',
    '</p>',
    '</div>',
    '</div>',
  ].join("\n");

  try {
    await resend!.emails.send({
      from: FROM,
      to,
      subject: (first ? first + ", " : "") + "Onward and upward 💙",
      html: wrapHtml(content),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send rejection email:", error);
    return { success: false, error: error as Error };
  }
}
