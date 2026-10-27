"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { title: "What's your name?", field: "name", placeholder: "Your name", type: "text", emoji: "👋", required: true },
  { title: "What grade or level are you in?", field: "grade_level", placeholder: "e.g. 10th grade, College sophomore, Master's", type: "text", emoji: "🎓" },
  { title: "What school do you go to?", field: "school", placeholder: "School or university name", type: "text", emoji: "🏫" },
  { title: "What are your study goals?", field: "study_goals", placeholder: "e.g. Pass all exams, Get into med school, Learn to code", type: "textarea", emoji: "🎯" },
  { title: "What subjects are you strongest in?", field: "strong_subjects", placeholder: "e.g. Math, History, Art", type: "text", emoji: "💪" },
  { title: "What subjects do you find hardest?", field: "weak_subjects", placeholder: "e.g. Chemistry, Physics, Literature", type: "text", emoji: "🧗" },
  { title: "How do you prefer to study?", field: "preferred_style", placeholder: "", type: "select", emoji: "📖", options: [
    { value: "balanced", label: "Balanced — mix of everything" },
    { value: "intensive", label: "Intensive — long focused sessions" },
    { value: "spaced", label: "Spaced — short sessions spread out" },
    { value: "visual", label: "Visual — diagrams, videos, mind maps" },
    { value: "active", label: "Active — practice problems & quizzes" },
  ]},
  { title: "How many hours a day can you study?", field: "daily_hours", placeholder: "", type: "select", emoji: "⏰", options: [
    { value: "0.5-1", label: "Less than 1 hour" },
    { value: "1-2", label: "1–2 hours" },
    { value: "2-3", label: "2–3 hours" },
    { value: "3-5", label: "3–5 hours" },
    { value: "5+", label: "5+ hours" },
  ]},
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string>>({
    preferred_style: "balanced",
    daily_hours: "2-3",
  });
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canNext = current.required ? !!data[current.field]?.trim() : true;
  const progress = ((step + 1) / STEPS.length) * 100;

  async function finish() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.push("/dashboard");
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Progress bar */}
      <div className="h-1.5 w-full" style={{ background: "var(--card-border)" }}>
        <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-purple-500 to-cyan-500">S</div>
          <span className="text-lg font-bold tracking-tight">StudyPlanner</span>
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--muted-fg)" }}>Step {step + 1} of {STEPS.length}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8 animate-fadeIn" key={step}>
          {/* Emoji */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl text-4xl mb-5 bg-gradient-to-br from-purple-100 to-cyan-50 dark:from-purple-900/30 dark:to-cyan-900/30 shadow-lg animate-float">
              {current.emoji}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mb-1">{current.title}</h1>
            {step === 0 && (
              <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
                Let&apos;s set up your study assistant. This takes about 30 seconds.
              </p>
            )}
          </div>

          {/* Input */}
          <div>
            {current.type === "text" && (
              <input
                type="text"
                value={data[current.field] ?? ""}
                onChange={e => setData({ ...data, [current.field]: e.target.value })}
                placeholder={current.placeholder}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && canNext) { isLast ? finish() : setStep(step + 1); } }}
                className="w-full rounded-2xl px-5 py-4 text-base outline-none transition-all focus:ring-2"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />
            )}
            {current.type === "textarea" && (
              <textarea
                value={data[current.field] ?? ""}
                onChange={e => setData({ ...data, [current.field]: e.target.value })}
                placeholder={current.placeholder}
                autoFocus
                rows={3}
                className="w-full rounded-2xl px-5 py-4 text-base outline-none transition-all focus:ring-2 resize-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />
            )}
            {current.type === "select" && current.options && (
              <div className="space-y-2">
                {current.options.map(opt => (
                  <button key={opt.value} onClick={() => setData({ ...data, [current.field]: opt.value })}
                    className={`w-full rounded-xl px-5 py-3.5 text-sm text-left transition-all ${data[current.field] === opt.value ? "ring-2 ring-purple-500 font-semibold" : "hover:shadow-md"}`}
                    style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                Back
              </button>
            )}
            <button
              onClick={() => { isLast ? finish() : setStep(step + 1); }}
              disabled={!canNext || saving}
              className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? "Setting up..." : isLast ? "Let's go! 🚀" : "Continue"}
            </button>
          </div>

          {/* Skip hint */}
          {!current.required && (
            <p className="text-center text-[11px]" style={{ color: "var(--muted-fg)" }}>
              Press Continue to skip if you&apos;re not sure yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
