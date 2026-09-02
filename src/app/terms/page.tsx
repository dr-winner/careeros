import Link from "next/link";

export const metadata = { title: "Terms of Service – CareerOS" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-300 px-6 py-16 max-w-3xl mx-auto">
      <Link href="/" className="text-purple-400 text-sm hover:text-purple-300 mb-8 inline-block">← Back</Link>
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-zinc-500 text-sm mb-10">Last updated: September 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-base mb-3">Acceptance</h2>
          <p>By using CareerOS you agree to these terms. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">What CareerOS is</h2>
          <p>CareerOS is a career intelligence tool that helps job seekers analyse their CV fit against job postings, track applications, and prepare for interviews. It is an informational tool — not a job placement agency or recruiter.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Your account</h2>
          <p>You are responsible for maintaining the security of your account. You must not share your login or use CareerOS to submit false information. Accounts suspected of abuse may be suspended without notice.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Premium plan</h2>
          <p>Premium is sold as a prepaid access period — currently one month or one year — paid through Moolre by mobile money or card. Payments are taken once, up front; we do not set up automatic or recurring debits from your wallet or card. Before a period ends we will email you a renewal link. If you do not renew, your account returns to the free plan and your data is kept.</p>
          <p className="mt-3">Payments are non-refundable unless required by applicable law. Early supporters who purchased the former one-time lifetime plan keep lifetime access. We reserve the right to change pricing with 30 days notice; changes never affect a period you have already paid for.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Free plan and AI credits</h2>
          <p>Free accounts include a monthly allowance of AI credits (currently three). Each job-fit analysis, AI cover letter or AI mock interview session uses one credit. Credits reset at the start of each calendar month and do not roll over. Referral bonuses may add credits to an account. We may adjust the allowance with notice.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Referral rewards</h2>
          <p>When someone you refer runs their first analysis you receive a bonus AI credit. When they purchase Premium you receive a cash reward (currently GHS 5) credited to your CareerOS balance, withdrawable to a Ghanaian mobile money wallet from a minimum of GHS 5. Self-referrals, fake accounts or abuse void rewards.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Job listings</h2>
          <p>Jobs shown on CareerOS are aggregated from third-party job boards and company career pages, or submitted by employers. We do not verify every listing and are not responsible for their accuracy, availability or the hiring decisions of employers. Never pay anyone to apply for a job.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">AI-generated content</h2>
          <p>AI analysis, fit scores, and CV suggestions are generated automatically and are provided for guidance only. CareerOS does not guarantee accuracy or employment outcomes. Always review AI output critically before acting on it.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Intellectual property</h2>
          <p>CareerOS and its UI are owned by CareerOS. Your CV content remains yours. You grant CareerOS a limited licence to process your CV for the purpose of providing the service.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Limitation of liability</h2>
          <p>CareerOS is provided &quot;as is&quot;. We are not liable for any direct or indirect damages arising from your use of the service, including missed job opportunities or reliance on AI analysis.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Contact</h2>
          <p>Questions? Email <a href="mailto:support@careeros.live" className="text-purple-400 hover:underline">support@careeros.live</a>.</p>
        </section>
      </div>
    </div>
  );
}
