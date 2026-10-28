import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getAiClient } from "@/lib/ai";
import crypto from "crypto";

interface ProfileRow { name: string; grade_level?: string; school?: string; study_goals?: string; strong_subjects?: string; weak_subjects?: string; preferred_style?: string; daily_hours?: string; notes?: string }
interface CourseRow { id: string; name: string; color: string; teacher_name?: string }
interface AssignmentRow { id: string; title: string; course_id: string; type: string; due_date?: string; status: string; priority: string; course_name?: string }
interface ExamRow { id: string; title: string; course_id: string; date: string; time?: string; topics?: string; difficulty: string; course_name?: string }

async function getContext() {
  const db = getDb();
  await initDb();
  const profileRes = await db.execute("SELECT * FROM student_profile WHERE id = 1");
  const profile = profileRes.rows[0] as unknown as ProfileRow | undefined;
  const coursesRes = await db.execute("SELECT * FROM courses");
  const courses = coursesRes.rows as unknown as CourseRow[];
  const assignmentsRes = await db.execute(`
    SELECT a.*, c.name as course_name FROM assignments a
    LEFT JOIN courses c ON a.course_id = c.id
    ORDER BY a.due_date ASC
  `);
  const assignments = assignmentsRes.rows as unknown as AssignmentRow[];
  const examsRes = await db.execute(`
    SELECT e.*, c.name as course_name FROM exams e
    LEFT JOIN courses c ON e.course_id = c.id
    ORDER BY e.date ASC
  `);
  const exams = examsRes.rows as unknown as ExamRow[];
  const notesRes = await db.execute("SELECT context_notes FROM ai_settings WHERE id = 1");
  const handoffNotes = (notesRes.rows[0] as unknown as { context_notes: string | null } | undefined)?.context_notes ?? null;
  return { profile, courses, assignments, exams, handoffNotes };
}

function buildSystemPrompt(ctx: Awaited<ReturnType<typeof getContext>>) {
  const today = new Date().toISOString().split("T")[0];
  const { profile, courses, assignments, exams, handoffNotes } = ctx;

  let prompt = `You are a friendly, smart study assistant for a student. Today is ${today}.

`;

  if (profile) {
    prompt += `## Student Profile
- Name: ${profile.name}
${profile.grade_level ? `- Grade/Level: ${profile.grade_level}` : ""}
${profile.school ? `- School: ${profile.school}` : ""}
${profile.study_goals ? `- Goals: ${profile.study_goals}` : ""}
${profile.strong_subjects ? `- Strong subjects: ${profile.strong_subjects}` : ""}
${profile.weak_subjects ? `- Weak/hard subjects: ${profile.weak_subjects}` : ""}
${profile.preferred_style ? `- Preferred study style: ${profile.preferred_style}` : ""}
${profile.daily_hours ? `- Available study hours: ${profile.daily_hours}h/day` : ""}
${profile.notes ? `- Notes: ${profile.notes}` : ""}

`;
  }

  if (courses.length > 0) {
    prompt += `## Current Courses\n`;
    courses.forEach(c => { prompt += `- ${c.name} (id: ${c.id})${c.teacher_name ? `, teacher: ${c.teacher_name}` : ""}\n`; });
    prompt += "\n";
  }

  if (assignments.length > 0) {
    prompt += `## Assignments\n`;
    assignments.forEach(a => { prompt += `- "${a.title}" for ${a.course_name ?? "unknown"} (${a.status}, ${a.type}${a.due_date ? `, due: ${a.due_date}` : ""}, id: ${a.id})\n`; });
    prompt += "\n";
  }

  if (exams.length > 0) {
    prompt += `## Exams\n`;
    exams.forEach(e => { prompt += `- "${e.title}" for ${e.course_name ?? "unknown"} on ${e.date}${e.topics ? `, topics: ${e.topics}` : ""} (${e.difficulty}, id: ${e.id})\n`; });
    prompt += "\n";
  }

  if (handoffNotes) {
    prompt += `## Notes from Previous AI Tutor
The student previously used a different AI model. Here's what the previous tutor learned about them — use this to continue seamlessly:
${handoffNotes}

`;
  }

  prompt += `## Your Capabilities
When the student tells you about exams, assignments, courses, or deadlines, you MUST create them by including ACTION blocks in your response. You can also delete items when asked.

To perform actions, include one or more JSON blocks wrapped in <action> tags in your response. The student will see a notification of what you did.

Available actions:
1. Create a course: <action>{"type":"create_course","name":"...","color":"#hex","teacher_name":"..."}</action>
2. Create an exam: <action>{"type":"create_exam","course":"course name","title":"...","date":"YYYY-MM-DD","time":"HH:MM","topics":"...","difficulty":"easy|medium|hard"}</action>
3. Create an assignment: <action>{"type":"create_assignment","course":"course name","title":"...","type":"homework|project|essay|presentation|lab","due_date":"YYYY-MM-DD","priority":"low|medium|high","description":"..."}</action>
4. Delete a course: <action>{"type":"delete_course","id":"..."}</action>
5. Delete an exam: <action>{"type":"delete_exam","id":"..."}</action>
6. Delete an assignment: <action>{"type":"delete_assignment","id":"..."}</action>
7. Mark assignment done: <action>{"type":"complete_assignment","id":"..."}</action>

IMPORTANT RULES:
- If the student mentions a course that doesn't exist yet, create it first, then create the exam/assignment for it.
- Pick appropriate colors for new courses (use varied hex colors like #7c3aed, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899, #3b82f6).
- Always be conversational and friendly. Use the student's name.
- After creating things, confirm what you did in plain language.
- Ask follow-up questions to help them study better: "Do you want me to generate a study schedule?" or "Want me to quiz you on those topics?"
- If something is ambiguous (like a date), ask for clarification.
- You can also quiz, explain topics, and summarize — just respond naturally.
- Keep responses concise but helpful.
- Speak naturally like a friend who's also a tutor.`;

  return prompt;
}

