export default function WhyItMatters() {
  return (
    <section className="bg-emerald-900 py-24 px-6">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          The job market in Africa is tough.
          <br />
          <span className="text-amber-400">We want to change that.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-200/80">
          Too many qualified people are applying to the wrong jobs, getting
          rejected, and losing confidence. CareerOS gives you the clarity to
          focus your energy where it counts.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="text-4xl font-bold text-amber-400">73%</div>
            <div className="mt-2 text-sm text-emerald-200/70">
              of job applications don&apos;t get a response
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-amber-400">4.3</div>
            <div className="mt-2 text-sm text-emerald-200/70">
              applications per successful hire
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-amber-400">65%</div>
            <div className="mt-2 text-sm text-emerald-200/70">
              of applicants are unqualified for applied roles
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
