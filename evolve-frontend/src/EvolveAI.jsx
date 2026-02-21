import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000";

const AVATAR_COLORS = [
  "#E8C547","#F07B54","#6BCFB0","#9B8FE8","#F4A5C0",
  "#5CB8E4","#E87B9B","#7DC97D","#F0C060","#A07BC8",
  "#60B8D8","#E8A870","#80C8A0","#D870A8","#70B870",
  "#F07070","#60A8F0","#E8D050","#90D8A0","#D898E8"
];

function AvatarIcon({ name, color, size = 56 }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
      fontSize: size * 0.3, color: "#1a1a2e", flexShrink: 0,
      boxShadow: `0 0 0 3px #1a1a2e, 0 0 0 5px ${color}40`
    }}>
      {initials}
    </div>
  );
}

// ─── Auto Interview Modal ─────────────────────────────────────────────────────

function AutoInterviewModal({ persona, sessionId, onClose }) {
  const [qa, setQa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const color = persona.color || AVATAR_COLORS[persona.id % AVATAR_COLORS.length];

  useEffect(() => {
    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("persona_id", persona.id);
    fetch(`${API_BASE}/interview/auto`, { method: "POST", body: fd })
      .then(r => r.json())
      .then(d => { if (d.detail) throw new Error(d.detail); setQa(d.qa); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0e0e22", border: "1px solid #ffffff15", borderRadius: 20, padding: 32, maxWidth: 620, width: "100%", maxHeight: "80vh", overflowY: "auto", animation: "fadeSlideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <AvatarIcon name={persona.name} color={color} size={44} />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#fff", fontSize: 16 }}>{persona.name}</div>
            <div style={{ fontSize: 12, color: "#ffffff50" }}>{persona.segment} · Auto Interview</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ffffff40", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[...Array(5)].map((_, i) => <div key={i} style={{ height: 60, background: "#ffffff08", borderRadius: 10, animation: "pulse 1.5s ease infinite" }} />)}
          </div>
        )}
        {error && <div style={{ color: "#F07070", fontSize: 14, padding: "12px 16px", background: "#F0707015", borderRadius: 10 }}>⚠ {error}</div>}
        {qa && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {qa.map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: 12, color: "#E8C547", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 6 }}>Q: {item.question}</div>
                <div style={{ fontSize: 14, color: "#e8e8f0", fontFamily: "'Lora', serif", fontStyle: "italic", lineHeight: 1.6, paddingLeft: 12, borderLeft: `2px solid ${color}40` }}>"{item.answer}"</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Chat Modal ──────────────────────────────────────────────────────────

function LiveChatModal({ persona, sessionId, onClose }) {
  const color = persona.color || AVATAR_COLORS[persona.id % AVATAR_COLORS.length];
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hey, I'm ${persona.name}. Ask me anything about my experience with your product.` }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/interview/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          persona_id: persona.id,
          message: userMsg,
          history,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "[Connection error — try again]" }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0e0e22", border: "1px solid #ffffff15", borderRadius: 20, maxWidth: 560, width: "100%", height: 560, display: "flex", flexDirection: "column", animation: "fadeSlideUp 0.3s ease", overflow: "hidden" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #ffffff0f", display: "flex", alignItems: "center", gap: 12 }}>
          <AvatarIcon name={persona.name} color={color} size={36} />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#fff", fontSize: 14 }}>{persona.name}</div>
            <div style={{ fontSize: 11, color: "#ffffff40" }}>{persona.segment} · {persona.rating}★ reviewer</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ffffff40", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
              {m.role === "assistant" && <AvatarIcon name={persona.name} color={color} size={28} />}
              <div style={{
                maxWidth: "75%", padding: "10px 14px", borderRadius: 12,
                background: m.role === "user" ? "#E8C54720" : "#080818",
                border: `1px solid ${m.role === "user" ? "#E8C54740" : "#ffffff0f"}`,
                color: "#e8e8f0", fontSize: 13,
                fontFamily: m.role === "assistant" ? "'Lora', serif" : "'DM Sans', sans-serif",
                fontStyle: m.role === "assistant" ? "italic" : "normal",
                lineHeight: 1.6,
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: "flex", gap: 10 }}>
              <AvatarIcon name={persona.name} color={color} size={28} />
              <div style={{ padding: "10px 14px", borderRadius: 12, background: "#080818", border: "1px solid #ffffff0f" }}>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff30", display: "inline-block", animation: `pulse 1s ease ${i * 0.2}s infinite` }} />)}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #ffffff0f", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder={`Ask ${persona.name.split(" ")[0]} a follow-up...`}
            style={{ flex: 1, background: "#080818", border: "1px solid #ffffff15", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
          />
          <button onClick={send} disabled={sending || !input.trim()} style={{
            padding: "10px 18px", borderRadius: 10,
            background: sending || !input.trim() ? "#ffffff08" : `linear-gradient(135deg, ${color}, #F07B54)`,
            border: "none", cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            color: "#1a1a2e", fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ─── Persona Card ─────────────────────────────────────────────────────────────

function PersonaCard({ persona, index, sessionId }) {
  const [expanded, setExpanded] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const color = persona.color || AVATAR_COLORS[persona.id % AVATAR_COLORS.length];

  return (
    <>
      <div style={{
        display: "flex", gap: 20, padding: "20px 24px",
        background: index % 2 === 0 ? "#12122a" : "#0e0e22",
        borderRadius: 16, border: "1px solid #ffffff0f",
        animation: "fadeSlideUp 0.4s ease both",
        animationDelay: `${Math.min(index * 0.04, 0.8)}s`,
        transition: "border-color 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = `${color}50`}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#ffffff0f"}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 70 }}>
          <AvatarIcon name={persona.name} color={color} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#ffffff60", textAlign: "center", lineHeight: 1.3, fontWeight: 500 }}>{persona.name}</span>
          <div style={{ display: "flex", gap: 2 }}>
            {[...Array(5)].map((_, i) => (
              <span key={i} style={{ color: i < persona.rating ? "#E8C547" : "#ffffff15", fontSize: 10 }}>★</span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Lora', serif", fontSize: 14, color: "#e8e8f0",
            lineHeight: 1.7, fontStyle: "italic",
            display: expanded ? "block" : "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : 4,
            WebkitBoxOrient: "vertical",
            overflow: expanded ? "visible" : "hidden",
          }}>
            "{persona.feedback}"
          </div>
          {persona.feedback?.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", color: "#E8C547", fontSize: 12, fontFamily: "'DM Sans', sans-serif", padding: 0 }}>
              {expanded ? "Show less" : "Read more"}
            </button>
          )}

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#E8C54715", color: "#E8C547", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{persona.segment}</span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#6BCFB015", color: "#6BCFB0", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{persona.sentiment}</span>

            {sessionId && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => setShowInterview(true)} style={{
                  fontSize: 11, padding: "4px 12px", borderRadius: 8,
                  background: "none", border: "1px solid #ffffff15", color: "#ffffff50",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#E8C547"; e.currentTarget.style.color = "#E8C547"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#ffffff15"; e.currentTarget.style.color = "#ffffff50"; }}
                >📋 Auto Q&A</button>

                <button onClick={() => setShowChat(true)} style={{
                  fontSize: 11, padding: "4px 12px", borderRadius: 8,
                  background: "none", border: `1px solid ${color}40`, color: color,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >💬 Live Chat</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showInterview && <AutoInterviewModal persona={persona} sessionId={sessionId} onClose={() => setShowInterview(false)} />}
      {showChat && <LiveChatModal persona={persona} sessionId={sessionId} onClose={() => setShowChat(false)} />}
    </>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────────────

function LoadingSkeletons({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} style={{ display: "flex", gap: 20, padding: "20px 24px", background: "#0e0e22", borderRadius: 16, border: "1px solid #ffffff0f", animation: "fadeSlideUp 0.3s ease both", animationDelay: `${i * 0.06}s` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 70 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ffffff08", animation: "pulse 1.5s ease infinite" }} />
        <div style={{ width: 50, height: 10, borderRadius: 4, background: "#ffffff08", animation: "pulse 1.5s ease infinite" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
        <div style={{ height: 12, borderRadius: 4, background: "#ffffff08", width: "90%", animation: "pulse 1.5s ease infinite" }} />
        <div style={{ height: 12, borderRadius: 4, background: "#ffffff08", width: "75%", animation: "pulse 1.5s ease infinite" }} />
        <div style={{ height: 12, borderRadius: 4, background: "#ffffff08", width: "60%", animation: "pulse 1.5s ease infinite" }} />
      </div>
    </div>
  ));
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function EvolveAI() {
  const [form, setForm] = useState({ name: "", email: "", inputType: "text", text: "", link: "" });
  const [file, setFile] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const inputStyle = { width: "100%", background: "#080818", border: "1px solid #ffffff15", borderRadius: 10, padding: "12px 14px", color: "#ffffff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s" };

  const buildFormData = (extra = {}) => {
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("email", form.email);
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    return fd;
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      let res;
      if (form.inputType === "text") {
        res = await fetch(`${API_BASE}/generate`, { method: "POST", body: buildFormData({ text: form.text, count: 20, start_index: 0 }) });
      } else if (form.inputType === "file" && file) {
        const fd = buildFormData({ count: 20, start_index: 0 });
        fd.append("file", file);
        res = await fetch(`${API_BASE}/generate-from-file`, { method: "POST", body: fd });
      } else if (form.inputType === "link") {
        res = await fetch(`${API_BASE}/generate-from-url`, { method: "POST", body: buildFormData({ url: form.link, count: 20, start_index: 0 }) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setPersonas(data.personas);
      setSessionId(data.session_id);
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMore = async () => {
    setError(null);
    setGenerating(true);
    try {
      const startIndex = personas.length;
      let res;
      if (form.inputType === "text") {
        res = await fetch(`${API_BASE}/generate`, { method: "POST", body: buildFormData({ text: form.text, count: 10, start_index: startIndex }) });
      } else if (form.inputType === "file" && file) {
        const fd = buildFormData({ count: 10, start_index: startIndex });
        fd.append("file", file);
        res = await fetch(`${API_BASE}/generate-from-file`, { method: "POST", body: fd });
      } else if (form.inputType === "link") {
        res = await fetch(`${API_BASE}/generate-from-url`, { method: "POST", body: buildFormData({ url: form.link, count: 10, start_index: startIndex }) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setPersonas(prev => [...prev, ...data.personas]);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const canSubmit = form.name && form.email && (
    (form.inputType === "text" && form.text.trim()) ||
    (form.inputType === "file" && file) ||
    (form.inputType === "link" && form.link.trim())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,600;1,400&family=Space+Mono:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080818; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: #ffffff25; }
        input:focus, textarea:focus { outline: none; border-color: #E8C547 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080818; }
        ::-webkit-scrollbar-thumb { background: #ffffff20; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080818", padding: "40px 20px 80px", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #E8C54708 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 780, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 48, animation: "fadeSlideUp 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #E8C547, #F07B54)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "0.05em" }}>Evolve AI</span>
            </div>
            <h1 style={{ fontFamily: "'Lora', serif", fontSize: 36, fontWeight: 600, color: "#ffffff", lineHeight: 1.2, marginBottom: 12 }}>
              Simulate your customers<br /><span style={{ color: "#E8C547" }}>before launch day.</span>
            </h1>
            <p style={{ fontSize: 15, color: "#ffffff60", maxWidth: 500, lineHeight: 1.7 }}>
              Upload your product description, file, or link. Evolve AI generates 20+ realistic customer personas who review, critique, and answer your questions — before the world sees it.
            </p>
          </div>

          {/* Form */}
          {!submitted && (
            <div style={{ background: "#0e0e22", border: "1px solid #ffffff10", borderRadius: 20, padding: "36px 36px 32px", marginBottom: 40, animation: "fadeSlideUp 0.5s ease 0.1s both" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#ffffff50", marginBottom: 8, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Full Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#ffffff50", marginBottom: 8, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#ffffff50", marginBottom: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product Input</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[["text", "📝 Text"], ["file", "📎 File"], ["link", "🌐 URL"]].map(([t, label]) => (
                    <button key={t} onClick={() => setForm({ ...form, inputType: t })} style={{
                      padding: "7px 18px", borderRadius: 8, border: "1px solid",
                      borderColor: form.inputType === t ? "#E8C547" : "#ffffff15",
                      background: form.inputType === t ? "#E8C54715" : "transparent",
                      color: form.inputType === t ? "#E8C547" : "#ffffff40",
                      fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 500, transition: "all 0.2s",
                    }}>{label}</button>
                  ))}
                </div>

                {form.inputType === "text" && (
                  <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })}
                    placeholder="Describe your product, paste your landing page copy, or summarize what you're launching..." rows={5}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, padding: "14px" }} />
                )}
                {form.inputType === "file" && (
                  <div onClick={() => document.getElementById("fileInput").click()}
                    style={{ border: "2px dashed #ffffff15", borderRadius: 12, padding: "40px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", background: file ? "#E8C54708" : "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#E8C54740"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#ffffff15"}>
                    <input id="fileInput" type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📎</div>
                    {file ? <span style={{ color: "#E8C547", fontSize: 14 }}>{file.name}</span>
                      : <span style={{ color: "#ffffff30", fontSize: 14 }}>Click to attach your file (PDF, DOCX, TXT)</span>}
                  </div>
                )}
                {form.inputType === "link" && (
                  <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://yourproduct.com" style={inputStyle} />
                )}
              </div>

              {error && <div style={{ marginBottom: 16, padding: "12px 16px", background: "#F0707015", border: "1px solid #F0707040", borderRadius: 10, color: "#F07070", fontSize: 13 }}>⚠ {error}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSubmit} disabled={loading || !canSubmit} style={{
                  padding: "13px 32px", borderRadius: 12,
                  background: loading || !canSubmit ? "#ffffff10" : "linear-gradient(135deg, #E8C547, #F07B54)",
                  border: "none", cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                  color: loading || !canSubmit ? "#ffffff30" : "#1a1a2e",
                  fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}>
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #ffffff40", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Generating personas...
                    </span>
                  ) : "Generate Personas →"}
                </button>
              </div>
            </div>
          )}

          {loading && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}><LoadingSkeletons count={6} /></div>}

          {/* Results */}
          {submitted && !loading && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, animation: "fadeSlideUp 0.4s ease" }}>
                <div>
                  <h2 style={{ fontFamily: "'Lora', serif", fontSize: 22, color: "#ffffff", marginBottom: 4 }}>{personas.length} Customer Personas</h2>
                  <p style={{ fontSize: 13, color: "#ffffff40" }}>📋 Auto Q&A or 💬 Live Chat with any persona</p>
                </div>
                <button onClick={() => { setSubmitted(false); setPersonas([]); setError(null); setSessionId(null); }} style={{
                  padding: "8px 16px", background: "none", border: "1px solid #ffffff15",
                  borderRadius: 8, color: "#ffffff50", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                }}>← New Input</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {personas.map((p, i) => <PersonaCard key={p.id} persona={p} index={i} sessionId={sessionId} />)}
                {generating && <LoadingSkeletons count={3} />}
              </div>

              {error && <div style={{ margin: "16px 0", padding: "12px 16px", background: "#F0707015", border: "1px solid #F0707040", borderRadius: 10, color: "#F07070", fontSize: 13 }}>⚠ {error}</div>}

              <div style={{ textAlign: "center", marginTop: 32 }}>
                <button onClick={handleGenerateMore} disabled={generating} style={{
                  padding: "14px 40px", borderRadius: 12,
                  background: generating ? "#ffffff08" : "#0e0e22",
                  border: "1px solid #E8C54740", color: generating ? "#ffffff30" : "#E8C547",
                  fontSize: 14, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}>
                  {generating ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #E8C54740", borderTopColor: "#E8C547", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Generating more...
                    </span>
                  ) : "✦ Generate 10 More Personas"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}