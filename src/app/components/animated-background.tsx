export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-float rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute right-1/4 top-1/3 h-80 w-80 animate-float-delayed rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/3 h-72 w-72 animate-pulse-glow rounded-full bg-purple-500/10 blur-3xl" />

      <div className="absolute right-20 top-32 h-2 w-2 animate-float rounded-full bg-cyan-400/60" />
      <div className="absolute left-32 top-1/2 h-1.5 w-1.5 animate-float-delayed rounded-full bg-blue-400/60" />
      <div className="absolute right-1/3 bottom-1/3 h-2 w-2 animate-float rounded-full bg-purple-400/60" />
      <div className="absolute left-1/4 top-1/3 h-1 w-1 animate-float-delayed rounded-full bg-pink-400/60" />

      <div className="absolute right-1/4 top-1/4 flex h-32 w-32 rotate-45 animate-float items-center justify-center border border-cyan-400/10">
        <div className="h-16 w-16 rotate-12 border border-cyan-400/20" />
      </div>
      <div className="absolute left-1/4 bottom-1/3 flex h-24 w-24 animate-float-delayed items-center justify-center border border-purple-400/10">
        <div className="h-12 w-12 -rotate-12 border border-purple-400/20" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      <div className="absolute left-0 top-0 h-full w-1/4 bg-gradient-to-r from-slate-950 via-transparent to-transparent" />
      <div className="absolute right-0 top-0 h-full w-1/4 bg-gradient-to-l from-slate-950 via-transparent to-transparent" />
    </div>
  );
}
