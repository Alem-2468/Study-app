"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Course { id: string; name: string; color: string; teacher_name?: string; schedule?: string }
interface Assignment { id: string; course_id: string; title: string; description?: string; type: string; due_date?: string; due_time?: string; status: string; priority: string; course_name: string; course_color: string }
interface Exam { id: string; course_id: string; title: string; date: string; time?: string; topics?: string; difficulty: string; status: string; course_name: string; course_color: string }
interface Session { id: string; course_id?: string; title: string; date: string; start_time?: string; duration_minutes: number; type: string; completed: number; course_name?: string; course_color?: string }

type Tab = "overview" | "courses" | "assignments" | "exams" | "schedule" | "ai";

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { key: "courses", label: "Courses", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { key: "assignments", label: "Assignments", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" },
  { key: "exams", label: "Exams", icon: "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" },
  { key: "schedule", label: "Schedule", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
  { key: "ai", label: "AI Chat", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" },
];

function Icon({ d, className = "w-5 h-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Badge({ children, color = "default" }: { children: React.ReactNode; color?: "default" | "success" | "warning" | "danger" | "accent" }) {
  const colors = {
    default: { background: "var(--badge-bg)", color: "var(--muted-fg)" },
    success: { background: "var(--success-light)", color: "var(--success)" },
    warning: { background: "var(--warning-light)", color: "var(--warning)" },
    danger: { background: "var(--danger-light)", color: "var(--danger)" },
    accent: { background: "var(--accent-light)", color: "var(--accent-fg)" },
  };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={colors[color]}>
      {children}
    </span>
  );
}

function EmptyState({ emoji, title, desc, action }: { emoji: string; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
      <div className="text-5xl mb-4 animate-float">{emoji}</div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm mb-5 max-w-sm" style={{ color: "var(--muted-fg)" }}>{desc}</p>
      {action}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border p-5 transition-all ${className}`}
      style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, className = "", size = "md" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean; className?: string; size?: "sm" | "md"
}) {
  const base = `inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-5 py-2.5"} ${className}`;
  if (variant === "primary") {
    return <button onClick={onClick} disabled={disabled} className={`${base} text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25`}>{children}</button>;
  }
  const styles: Record<string, React.CSSProperties> = {
    secondary: { background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--card-border)" },
    ghost: { background: "transparent", color: "var(--muted-fg)" },
    danger: { background: "transparent", color: "var(--danger)" },
  };
  return <button onClick={onClick} disabled={disabled} className={base} style={styles[variant]}>{children}</button>;
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2 ${props.className ?? ""}`}
      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", ...props.style, "--tw-ring-color": "var(--accent)" } as React.CSSProperties} />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2 ${props.className ?? ""}`}
      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", ...props.style, "--tw-ring-color": "var(--accent)" } as React.CSSProperties}>
      {children}
    </select>
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none transition-all focus:ring-2 ${props.className ?? ""}`}
      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", ...props.style, "--tw-ring-color": "var(--accent)" } as React.CSSProperties} />
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [aiTab, setAiTab] = useState<"quiz" | "explain" | "summarize">("quiz");
  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id?: number; role: string; content: string; actions_taken?: string; created_at?: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"chat" | "quiz" | "explain" | "summarize">("chat");
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [today, setToday] = useState("");
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [schedStyle, setSchedStyle] = useState<"balanced" | "intensive" | "spaced" | "deadline">("deadline");
  const [schedHours, setSchedHours] = useState("3");
  const [schedLoading, setSchedLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const load = useCallback(async () => {
    const [c, a, e, s] = await Promise.all([
      fetch("/api/courses").then(r => r.json()),
      fetch("/api/assignments").then(r => r.json()),
      fetch("/api/exams").then(r => r.json()),
      fetch("/api/schedule").then(r => r.json()),
    ]);
    setCourses(c); setAssignments(a); setExams(e); setSessions(s);
  }, []);

  useEffect(() => {
    const now = new Date();
    setToday(now.toISOString().split("T")[0]);
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    setWeekDays(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d.toISOString().split("T")[0];
    }));
    load();
    fetch("/api/profile").then(r => r.json()).then(p => setHasProfile(!!p));
    fetch("/api/chat").then(r => r.json()).then(msgs => { if (Array.isArray(msgs)) setChatMessages(msgs); });
  }, [load]);

  function daysUntil(d: string) {
    return Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86400000);
  }
  function urgencyColor(d?: string): "default" | "success" | "warning" | "danger" {
    if (!d) return "default";
    const n = daysUntil(d);
    if (n < 0) return "danger";
    if (n <= 1) return "danger";
    if (n <= 3) return "warning";
    return "success";
  }
  function dueLabel(d: string) {
    const n = daysUntil(d);
    if (n < 0) return "overdue";
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    return `${n}d left`;
  }
  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  async function addCourse() {
    if (!formData.name?.trim()) return;
    await fetch("/api/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
    setFormData({}); setShowForm(false); load();
  }
  async function deleteCourse(id: string) {
    await fetch(`/api/courses?id=${id}`, { method: "DELETE" }); load();
  }
  async function addAssignment() {
    if (!formData.title?.trim() || !formData.course_id) return;
    await fetch("/api/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
    setFormData({}); setShowForm(false); load();
  }
  async function toggleAssignment(id: string, status: string) {
    await fetch("/api/assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: status === "done" ? "pending" : "done" }) });
    load();
  }
  async function deleteAssignment(id: string) {
    await fetch(`/api/assignments?id=${id}`, { method: "DELETE" }); load();
  }
  async function addExam() {
    if (!formData.title?.trim() || !formData.course_id || !formData.date) return;
    await fetch("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
    setFormData({}); setShowForm(false); load();
  }
  async function deleteExam(id: string) {
    await fetch(`/api/exams?id=${id}`, { method: "DELETE" }); load();
  }
  async function toggleSession(id: string, completed: number) {
    await fetch("/api/schedule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, completed: !completed }) });
    load();
  }

  async function generateSchedule() {
    setSchedLoading(true);
    try {
      const startDate = today || new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          input: {
            exams: exams.filter(e => daysUntil(e.date) >= 0).map(e => ({ title: e.title, date: e.date, course: e.course_name, topics: e.topics, difficulty: e.difficulty })),
            assignments: assignments.filter(a => a.due_date && daysUntil(a.due_date) >= 0 && a.status !== "done").map(a => ({ title: a.title, dueDate: a.due_date!, course: a.course_name })),
            hoursPerDay: parseInt(schedHours),
            style: schedStyle,
            startDate,
          },
        }),
      });
      const data = await res.json();
      if (data.blocks?.length) {
        await fetch("/api/schedule?all=true", { method: "DELETE" });
        const mapped = data.blocks.map((b: Record<string, unknown>) => {
          const course = courses.find(c => c.name === b.course);
          return { ...b, course_id: course?.id ?? null };
        });
        await fetch("/api/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mapped) });
        load();
      }
    } catch (e) { console.error(e); }
    finally { setSchedLoading(false); }
  }

  async function handleAi() {
    if (!aiInput.trim()) return;
    setAiLoading(true); setAiResult("");
    try {
      const body: Record<string, string> = { action: aiTab };
      if (aiTab === "quiz" || aiTab === "summarize") body.content = aiInput;
      if (aiTab === "explain") body.topic = aiInput;
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      setAiResult(data.result ?? data.error ?? "No response");
    } catch { setAiResult("Failed to get AI response"); }
    finally { setAiLoading(false); }
  }

  async function handleChat(e?: React.FormEvent) {
    e?.preventDefault();
    const text = chatMode === "chat" ? chatInput : aiInput;
    if (!text.trim()) return;
    const userMsg = chatMode === "chat" ? text : `[${chatMode.toUpperCase()}] ${text}`;
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    if (chatMode === "chat") setChatInput(""); else setAiInput("");
    setChatLoading(true);
    try {
      if (chatMode === "chat") {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg }) });
        const data = await res.json();
        if (data.reply) {
          setChatMessages(prev => [...prev, { role: "assistant", content: data.reply, actions_taken: data.actions?.length ? JSON.stringify(data.actions) : undefined }]);
          if (data.actions?.length) load();
        }
      } else {
        const body: Record<string, string> = { action: chatMode };
        if (chatMode === "quiz" || chatMode === "summarize") body.content = text;
        if (chatMode === "explain") body.topic = text;
        const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        const result = data.result ?? data.error ?? "No response";
        setChatMessages(prev => [...prev, { role: "assistant", content: result }]);
      }
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Failed to get response. Check if OmniRoute is running." }]); }
    finally { setChatLoading(false); setChatMode("chat"); }
  }

  const chatEndRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    if (hasProfile === false) router.push("/onboarding");
  }, [hasProfile, router]);

  if (!today || hasProfile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex items-center gap-3" style={{ color: "var(--muted-fg)" }}>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  const upcomingExams = exams.filter(e => daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const upcomingAssignments = assignments.filter(a => a.due_date && daysUntil(a.due_date) >= 0 && a.status !== "done").sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")).slice(0, 5);
  const todaySessions = sessions.filter(s => s.date === today);
  const completedToday = todaySessions.filter(s => s.completed).length;
  const totalToday = todaySessions.length;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-56" : "w-16"} flex-shrink-0 border-r flex flex-col transition-all duration-200`}
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}>
        <div className="h-16 flex items-center px-4 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          {sidebarOpen ? (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-purple-500 to-cyan-500">S</div>
              <span className="text-sm font-bold tracking-tight">StudyPlanner</span>
            </Link>
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs mx-auto bg-gradient-to-br from-purple-500 to-cyan-500">S</div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(n => (
            <button key={n.key} onClick={() => { setTab(n.key); setShowForm(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                tab === n.key ? "font-medium" : ""
              }`}
              style={tab === n.key
                ? { background: "var(--accent-light)", color: "var(--accent-fg)" }
                : { color: "var(--muted-fg)" }
              }>
              <Icon d={n.icon} className="w-[18px] h-[18px] flex-shrink-0" />
              {sidebarOpen && <span>{n.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
            style={{ color: "var(--muted-fg)" }}>
            <Icon d={sidebarOpen ? "M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" : "M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"} className="w-4 h-4" />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b flex-shrink-0"
          style={{ borderColor: "var(--card-border)" }}>
          <div>
            <h1 className="text-lg font-semibold">{NAV.find(n => n.key === tab)?.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
              {new Date(today + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  { label: "Courses", value: courses.length, emoji: "📚", gradient: "from-purple-500 to-indigo-500" },
                  { label: "Pending", value: assignments.filter(a => a.status !== "done").length, emoji: "📝", gradient: "from-amber-500 to-orange-500" },
                  { label: "Upcoming Exams", value: upcomingExams.length, emoji: "🎯", gradient: "from-rose-500 to-pink-500" },
                  { label: "Today", value: `${completedToday}/${totalToday}`, emoji: "✅", gradient: "from-emerald-500 to-teal-500" },
                ].map((s, i) => (
                  <div key={s.label} className={`rounded-2xl p-5 animate-fadeIn stagger-${i + 1} border transition-all hover:shadow-md hover:-translate-y-0.5`}
                    style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-fg)" }}>{s.label}</span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br ${s.gradient} shadow-md`}>
                        {s.emoji}
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Sessions */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Today&apos;s Sessions</h3>
                    {totalToday > 0 && (
                      <span className="text-xs" style={{ color: "var(--muted-fg)" }}>{completedToday}/{totalToday} done</span>
                    )}
                  </div>
                  {todaySessions.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs" style={{ color: "var(--muted-fg)" }}>No sessions today</p>
                      <Btn variant="ghost" size="sm" onClick={() => setTab("schedule")} className="mt-2">Generate schedule</Btn>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todaySessions.map(s => (
                        <button key={s.id} onClick={() => toggleSession(s.id, s.completed)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                          style={{ background: s.completed ? "var(--muted)" : "var(--input-bg)" }}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            s.completed ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                            {s.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${s.completed ? "line-through opacity-50" : "font-medium"}`}>{s.title}</div>
                            <div className="text-[11px]" style={{ color: "var(--muted-fg)" }}>{s.start_time} &middot; {s.duration_minutes}min</div>
                          </div>
                          {s.course_color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.course_color }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Upcoming Exams */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Upcoming Exams</h3>
                    <Btn variant="ghost" size="sm" onClick={() => setTab("exams")}>View all</Btn>
                  </div>
                  {upcomingExams.length === 0 ? (
                    <p className="text-center text-xs py-6" style={{ color: "var(--muted-fg)" }}>No upcoming exams</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingExams.map(e => (
                        <div key={e.id} className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: e.course_color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{e.title}</div>
                            <div className="text-[11px]" style={{ color: "var(--muted-fg)" }}>{e.course_name}</div>
                          </div>
                          <Badge color={urgencyColor(e.date)}>{dueLabel(e.date)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Pending Assignments */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Pending Work</h3>
                    <Btn variant="ghost" size="sm" onClick={() => setTab("assignments")}>View all</Btn>
                  </div>
                  {upcomingAssignments.length === 0 ? (
                    <p className="text-center text-xs py-6" style={{ color: "var(--muted-fg)" }}>All caught up!</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAssignments.map(a => (
                        <div key={a.id} className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: a.course_color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{a.title}</div>
                            <div className="text-[11px]" style={{ color: "var(--muted-fg)" }}>{a.course_name} &middot; {a.type}</div>
                          </div>
                          {a.due_date && <Badge color={urgencyColor(a.due_date)}>{dueLabel(a.due_date)}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* COURSES */}
          {tab === "courses" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "var(--muted-fg)" }}>{courses.length} course{courses.length !== 1 ? "s" : ""} registered</p>
                <Btn onClick={() => { setShowForm(!showForm); setFormData({ color: "#7c3aed" }); }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Course
                </Btn>
              </div>

              {showForm && (
                <Card className="animate-slideDown">
                  <h3 className="font-semibold text-sm mb-4">New Course</h3>
                  <div className="space-y-3">
                    <Input placeholder="Course name *" value={formData.name ?? ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                    <Input placeholder="Teacher name" value={formData.teacher_name ?? ""} onChange={e => setFormData(p => ({ ...p, teacher_name: e.target.value }))} />
                    <Input placeholder="Schedule (e.g. Mon/Wed 10:00-11:30)" value={formData.schedule ?? ""} onChange={e => setFormData(p => ({ ...p, schedule: e.target.value }))} />
                    <div className="flex items-center gap-3">
                      <label className="text-xs" style={{ color: "var(--muted-fg)" }}>Color</label>
                      <input type="color" value={formData.color ?? "#7c3aed"} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Btn onClick={addCourse}>Save Course</Btn>
                      <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
                    </div>
                  </div>
                </Card>
              )}

              {courses.length === 0 && !showForm ? (
                <EmptyState
                  emoji="📚"
                  title="No courses yet"
                  desc="Add your courses to start tracking assignments and exams."
                  action={<Btn onClick={() => { setShowForm(true); setFormData({ color: "#7c3aed" }); }}>Add your first course</Btn>}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((c, i) => (
                    <Card key={c.id} className={`group animate-fadeIn stagger-${Math.min(i + 1, 4)} hover:shadow-md`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="font-semibold">{c.name}</span>
                        </div>
                        <Btn variant="danger" size="sm" onClick={() => deleteCourse(c.id)} className="opacity-0 group-hover:opacity-100">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </Btn>
                      </div>
                      {c.teacher_name && (
                        <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--muted-fg)" }}>
                          <Icon d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" className="w-3.5 h-3.5" />
                          {c.teacher_name}
                        </div>
                      )}
                      {c.schedule && (
                        <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "var(--muted-fg)" }}>
                          <Icon d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3.5 h-3.5" />
                          {c.schedule}
                        </div>
                      )}
                      <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
                        <span className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
                          {assignments.filter(a => a.course_id === c.id).length} assignments
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
                          {exams.filter(e => e.course_id === c.id).length} exams
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ASSIGNMENTS */}
          {tab === "assignments" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
                  {assignments.filter(a => a.status === "done").length}/{assignments.length} completed
                </p>
                <Btn onClick={() => { setShowForm(!showForm); setFormData({ type: "homework", priority: "medium" }); }} disabled={courses.length === 0}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Assignment
                </Btn>
              </div>

              {courses.length === 0 && <Card><p className="text-sm text-center py-4" style={{ color: "var(--muted-fg)" }}>Add courses first before creating assignments.</p></Card>}

              {showForm && courses.length > 0 && (
                <Card className="animate-slideDown">
                  <h3 className="font-semibold text-sm mb-4">New Assignment</h3>
                  <div className="space-y-3">
                    <Select value={formData.course_id ?? ""} onChange={e => setFormData(p => ({ ...p, course_id: e.target.value }))}>
                      <option value="">Select course *</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Input placeholder="Assignment title *" value={formData.title ?? ""} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
                    <Textarea placeholder="Description (optional)" value={formData.description ?? ""} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
                    <div className="grid grid-cols-3 gap-3">
                      <Select value={formData.type ?? "homework"} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                        <option value="homework">Homework</option>
                        <option value="project">Project</option>
                        <option value="essay">Essay</option>
                        <option value="presentation">Presentation</option>
                        <option value="lab">Lab</option>
                      </Select>
                      <Input type="date" value={formData.due_date ?? ""} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} />
                      <Select value={formData.priority ?? "medium"} onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}>
                        <option value="low">Low priority</option>
                        <option value="medium">Medium</option>
                        <option value="high">High priority</option>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Btn onClick={addAssignment}>Save Assignment</Btn>
                      <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
                    </div>
                  </div>
                </Card>
              )}

              {assignments.length === 0 && !showForm ? (
                <EmptyState
                  emoji="📝"
                  title="No assignments yet"
                  desc="Track your homework, projects, and essays all in one place."
                  action={courses.length > 0 ? <Btn onClick={() => { setShowForm(true); setFormData({ type: "homework", priority: "medium" }); }}>Add your first assignment</Btn> : undefined}
                />
              ) : (
                <div className="space-y-2">
                  {assignments.map(a => (
                    <Card key={a.id} className="group !p-4 hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleAssignment(a.id, a.status)}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                            a.status === "done" ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400"}`}>
                          {a.status === "done" && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                        </button>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.course_color }} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${a.status === "done" ? "line-through opacity-50" : "font-medium"}`}>{a.title}</div>
                          <div className="text-[11px] flex items-center gap-1.5 mt-0.5" style={{ color: "var(--muted-fg)" }}>
                            {a.course_name}
                            <span>&middot;</span>
                            <Badge>{a.type}</Badge>
                            {a.priority === "high" && <Badge color="danger">high</Badge>}
                          </div>
                        </div>
                        {a.due_date && <Badge color={urgencyColor(a.due_date)}>{formatDate(a.due_date)} &middot; {dueLabel(a.due_date)}</Badge>}
                        <Btn variant="danger" size="sm" onClick={() => deleteAssignment(a.id)} className="opacity-0 group-hover:opacity-100">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </Btn>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EXAMS */}
          {tab === "exams" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "var(--muted-fg)" }}>{exams.length} exam{exams.length !== 1 ? "s" : ""} tracked</p>
                <Btn onClick={() => { setShowForm(!showForm); setFormData({ difficulty: "medium" }); }} disabled={courses.length === 0}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Exam
                </Btn>
              </div>

              {courses.length === 0 && <Card><p className="text-sm text-center py-4" style={{ color: "var(--muted-fg)" }}>Add courses first.</p></Card>}

              {showForm && courses.length > 0 && (
                <Card className="animate-slideDown">
                  <h3 className="font-semibold text-sm mb-4">New Exam</h3>
                  <div className="space-y-3">
                    <Select value={formData.course_id ?? ""} onChange={e => setFormData(p => ({ ...p, course_id: e.target.value }))}>
                      <option value="">Select course *</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Input placeholder="Exam title (e.g. Midterm, Unit 3 Test) *" value={formData.title ?? ""} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="date" value={formData.date ?? ""} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
                      <Input type="time" value={formData.time ?? ""} onChange={e => setFormData(p => ({ ...p, time: e.target.value }))} />
                    </div>
                    <Textarea placeholder="Topics to study (optional)" value={formData.topics ?? ""} onChange={e => setFormData(p => ({ ...p, topics: e.target.value }))} rows={3} />
                    <Select value={formData.difficulty ?? "medium"} onChange={e => setFormData(p => ({ ...p, difficulty: e.target.value }))}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </Select>
                    <div className="flex gap-2 pt-1">
                      <Btn onClick={addExam}>Save Exam</Btn>
                      <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
                    </div>
                  </div>
                </Card>
              )}

              {exams.length === 0 && !showForm ? (
                <EmptyState
                  emoji="🎯"
                  title="No exams yet"
                  desc="Add your upcoming exams so the AI can build your study schedule."
                  action={courses.length > 0 ? <Btn onClick={() => { setShowForm(true); setFormData({ difficulty: "medium" }); }}>Add your first exam</Btn> : undefined}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exams.map(e => (
                    <Card key={e.id} className="group hover:shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.course_color }} />
                          <span className="text-xs" style={{ color: "var(--muted-fg)" }}>{e.course_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={urgencyColor(e.date)}>{dueLabel(e.date)}</Badge>
                          <Btn variant="danger" size="sm" onClick={() => deleteExam(e.id)} className="opacity-0 group-hover:opacity-100">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </Btn>
                        </div>
                      </div>
                      <div className="font-semibold mb-1">{e.title}</div>
                      <div className="text-xs" style={{ color: "var(--muted-fg)" }}>
                        {formatDate(e.date)}{e.time ? ` at ${e.time}` : ""}
                      </div>
                      {e.topics && <div className="text-xs mt-2 p-2 rounded-lg" style={{ background: "var(--muted)", color: "var(--muted-fg)" }}>Topics: {e.topics}</div>}
                      <div className="mt-2"><Badge>{e.difficulty}</Badge></div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE */}
          {tab === "schedule" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
               <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🗓️</span>
                    <div>
                      <h3 className="font-bold text-sm">Generate Study Plan</h3>
                      <p className="text-[11px] text-purple-200">AI creates a personalized schedule from your exams and deadlines</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select value={schedStyle} onChange={e => setSchedStyle(e.target.value as typeof schedStyle)} className="!w-auto">
                      <option value="deadline">Deadline Focused</option>
                      <option value="balanced">Balanced</option>
                      <option value="intensive">Intensive</option>
                      <option value="spaced">Spaced Repetition</option>
                    </Select>
                    <Select value={schedHours} onChange={e => setSchedHours(e.target.value)} className="!w-auto">
                      {["1","2","3","4","5","6"].map(h => <option key={h} value={h}>{h}h/day</option>)}
                    </Select>
                    <Btn onClick={generateSchedule} disabled={schedLoading || (exams.length === 0 && assignments.length === 0)}>
                      {schedLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Icon d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" className="w-4 h-4" />
                          Generate Schedule
                        </>
                      )}
                    </Btn>
                  </div>
                </div>
               </div>
              </div>

              {(exams.length === 0 && assignments.length === 0) && (
                <Card className="text-center py-8">
                  <p className="text-sm" style={{ color: "var(--muted-fg)" }}>Add exams or assignments first, then generate a schedule.</p>
                </Card>
              )}

              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((d, i) => {
                  const daySessions = sessions.filter(s => s.date === d);
                  const isToday = d === today;
                  return (
                    <div key={d} className="rounded-2xl border p-3 min-h-[220px]"
                      style={{
                        background: isToday ? "var(--accent-light)" : "var(--card)",
                        borderColor: isToday ? "var(--accent)" : "var(--card-border)",
                      }}>
                      <div className="text-xs font-semibold mb-2.5" style={{ color: isToday ? "var(--accent-fg)" : "var(--muted-fg)" }}>
                        {dayNames[i]}
                        <span className="block text-[11px] font-normal mt-0.5">{d.slice(5)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {daySessions.map(s => (
                          <button key={s.id} onClick={() => toggleSession(s.id, s.completed)}
                            className="w-full text-left p-2 rounded-xl text-[11px] transition-all hover:scale-[1.02]"
                            style={{
                              background: s.completed ? "var(--muted)" : s.type === "break" ? "transparent" : s.type === "review" ? "#fef3c720" : "var(--input-bg)",
                              opacity: s.completed ? 0.5 : 1,
                              border: s.type === "break" ? "1px dashed var(--card-border)" : "none",
                            }}>
                            <div className={`font-medium truncate ${s.completed ? "line-through" : ""}`}>{s.title}</div>
                            <div style={{ color: "var(--muted-fg)" }}>{s.start_time} &middot; {s.duration_minutes}m</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI TOOLS */}
          {tab === "ai" && (
            <div className="max-w-2xl mx-auto flex flex-col animate-fadeIn" style={{ height: "calc(100vh - 100px)" }}>
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1" style={{ minHeight: 0 }}>
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5 bg-gradient-to-br from-purple-500 to-cyan-500 shadow-xl animate-float">✨</div>
                    <h3 className="font-bold text-xl mb-2">AI Study Assistant</h3>
                    <p className="text-sm max-w-sm mb-6" style={{ color: "var(--muted-fg)" }}>
                      Tell me about your studies — exams, assignments, anything. I&apos;ll organize it all for you.
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
                      {[
                        ["I have a Math exam next Friday on integrals", "📝"],
                        ["Quiz me on biology chapter 5", "🧩"],
                        ["Explain quantum entanglement simply", "💡"],
                        ["What do I have due this week?", "📅"],
                      ].map(([text, emoji]) => (
                        <button key={text} onClick={() => { setChatInput(text); }} className="rounded-xl border p-3 text-left text-xs transition-all hover:shadow-md hover:-translate-y-0.5"
                          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                          <span className="mr-1.5">{emoji}</span>{text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={msg.id ?? i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : ""}`}
                      style={msg.role === "assistant" ? { background: "var(--card)", border: "1px solid var(--card-border)" } : {}}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.actions_taken && (() => {
                        try {
                          const actions = JSON.parse(msg.actions_taken) as string[];
                          return actions.length > 0 ? (
                            <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid rgba(124,58,237,0.2)" }}>
                              {actions.map((a, j) => (
                                <div key={j} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--accent-fg)" }}>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                  {a}
                                </div>
                              ))}
                            </div>
                          ) : null;
                        } catch { return null; }
                      })()}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start animate-fadeIn">
                    <div className="rounded-2xl px-4 py-3 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <div className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick actions row */}
              <div className="flex items-center gap-2 py-2">
                {([["chat", "💬", "Chat"], ["quiz", "🧩", "Quiz Me"], ["explain", "💡", "Explain"], ["summarize", "📋", "Summarize"]] as const).map(([key, emoji, label]) => (
                  <button key={key} onClick={() => setChatMode(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${chatMode === key ? "text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md" : "hover:opacity-80"}`}
                    style={chatMode !== key ? { background: "var(--card)", border: "1px solid var(--card-border)" } : {}}>
                    <span>{emoji}</span>{label}
                  </button>
                ))}
                {chatMessages.length > 0 && (
                  <button onClick={async () => { await fetch("/api/chat", { method: "DELETE" }); setChatMessages([]); }}
                    className="ml-auto text-[11px] px-2.5 py-1.5 rounded-full transition-all hover:opacity-80"
                    style={{ color: "var(--muted-fg)", background: "var(--card)", border: "1px solid var(--card-border)" }}>
                    Clear chat
                  </button>
                )}
              </div>

              {/* Input area */}
              {chatMode !== "chat" && (
                <div className="mb-2 rounded-xl p-3 text-xs" style={{ background: "var(--accent-light)", color: "var(--accent-fg)" }}>
                  {chatMode === "quiz" ? "🧩 Paste your notes below and I'll generate quiz questions" :
                   chatMode === "explain" ? "💡 Type a topic and I'll explain it simply" :
                   "📋 Paste material below and I'll summarize the key points"}
                </div>
              )}
              <form onSubmit={handleChat} className="flex gap-2 items-end pb-2">
                {chatMode === "chat" ? (
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    placeholder="Tell me about your studies, ask questions, or manage your planner..."
                    disabled={chatLoading}
                    className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties} />
                ) : (
                  <textarea value={aiInput} onChange={e => setAiInput(e.target.value)}
                    placeholder={chatMode === "quiz" ? "Paste your notes here..." : chatMode === "explain" ? "What topic?" : "Paste material..."}
                    disabled={chatLoading} rows={3}
                    className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 resize-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties} />
                )}
                <button type="submit" disabled={chatLoading || !(chatMode === "chat" ? chatInput.trim() : aiInput.trim())}
                  className="h-11 w-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                  {chatLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
