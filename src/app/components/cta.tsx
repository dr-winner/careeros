import WaitlistForm from "./waitlist-form";

export default function CTA() {
  return (
    <section className="bg-emerald-950 py-24 px-6">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500">
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Launching soon.
        </h2>
        <p className="mx-auto mt-4 text-emerald-200/70">
          Join the waitlist and be first to know when CareerOS goes live.
          We&apos;ll send you one email when we&apos;re ready.
        </p>

        <div className="mt-10">
          <WaitlistForm />
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-emerald-300/60">
          <span>Free to join</span>
          <span>|</span>
          <span>One notification</span>
          <span>|</span>
          <span>No spam</span>
        </div>
      </div>
    </section>
  );
}
