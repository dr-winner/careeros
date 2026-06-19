import Link from "next/link";

export const metadata = { title: "Terms of Service – CareerOS" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-300 px-6 py-16 max-w-3xl mx-auto">
      <Link href="/" className="text-purple-400 text-sm hover:text-purple-300 mb-8 inline-block">← Back</Link>
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-zinc-500 text-sm mb-10">Last updated: June 2026</p>

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
          <p>Premium features are unlocked on a one-time payment basis. Payments are non-refundable unless required by applicable law. We reserve the right to change pricing with 30 days notice.</p>
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
