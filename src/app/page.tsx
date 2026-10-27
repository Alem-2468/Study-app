import Link from "next/link";

const features = [
  {
    emoji: "📅",
    title: "Smart Schedule",
    desc: "AI analyzes your exams and deadlines to build a day-by-day study plan.",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    emoji: "🧠",
    title: "AI Study Tools",
    desc: "Generate quizzes, get explanations, and summarize chapters in seconds.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    emoji: "📊",
    title: "Track Progress",
    desc: "Weekly calendar view. Mark sessions done. Watch your streak grow.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    emoji: "🔔",
    title: "Stay on Track",
    desc: "Color-coded deadlines so you always know what&apos;s urgent.",
    gradient: "from-orange-500 to-rose-500",
  },
];

const steps = [
  { emoji: "📚", title: "Add your courses", desc: "Enter subjects, teachers, and class times." },
  { emoji: "📝", title: "Log exams & deadlines", desc: "So the AI knows what matters and when." },
  { emoji: "✨", title: "Generate your plan", desc: "One click — get a personalized study schedule." },
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Nav */}
      <nav className="border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-purple-500 to-cyan-500">S</div>
            <span className="text-lg font-bold tracking-tight">StudyPlanner</span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all hover:shadow-lg hover:shadow-purple-500/25"
          >
            Open Planner
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--hero-from)" }} />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: "var(--hero-to)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl" style={{ background: "linear-gradient(135deg, var(--hero-from), var(--hero-to))" }} />
        </div>

        <div className="relative py-24 px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-100 to-cyan-100 dark:from-purple-900/40 dark:to-cyan-900/40" style={{ color: "var(--accent-fg)" }}>
              <span className="text-base">✨</span>
              Powered by AI
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Build a study schedule
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-violet-500 to-cyan-500 bg-clip-text text-transparent animate-gradient">
                that actually works
              </span>
            </h1>
            <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "var(--muted-fg)" }}>
              Add your exams and deadlines, and AI generates a personalized day-by-day study plan. Quiz yourself, get explanations, and summarize notes — all in one place.
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.97]"
              >
                Get started — it&apos;s free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
            <p className="text-xs pt-2" style={{ color: "var(--muted-fg)" }}>
              Free &middot; Local &middot; Your data never leaves your computer
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6" style={{ background: "var(--muted)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest uppercase mb-3 bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything you need to study smarter</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl p-6 border transition-all hover:shadow-lg hover:-translate-y-1 group"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br ${f.gradient} shadow-lg`}>
                  {f.emoji}
                </div>
                <h3 className="font-bold text-lg mb-1.5">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-fg)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest uppercase mb-3 bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Three steps to your study plan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 bg-gradient-to-br from-purple-100 to-cyan-50 dark:from-purple-900/30 dark:to-cyan-900/30 shadow-md">
                  {s.emoji}
                </div>
                <div className="text-xs font-bold mb-2 px-2.5 py-0.5 rounded-full inline-block" style={{ background: "var(--accent-light)", color: "var(--accent-fg)" }}>Step {i + 1}</div>
                <h3 className="font-bold text-lg mb-1.5">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-fg)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-[0.06]" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "var(--hero-from)" }} />
        </div>
        <div className="relative max-w-xl mx-auto text-center space-y-5">
          <div className="text-4xl mb-2">🚀</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Ready to ace your exams?</h2>
          <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
            100% free, runs locally, no sign-up needed. Your data stays on your computer.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.97]"
          >
            Open StudyPlanner
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6" style={{ borderColor: "var(--card-border)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs" style={{ color: "var(--muted-fg)" }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white font-bold text-[9px] bg-gradient-to-br from-purple-500 to-cyan-500">S</div>
            <span>StudyPlanner</span>
          </div>
          <span>Runs locally on your machine</span>
        </div>
      </footer>
    </div>
  );
}
