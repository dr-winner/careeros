export default function WhyItMatters() {
  const stats = [
    { value: "73%", label: "of job applications don't get a response" },
    { value: "4.3", label: "applications per successful hire" },
    { value: "65%", label: "of applicants are unqualified for applied roles" },
  ];

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-950" />
      
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)`,
        backgroundSize: '50px 50px'
      }} />
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />
      
      <div className="relative mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8">
          <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-sm font-medium text-amber-300">The reality check</span>
        </div>

        <h2 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl leading-tight">
          The job market in Africa is tough.
          <br />
          <span className="text-gradient-warm">We want to change that.</span>
        </h2>
        
        <p className="mx-auto mt-8 max-w-2xl text-xl text-slate-400 leading-relaxed">
          Too many qualified people are applying to the wrong jobs, getting
          rejected, and losing confidence. CareerOS gives you the clarity to
          focus your energy where it counts.
        </p>

        <div className="mt-20 grid gap-8 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative p-8 rounded-2xl glass-card">
                <div className="text-5xl md:text-6xl font-bold text-gradient-warm mb-4">
                  {stat.value}
                </div>
                <div className="text-slate-400 leading-relaxed">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 p-8 rounded-2xl glass border border-emerald-500/20">
          <div className="flex items-start gap-6 text-left">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Why CareerOS exists</h3>
              <p className="text-slate-400 leading-relaxed">
                We believe every qualified African professional deserves a fair shot. 
                No more shotgun applications. No more rejection after rejection. 
                Just clarity, confidence, and a clear path forward.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
