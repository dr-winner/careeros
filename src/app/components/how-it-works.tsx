export default function HowItWorks() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-emerald-950 sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-emerald-800/60">
            Three steps to stop guessing and start applying with confidence.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="group relative rounded-2xl border border-emerald-100 bg-emerald-50/50 p-8 transition hover:border-emerald-200 hover:shadow-lg">
            <div className="mb-4 text-5xl font-bold text-emerald-100 group-hover:text-emerald-200">01</div>
            <h3 className="text-xl font-semibold text-emerald-950">Upload your CV</h3>
            <p className="mt-2 text-emerald-800/70">
              Takes 30 seconds. We extract your skills, experience, and education automatically.
            </p>
          </div>

          <div className="group relative rounded-2xl border border-emerald-100 bg-emerald-50/50 p-8 transition hover:border-emerald-200 hover:shadow-lg">
            <div className="mb-4 text-5xl font-bold text-emerald-100 group-hover:text-emerald-200">02</div>
            <h3 className="text-xl font-semibold text-emerald-950">Pick a job</h3>
            <p className="mt-2 text-emerald-800/70">
              Browse roles or paste a job link. We compare it against your profile instantly.
            </p>
          </div>

          <div className="group relative rounded-2xl border border-emerald-100 bg-emerald-50/50 p-8 transition hover:border-emerald-200 hover:shadow-lg">
            <div className="mb-4 text-5xl font-bold text-emerald-100 group-hover:text-emerald-200">03</div>
            <h3 className="text-xl font-semibold text-emerald-950">See your fit score</h3>
            <p className="mt-2 text-emerald-800/70">
              Get an honest breakdown of matches, gaps, and specific things to improve.
            </p>
          </div>
        </div>

        <div className="mt-16 rounded-2xl border border-amber-200 bg-amber-50 p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="text-2xl font-bold text-emerald-950">
                No more applying blind.
              </h3>
              <p className="mt-4 text-emerald-800/70">
                Most people send CVs to jobs they have no business applying to.
                CareerOS shows you exactly where you stand so you can focus your
                energy on roles where you actually have a shot.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Honest assessment, not false hope",
                  "Specific gaps, not generic advice",
                  "CV suggestions tied to each role",
                  "Interview questions that match the job",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-emerald-800">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
              <div className="mb-4 border-b border-emerald-100 pb-4">
                <div className="text-sm text-emerald-600">Fit Analysis</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-emerald-950">72%</span>
                  <span className="text-emerald-600">match</span>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-800">5 years React experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-800">TypeScript, Node.js</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-emerald-800">AWS skills: learning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span className="text-emerald-800">No fintech background</span>
                </div>
              </div>
              <div className="mt-6 rounded-lg bg-emerald-50 p-4">
                <div className="text-sm font-medium text-emerald-800">Recommendation</div>
                <p className="mt-1 text-sm text-emerald-700">
                  Apply, but get AWS basics. Highlight your TypeScript depth in cover letter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
