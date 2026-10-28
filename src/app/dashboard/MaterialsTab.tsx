"use client";

import { useEffect, useState, useRef } from "react";

interface Material {
  id: string;
  title: string;
  source_type: string;
  source_url?: string;
  course_id?: string;
  exam_id?: string;
  course_name?: string;
  course_color?: string;
  chunk_count: number;
  expires_at?: string;
  created_at: string;
}

interface Course { id: string; name: string; color: string }
interface Exam { id: string; title: string; date: string; course_name?: string }

const SOURCE_ICONS: Record<string, string> = {
  pdf: "📄", image: "🖼️", docx: "📝", url: "🔗", youtube: "▶️", note: "📒",
};

export default function MaterialsTab({ courses, exams }: { courses: Course[]; exams: Exam[] }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [uploadCourse, setUploadCourse] = useState("");
  const [uploadExam, setUploadExam] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMaterials(); }, []);

  async function loadMaterials() {
    const res = await fetch("/api/materials").then(r => r.json()).catch(() => []);
    setMaterials(Array.isArray(res) ? res : []);
  }

  function getExamDate(): string | null {
    if (!uploadExam) return null;
    const exam = exams.find(e => e.id === uploadExam);
    return exam?.date ?? null;
  }

  async function saveMaterial(title: string, content: string, sourceType: string, sourceUrl?: string) {
    setUploadProgress("Saving to database...");
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        source_type: sourceType,
        source_url: sourceUrl,
        course_id: uploadCourse || null,
        exam_id: uploadExam || null,
        exam_date: getExamDate(),
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  async function handleFileUpload(file: File) {
    setError("");
    setUploading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "pdf") {
        setUploadProgress("Extracting text from PDF...");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          setUploadProgress(`Extracting page ${i}/${pdf.numPages}...`);
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: { str?: string }) => ("str" in item ? item.str : "")).join(" ") + "\n\n";
        }
        if (!text.trim()) throw new Error("No text found in PDF. It might be a scanned document — try uploading as an image instead.");
        await saveMaterial(file.name.replace(/\.pdf$/i, ""), text, "pdf");

      } else if (ext === "docx") {
        setUploadProgress("Extracting text from document...");
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (!result.value.trim()) throw new Error("No text found in document.");
        await saveMaterial(file.name.replace(/\.docx$/i, ""), result.value, "docx");

      } else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext ?? "")) {
        setUploadProgress("Compressing image...");
        const imageCompression = (await import("browser-image-compression")).default;
        const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 2048 });
        setUploadProgress("Reading image with AI...");
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(compressed);
        });
        const visionRes = await fetch("/api/materials/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64, mime_type: file.type }),
        });
        const visionData = await visionRes.json();
        if (visionData.error) throw new Error(visionData.error);
        await saveMaterial(file.name.replace(/\.\w+$/, ""), visionData.text, "image");

      } else {
        throw new Error(`Unsupported file type: .${ext}. Supported: PDF, DOCX, JPG, PNG, WebP`);
      }

      setUploadProgress("Done!");
      await loadMaterials();
      setShowUpload(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function handleUrlSubmit() {
    if (!urlInput.trim()) return;
    setError("");
    setUploading(true);

    try {
      const isYoutube = /youtube\.com|youtu\.be/.test(urlInput);

      if (isYoutube) {
        setUploadProgress("Fetching YouTube transcript...");
        const res = await fetch("/api/materials/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const title = `YouTube: ${urlInput.match(/[?&]v=([^&]+)/)?.[1] ?? "video"}`;
        await saveMaterial(title, data.text, "youtube", urlInput);
      } else {
        setUploadProgress("Fetching page content...");
        const res = await fetch("/api/materials/extract-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const domain = new URL(urlInput).hostname.replace("www.", "");
        await saveMaterial(`Link: ${domain}`, data.text, "url", urlInput);
      }

      await loadMaterials();
      setUrlInput("");
      setShowUpload(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch URL");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function handleNoteSubmit() {
    if (!noteTitle.trim() || !noteInput.trim()) return;
    setError("");
    setUploading(true);
    try {
      await saveMaterial(noteTitle, noteInput, "note");
      await loadMaterials();
      setNoteTitle("");
      setNoteInput("");
      setShowUpload(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setUploading(false);
    }
  }

  async function deleteMaterial(id: string) {
    await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Study Materials</h2>
        <button
          onClick={() => { setShowUpload(!showUpload); setError(""); }}
          className="inline-flex items-center gap-1.5 font-semibold rounded-xl text-sm px-5 py-2.5 text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all active:scale-[0.97]"
        >
          + Upload Material
        </button>
      </div>

      {showUpload && (
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={uploadCourse}
              onChange={e => setUploadCourse(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm border"
              style={{ background: "var(--muted)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            >
              <option value="">No course (general)</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={uploadExam}
              onChange={e => setUploadExam(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm border"
              style={{ background: "var(--muted)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            >
              <option value="">No exam (expires in 7 days)</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.title} ({e.date})</option>)}
            </select>
          </div>

          {/* File upload zone */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "var(--card-border)"; }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--card-border)";
              const file = e.dataTransfer.files[0];
              if (file) handleFileUpload(file);
            }}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
            style={{ borderColor: "var(--card-border)" }}
          >
            <div className="text-3xl mb-2">📎</div>
            <p className="font-medium text-sm">Drop a file here or click to browse</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
              PDF, DOCX, JPG, PNG, WebP
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* URL input */}
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste a URL or YouTube link..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              disabled={uploading}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-purple-500/30"
              style={{ background: "var(--muted)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              onKeyDown={e => e.key === "Enter" && handleUrlSubmit()}
            />
            <button
              onClick={handleUrlSubmit}
              disabled={uploading || !urlInput.trim()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50"
            >
              Fetch
            </button>
          </div>

          {/* Quick note */}
          <details className="group">
            <summary className="text-sm font-medium cursor-pointer" style={{ color: "var(--muted-fg)" }}>
              Or type/paste a note directly...
            </summary>
            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="Note title"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm border outline-none focus:ring-2 focus:ring-purple-500/30"
                style={{ background: "var(--muted)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              />
              <textarea
                placeholder="Paste your notes here..."
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                rows={4}
                className="w-full rounded-xl px-3 py-2 text-sm border outline-none resize-none focus:ring-2 focus:ring-purple-500/30"
                style={{ background: "var(--muted)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              />
              <button
                onClick={handleNoteSubmit}
                disabled={uploading || !noteTitle.trim() || !noteInput.trim()}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </details>

          {uploading && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--muted)" }}>
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">{uploadProgress}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl text-sm font-medium" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Materials list */}
      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="font-bold text-lg mb-1">No materials yet</h3>
          <p className="text-sm max-w-sm" style={{ color: "var(--muted-fg)" }}>
            Upload PDFs, images of notes, links, or YouTube lectures. The AI will use them to help you study.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {materials.map(m => (
            <div key={m.id} className="rounded-xl border p-4 flex items-center gap-4 group" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="text-2xl">{SOURCE_ICONS[m.source_type] ?? "📄"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{m.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  {m.course_name && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: m.course_color + "22", color: m.course_color }}>
                      {m.course_name}
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
                    {m.chunk_count} chunk{Number(m.chunk_count) !== 1 ? "s" : ""}
                  </span>
                  {m.expires_at && (
                    <span className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
                      expires {m.expires_at}
                    </span>
                  )}
                </div>
              </div>
              {m.source_url && (
                <a
                  href={m.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
                >
                  Source ↗
                </a>
              )}
              <button
                onClick={() => deleteMaterial(m.id)}
                className="text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--danger)" }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