async function executeActions(actionsJson: string[]): Promise<string[]> {
  const db = getDb();
  const results: string[] = [];

  for (const json of actionsJson) {
    try {
      const action = JSON.parse(json);
      switch (action.type) {
        case "create_course": {
          const id = crypto.randomUUID();
          await db.execute({ sql: "INSERT INTO courses (id, name, color, teacher_name) VALUES (?, ?, ?, ?)", args: [id, action.name, action.color ?? "#7c3aed", action.teacher_name ?? null] });
          results.push(`Created course "${action.name}"`);
          break;
        }
        case "create_exam": {
          const courseRes = await db.execute({ sql: "SELECT id FROM courses WHERE name = ? COLLATE NOCASE", args: [action.course] });
          const course = courseRes.rows[0] as unknown as { id: string } | undefined;
          if (!course) { results.push(`Could not find course "${action.course}"`); break; }
          const id = crypto.randomUUID();
          await db.execute({ sql: "INSERT INTO exams (id, course_id, title, date, time, topics, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id, course.id, action.title, action.date, action.time ?? null, action.topics ?? null, action.difficulty ?? "medium"] });
          results.push(`Created exam "${action.title}" for ${action.course} on ${action.date}`);
          break;
        }
        case "create_assignment": {
          const courseRes = await db.execute({ sql: "SELECT id FROM courses WHERE name = ? COLLATE NOCASE", args: [action.course] });
          const course = courseRes.rows[0] as unknown as { id: string } | undefined;
          if (!course) { results.push(`Could not find course "${action.course}"`); break; }
          const id = crypto.randomUUID();
          await db.execute({ sql: "INSERT INTO assignments (id, course_id, title, type, due_date, priority, description) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id, course.id, action.title, action.type_name ?? action.type ?? "homework", action.due_date ?? null, action.priority ?? "medium", action.description ?? null] });
          results.push(`Created assignment "${action.title}" for ${action.course}`);
          break;
        }
        case "delete_course": {
          await db.execute({ sql: "DELETE FROM courses WHERE id = ?", args: [action.id] });
          results.push(`Deleted course`);
          break;
        }
        case "delete_exam": {
          await db.execute({ sql: "DELETE FROM exams WHERE id = ?", args: [action.id] });
          results.push(`Deleted exam`);
          break;
        }
        case "delete_assignment": {
          await db.execute({ sql: "DELETE FROM assignments WHERE id = ?", args: [action.id] });
          results.push(`Deleted assignment`);
          break;
        }
        case "complete_assignment": {
          await db.execute({ sql: "UPDATE assignments SET status = 'done' WHERE id = ?", args: [action.id] });
          results.push(`Marked assignment as done`);
          break;
        }
      }
    } catch {
      results.push("Failed to execute action");
    }
  }
  return results;
}

export async function GET() {
  const db = getDb();
  await initDb();
  const result = await db.execute("SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT 100");
  return NextResponse.json(result.rows);
}

export async function DELETE() {
  const db = getDb();
  await initDb();
  await db.execute("DELETE FROM chat_messages");
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const db = getDb();
  await initDb();
  const ctx = await getContext();

  await db.execute({ sql: "INSERT INTO chat_messages (role, content) VALUES ('user', ?)", args: [message] });

  const historyRes = await db.execute("SELECT role, content FROM chat_messages WHERE role IN ('user', 'assistant') ORDER BY created_at DESC LIMIT 20");
  const history = [...historyRes.rows].reverse() as unknown as { role: string; content: string }[];

  const cleanHistory = history.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.role === "assistant" ? m.content.replace(/<action>[\s\S]*?<\/action>/g, "").trim() : m.content,
  }));

  let materialContext = "";
  try {
    const keywords = message.replace(/[^\w\s]/g, "").split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5).join(" ");
    if (keywords) {
      let chunks: { content: string; material_title: string }[] = [];
      try {
        const fts = await db.execute({ sql: "SELECT mc.content, m.title as material_title FROM material_chunks_fts fts JOIN material_chunks mc ON mc.id = fts.rowid JOIN materials m ON m.id = mc.material_id WHERE material_chunks_fts MATCH ? ORDER BY rank LIMIT 3", args: [keywords] });
        chunks = fts.rows as unknown as { content: string; material_title: string }[];
      } catch {
        const like = await db.execute({ sql: "SELECT mc.content, m.title as material_title FROM material_chunks mc JOIN materials m ON m.id = mc.material_id WHERE mc.content LIKE ? LIMIT 3", args: [`%${keywords.split(" ")[0]}%`] });
        chunks = like.rows as unknown as { content: string; material_title: string }[];
      }
      if (chunks.length > 0) {
        materialContext = "\n\n## Relevant Study Materials\n" + chunks.map(c => `### From "${c.material_title}":\n${c.content.slice(0, 1500)}`).join("\n\n");
      }
    }
  } catch { /* material search failed, continue without */ }

  try {
    const { client, model } = await getAiClient();
    const systemPrompt = buildSystemPrompt(ctx) + materialContext;
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanHistory,
      ],
      max_tokens: 2000,
    });

    const reply = res.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    const actionMatches = [...reply.matchAll(/<action>([\s\S]*?)<\/action>/g)];
    const actionJsons = actionMatches.map(m => m[1].trim());
    let actionResults: string[] = [];
    if (actionJsons.length > 0) {
      actionResults = await executeActions(actionJsons);
    }

    const cleanReply = reply.replace(/<action>[\s\S]*?<\/action>/g, "").trim();

    await db.execute({
      sql: "INSERT INTO chat_messages (role, content, actions_taken) VALUES ('assistant', ?, ?)",
      args: [cleanReply, actionResults.length > 0 ? JSON.stringify(actionResults) : null],
    });

    return NextResponse.json({
      reply: cleanReply,
      actions: actionResults,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
