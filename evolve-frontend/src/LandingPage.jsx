import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000";

const AVATAR_COLORS = [
  "#E8C547","#F07B54","#6BCFB0","#9B8FE8","#F4A5C0",
  "#5CB8E4","#E87B9B","#7DC97D","#F0C060","#A07BC8",
];

function Avatar({ name, color, size = 40 }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.3, color: "#1a1a2e", flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: `0 0 0 2px #1a1a2e, 0 0 0 4px ${color}40`,
    }}>
      {initials}
    </div>
  );
}

// ─── Demo Chat Modal ──────────────────────────────────────────────────────────

function DemoLiveChatModal({ persona, sessionId, onClose, onSignUpNudge }) {
  const color = persona.color || AVATAR_COLORS[persona.id % AVATAR_COLORS.length];
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hey, I'm ${persona.name}. Ask me anything about my experience with your product.` }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    if (msgCount >= 3) { onSignUpNudge(); return; }
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setSending(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/demo/interview/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, persona_id: persona.id, message: userMsg, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      setMsgCount(c => c + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "[Connection error — try again]" }]);
    } finally { setSending(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0e0e22", border: "1px solid #ffffff15", borderRadius: 20, maxWidth: 520, width: "100%", display: "flex", flexDirection: "column", animation: "fadeSlideUp 0.3s ease", overflow: "hidden", maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #ffffff0f", display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={persona.name} color={color} size={32} />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#fff", fontSize: 13 }}>{persona.name}</div>
            <div style={{ fontSize: 11, color: "#ffffff40" }}>{persona.segment}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#E8C547", background: "#E8C54715", padding: "3px 10px", borderRadius: 20, border: "1px solid #E8C54730" }}>Demo — {3 - msgCount} msgs left</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff40", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, minHeight: 280 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              {m.role === "assistant" && <Avatar name={persona.name} color={color} size={26} />}
              <div style={{
                maxWidth: "78%", padding: "9px 13px", borderRadius: 12,
                background: m.role === "user" ? "#E8C54720" : "#080818",
                border: `1px solid ${m.role === "user" ? "#E8C54740" : "#ffffff0f"}`,
                color: "#e8e8f0", fontSize: 13, lineHeight: 1.6,
                fontFamily: m.role === "assistant" ? "'Lora', serif" : "'DM Sans', sans-serif",
                fontStyle: m.role === "assistant" ? "italic" : "normal",
              }}>{m.content}</div>
            </div>
          ))}
          {sending && (
            <div style={{ display: "flex", gap: 8 }}>
              <Avatar name={persona.name} color={color} size={26} />
              <div style={{ padding: "9px 13px", borderRadius: 12, background: "#080818", border: "1px solid #ffffff0f" }}>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#ffffff30", display: "inline-block", animation: `pulse 1s ease ${i * 0.2}s infinite` }} />)}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {msgCount >= 3 ? (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #ffffff0f", background: "#E8C54708", textAlign: "center" }}>
            <p style={{ color: "#e8e8f0", fontSize: 13, marginBottom: 10 }}>You've used your 3 demo messages.</p>
            <button onClick={onSignUpNudge} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #E8C547, #F07B54)", border: "none", cursor: "pointer", color: "#1a1a2e", fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              Sign up for unlimited chat →
            </button>
          </div>
        ) : (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #ffffff0f", display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder={`Ask ${persona.name.split(" ")[0]} a question...`}
              style={{ flex: 1, background: "#080818", border: "1px solid #ffffff15", borderRadius: 10, padding: "9px 13px", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            <button onClick={send} disabled={sending || !input.trim()} style={{
              padding: "9px 16px", borderRadius: 10,
              background: sending || !input.trim() ? "#ffffff08" : `linear-gradient(135deg, ${color}, #F07B54)`,
              border: "none", cursor: sending || !input.trim() ? "not-allowed" : "pointer",
              color: "#1a1a2e", fontWeight: 700, fontSize: 13,
            }}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Demo Persona Card ────────────────────────────────────────────────────────

function DemoPersonaCard({ persona, index, sessionId, onSignUpNudge }) {
  const color = persona.color || AVATAR_COLORS[persona.id % AVATAR_COLORS.length];
  const [expanded, setExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <div style={{
        display: "flex", gap: 16, padding: "18px 20px",
        background: index % 2 === 0 ? "#12122a" : "#0e0e22",
        borderRadius: 14, border: "1px solid #ffffff0f",
        animation: "fadeSlideUp 0.4s ease both",
        animationDelay: `${index * 0.08}s`,
        transition: "border-color 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = `${color}50`}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#ffffff0f"}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 60 }}>
          <Avatar name={persona.name} color={color} size={48} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#ffffff60", textAlign: "center", lineHeight: 1.3 }}>{persona.name}</span>
          <div style={{ display: "flex", gap: 1 }}>
            {[...Array(5)].map((_, i) => <span key={i} style={{ color: i < persona.rating ? "#E8C547" : "#ffffff15", fontSize: 9 }}>★</span>)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Lora', serif", fontSize: 13, color: "#e8e8f0",
            lineHeight: 1.7, fontStyle: "italic",
            display: expanded ? "block" : "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : 3,
            WebkitBoxOrient: "vertical", overflow: expanded ? "visible" : "hidden",
          }}>"{persona.feedback}"</div>
          {persona.feedback?.length > 180 && (
            <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 4, background: "none", border: "none", cursor: "pointer", color: "#E8C547", fontSize: 11, fontFamily: "'DM Sans', sans-serif", padding: 0 }}>
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: "#E8C54715", color: "#E8C547", fontFamily: "'DM Sans', sans-serif" }}>{persona.segment}</span>
            <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: "#6BCFB015", color: "#6BCFB0", fontFamily: "'DM Sans', sans-serif" }}>{persona.sentiment}</span>
            <button onClick={() => setShowChat(true)} style={{
              marginLeft: "auto", fontSize: 11, padding: "3px 11px", borderRadius: 7,
              background: "none", border: `1px solid ${color}40`, color: color,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >💬 Live Chat</button>
          </div>
        </div>
      </div>
      {showChat && (
        <DemoLiveChatModal
          persona={persona}
          sessionId={sessionId}
          onClose={() => setShowChat(false)}
          onSignUpNudge={() => { setShowChat(false); onSignUpNudge(); }}
        />
      )}
    </>
  );
}

// ─── Static preview cards (hero section) ─────────────────────────────────────

const PREVIEW_PERSONAS = [
  { name: "Priya Nair", color: "#9B8FE8", segment: "Early Adopter", rating: 5, feedback: "This is exactly what I've been looking for. The onboarding is seamless and the value is immediately obvious." },
  { name: "Marcus Webb", color: "#F07B54", segment: "SMB Owner", rating: 3, feedback: "I can see the potential, but the pricing feels steep for a small team. I'd want a trial period before committing." },
  { name: "Jordan Ellis", color: "#6BCFB0", segment: "Tech Skeptic", rating: 4, feedback: "Honestly surprised — I expected another overhyped AI tool but this actually saved me real time in planning." },
];

function PreviewCard({ persona, delay = 0 }) {
  return (
    <div style={{
      background: "#0e0e22", border: "1px solid #ffffff10", borderRadius: 14,
      padding: "14px 16px", display: "flex", gap: 12, animation: "fadeSlideUp 0.6s ease both",
      animationDelay: `${delay}s`,
    }}>
      <Avatar name={persona.name} color={persona.color} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>{persona.name}</span>
          <span style={{ fontSize: 10, color: "#ffffff40", fontFamily: "'DM Sans', sans-serif" }}>{persona.segment}</span>
        </div>
        <div style={{ display: "flex", gap: 1, marginBottom: 6 }}>
          {[...Array(5)].map((_, i) => <span key={i} style={{ color: i < persona.rating ? "#E8C547" : "#ffffff15", fontSize: 9 }}>★</span>)}
        </div>
        <div style={{ fontSize: 11, color: "#ffffff70", fontFamily: "'Lora', serif", fontStyle: "italic", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>"{persona.feedback}"</div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function LandingPage({ onGetStarted }) {
  const demoRef = useRef(null);
  const [demoText, setDemoText] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoPersonas, setDemoPersonas] = useState([]);
  const [demoSessionId, setDemoSessionId] = useState(null);
  const [demoError, setDemoError] = useState(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const runDemo = async () => {
    if (!demoText.trim()) return;
    setDemoError(null);
    setDemoLoading(true);
    setDemoPersonas([]);
    try {
      const fd = new FormData();
      fd.append("text", demoText);
      const res = await fetch(`${API_BASE}/demo/generate`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setDemoPersonas(data.personas);
      setDemoSessionId(data.session_id);
    } catch (e) {
      setDemoError(e.message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,600;1,400&family=Space+Mono:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080818; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        input::placeholder, textarea::placeholder { color: #ffffff25; }
        input:focus, textarea:focus { outline: none; border-color: #E8C547 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080818; }
        ::-webkit-scrollbar-thumb { background: #ffffff20; border-radius: 3px; }
        a { text-decoration: none; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080818", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>

        {/* ── Nav ── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "0 32px", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: navScrolled ? "#080818ee" : "transparent",
          backdropFilter: navScrolled ? "blur(12px)" : "none",
          borderBottom: navScrolled ? "1px solid #ffffff0a" : "none",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #E8C547, #F07B54)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, letterSpacing: "0.05em" }}>Evolve AI</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={scrollToDemo} style={{ padding: "8px 16px", background: "none", border: "none", color: "#ffffff60", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Try Demo</button>
            <button onClick={onGetStarted} style={{ padding: "8px 16px", background: "none", border: "1px solid #ffffff20", borderRadius: 8, color: "#ffffff80", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#ffffff40"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#ffffff20"; e.currentTarget.style.color = "#ffffff80"; }}
            >Sign In</button>
            <button onClick={onGetStarted} style={{ padding: "8px 20px", background: "linear-gradient(135deg, #E8C547, #F07B54)", border: "none", borderRadius: 8, color: "#1a1a2e", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
              Get Started
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 32px 60px", maxWidth: 1140, margin: "0 auto", gap: 60, position: "relative" }}>
          {/* Glow blobs */}
          <div style={{ position: "absolute", top: "10%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #E8C54712 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "10%", right: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #9B8FE812 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Left — copy */}
          <div style={{ flex: 1, animation: "fadeSlideUp 0.6s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "#E8C54710", border: "1px solid #E8C54730", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8C547", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#E8C547", fontWeight: 600 }}>AI-powered customer testing</span>
            </div>
            <h1 style={{ fontFamily: "'Lora', serif", fontSize: "clamp(36px, 4.5vw, 58px)", fontWeight: 600, lineHeight: 1.15, marginBottom: 20, color: "#fff" }}>
              Know what your customers<br />think <span style={{ color: "#E8C547" }}>before you launch.</span>
            </h1>
            <p style={{ fontSize: 16, color: "#ffffff60", lineHeight: 1.8, maxWidth: 480, marginBottom: 36 }}>
              Evolve AI generates 20+ realistic customer personas that review your product, surface real objections, and answer your questions — in seconds, not weeks.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={onGetStarted} style={{
                padding: "14px 32px", borderRadius: 12,
                background: "linear-gradient(135deg, #E8C547, #F07B54)",
                border: "none", cursor: "pointer", color: "#1a1a2e",
                fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 8px 32px #E8C54730",
              }}>Generate Personas Now →</button>
              <button onClick={scrollToDemo} style={{
                padding: "14px 28px", borderRadius: 12,
                background: "transparent", border: "1px solid #ffffff20",
                cursor: "pointer", color: "#ffffff80",
                fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#ffffff40"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#ffffff20"; e.currentTarget.style.color = "#ffffff80"; }}
              >Try Free Demo</button>
            </div>
            <p style={{ marginTop: 18, fontSize: 12, color: "#ffffff30" }}>No credit card required · 5 free personas · No sign-up for demo</p>
          </div>

          {/* Right — floating product preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, animation: "float 6s ease-in-out infinite", maxWidth: 400 }}>
            {PREVIEW_PERSONAS.map((p, i) => (
              <PreviewCard key={p.name} persona={p} delay={0.3 + i * 0.15} />
            ))}
            {/* Live chat bubble overlay */}
            <div style={{ position: "absolute", right: 0, bottom: "14%", background: "#0e0e22", border: "1px solid #6BCFB040", borderRadius: 14, padding: "10px 14px", maxWidth: 200, animation: "fadeSlideUp 1s ease 0.9s both", boxShadow: "0 8px 32px #00000060" }}>
              <div style={{ fontSize: 11, color: "#6BCFB0", marginBottom: 4, fontWeight: 600 }}>💬 Jordan just replied</div>
              <div style={{ fontSize: 11, color: "#ffffff70", fontFamily: "'Lora', serif", fontStyle: "italic", lineHeight: 1.5 }}>"The onboarding flow confused me on step 3..."</div>
            </div>
          </div>
        </section>

        {/* ── Stats strip ── */}
        <section style={{ borderTop: "1px solid #ffffff08", borderBottom: "1px solid #ffffff08", padding: "28px 32px" }}>
          <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", gap: 0, justifyContent: "space-around", flexWrap: "wrap" }}>
            {[
              { value: "$0", label: "Cost to try", sub: "vs $5k–$20k traditional" },
              { value: "20+", label: "Personas per run", sub: "vs 10–20 research participants" },
              { value: "< 60s", label: "Time to insights", sub: "vs 4–6 week study" },
              { value: "24/7", label: "Always available", sub: "vs scheduled sessions" },
            ].map(s => (
              <div key={s.value} style={{ textAlign: "center", padding: "8px 24px" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color: "#E8C547", marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "#ffffff", fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#ffffff30" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section style={{ padding: "100px 32px", maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 12, color: "#E8C547", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>How it works</div>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 600, color: "#fff" }}>From idea to customer feedback<br /><span style={{ color: "#E8C547" }}>in three steps.</span></h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              {
                step: "01", icon: "📋", title: "Drop in your product",
                desc: "Paste a description, upload a pitch deck or PDF, or just share your website URL. Evolve AI reads it all.",
                color: "#E8C547",
              },
              {
                step: "02", icon: "🧠", title: "AI builds your audience",
                desc: "20+ distinct customer personas are generated — each with a unique background, segment, buying mindset, and honest opinion.",
                color: "#9B8FE8",
              },
              {
                step: "03", icon: "💬", title: "Ask them anything",
                desc: "Chat live with any persona. Dig into objections, test messaging, or ask about competitor comparisons in real time.",
                color: "#6BCFB0",
              },
            ].map((s) => (
              <div key={s.step} style={{
                background: "#0e0e22", border: "1px solid #ffffff0a", borderRadius: 20,
                padding: "32px 28px", position: "relative", overflow: "hidden",
                transition: "border-color 0.2s, transform 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.color}30`; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#ffffff0a"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ position: "absolute", top: 20, right: 24, fontFamily: "'Space Mono', monospace", fontSize: 48, color: "#ffffff04", fontWeight: 700, lineHeight: 1 }}>{s.step}</div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#ffffff50", lineHeight: 1.7 }}>{s.desc}</p>
                <div style={{ marginTop: 20, height: 2, width: 40, background: `linear-gradient(90deg, ${s.color}, transparent)`, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Live Demo ── */}
        <section ref={demoRef} style={{ padding: "80px 32px", borderTop: "1px solid #ffffff08" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 12, color: "#6BCFB0", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Live Demo</div>
              <h2 style={{ fontFamily: "'Lora', serif", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 600, color: "#fff", marginBottom: 14 }}>
                Try it now — no sign-up needed.
              </h2>
              <p style={{ fontSize: 15, color: "#ffffff50", lineHeight: 1.7 }}>
                Paste any product description below. We'll generate 5 real AI personas and you can chat with each of them.
              </p>
            </div>

            <div style={{ background: "#0e0e22", border: "1px solid #ffffff10", borderRadius: 20, padding: "28px 28px 24px" }}>
              <label style={{ display: "block", fontSize: 12, color: "#ffffff50", marginBottom: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Your Product</label>
              <textarea
                value={demoText}
                onChange={e => setDemoText(e.target.value)}
                rows={5}
                placeholder="e.g. A mobile app that helps freelancers track invoices and expenses, with automatic tax calculations and integrations with Stripe and PayPal..."
                style={{
                  width: "100%", background: "#080818", border: "1px solid #ffffff15", borderRadius: 12,
                  padding: "14px", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                  resize: "vertical", lineHeight: 1.6, marginBottom: 16,
                }}
              />
              {demoError && (
                <div style={{ marginBottom: 14, padding: "11px 14px", background: "#F0707015", border: "1px solid #F0707040", borderRadius: 10, color: "#F07070", fontSize: 13 }}>
                  ⚠ {demoError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <p style={{ fontSize: 12, color: "#ffffff25" }}>Free demo · 5 personas · No account needed</p>
                <button
                  onClick={runDemo}
                  disabled={demoLoading || !demoText.trim()}
                  style={{
                    padding: "12px 28px", borderRadius: 12,
                    background: demoLoading || !demoText.trim() ? "#ffffff10" : "linear-gradient(135deg, #E8C547, #F07B54)",
                    border: "none", cursor: demoLoading || !demoText.trim() ? "not-allowed" : "pointer",
                    color: demoLoading || !demoText.trim() ? "#ffffff30" : "#1a1a2e",
                    fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                  }}>
                  {demoLoading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid #1a1a2e40", borderTopColor: "#1a1a2e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Generating personas...
                    </span>
                  ) : "Generate 5 Free Personas →"}
                </button>
              </div>
            </div>

            {/* Demo results */}
            {demoPersonas.length > 0 && (
              <div style={{ marginTop: 28, animation: "fadeSlideUp 0.4s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Lora', serif", fontSize: 18, color: "#fff" }}>Your 5 Personas</h3>
                  <span style={{ fontSize: 12, color: "#ffffff30" }}>Click 💬 Live Chat on any card</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {demoPersonas.map((p, i) => (
                    <DemoPersonaCard
                      key={p.id}
                      persona={p}
                      index={i}
                      sessionId={demoSessionId}
                      onSignUpNudge={() => setShowSignUpModal(true)}
                    />
                  ))}
                </div>

                {/* Paywall nudge */}
                <div style={{
                  marginTop: 28, padding: "28px 32px", borderRadius: 18,
                  background: "linear-gradient(135deg, #E8C54710, #9B8FE810)",
                  border: "1px solid #E8C54730", textAlign: "center",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>✦</div>
                  <h3 style={{ fontFamily: "'Lora', serif", fontSize: 20, color: "#fff", marginBottom: 8 }}>Want all 20+ personas?</h3>
                  <p style={{ fontSize: 14, color: "#ffffff50", marginBottom: 20, lineHeight: 1.7 }}>
                    Sign up free to unlock the full run — 20+ personas, unlimited live chat, and saved session history.
                  </p>
                  <button onClick={onGetStarted} style={{
                    padding: "13px 36px", borderRadius: 12,
                    background: "linear-gradient(135deg, #E8C547, #F07B54)",
                    border: "none", cursor: "pointer", color: "#1a1a2e",
                    fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                    boxShadow: "0 8px 32px #E8C54730",
                  }}>Sign Up Free →</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Cost comparison ── */}
        <section style={{ padding: "100px 32px", borderTop: "1px solid #ffffff08" }}>
          <div style={{ maxWidth: 1140, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ fontSize: 12, color: "#F07B54", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Why Evolve AI</div>
              <h2 style={{ fontFamily: "'Lora', serif", fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 600, color: "#fff" }}>
                Traditional research is broken.<br /><span style={{ color: "#E8C547" }}>We fixed it.</span>
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 860, margin: "0 auto" }}>
              {/* Traditional */}
              <div style={{ background: "#0d0d1a", border: "1px solid #ffffff0a", borderRadius: 20, padding: "32px 28px" }}>
                <div style={{ fontSize: 13, color: "#ffffff30", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 24 }}>❌ Traditional Research</div>
                {[
                  ["Cost", "$5,000 – $20,000 per study"],
                  ["Timeline", "4 – 6 weeks to recruit & run"],
                  ["Participants", "10 – 20 people"],
                  ["Follow-up", "Scheduled sessions only"],
                  ["Availability", "Business hours, limited slots"],
                  ["Iteration", "Start from scratch each time"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #ffffff06", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "#ffffff40", flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, color: "#ffffff60", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Evolve AI */}
              <div style={{ background: "#0e0e22", border: "1px solid #E8C54730", borderRadius: 20, padding: "32px 28px", boxShadow: "0 0 60px #E8C54710" }}>
                <div style={{ fontSize: 13, color: "#E8C547", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 24 }}>✦ Evolve AI</div>
                {[
                  ["Cost", "Fraction of the cost"],
                  ["Timeline", "Results in under 60 seconds"],
                  ["Personas", "20+ per run, unlimited runs"],
                  ["Follow-up", "Instant live chat, any time"],
                  ["Availability", "24/7, no scheduling needed"],
                  ["Iteration", "Saved history, re-run anytime"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #E8C54710", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "#ffffff50", flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, color: "#E8C547", textAlign: "right", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section style={{ padding: "100px 32px 120px", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 100%, #E8C54710 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ maxWidth: 620, margin: "0 auto", position: "relative" }}>
            <div style={{ fontSize: 36, marginBottom: 20 }}>⚡</div>
            <h2 style={{ fontFamily: "'Lora', serif", fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: 600, color: "#fff", marginBottom: 18, lineHeight: 1.2 }}>
              Ready to simulate your launch?
            </h2>
            <p style={{ fontSize: 16, color: "#ffffff50", lineHeight: 1.8, marginBottom: 36 }}>
              Join founders and product teams who use Evolve AI to get honest customer feedback before spending a single dollar on ads.
            </p>
            <button onClick={onGetStarted} style={{
              padding: "16px 48px", borderRadius: 14,
              background: "linear-gradient(135deg, #E8C547, #F07B54)",
              border: "none", cursor: "pointer", color: "#1a1a2e",
              fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 12px 48px #E8C54735",
            }}>Get Started Free →</button>
            <p style={{ marginTop: 14, fontSize: 12, color: "#ffffff25" }}>No credit card · Sign up with Google or email</p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: "1px solid #ffffff08", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #E8C547, #F07B54)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚡</div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#ffffff40" }}>Evolve AI</span>
          </div>
          <span style={{ fontSize: 12, color: "#ffffff20" }}>Built for founders. Powered by AI.</span>
        </footer>
      </div>

      {/* ── Sign-up nudge modal ── */}
      {showSignUpModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowSignUpModal(false)}>
          <div style={{ background: "#0e0e22", border: "1px solid #E8C54730", borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", animation: "fadeSlideUp 0.3s ease" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>✦</div>
            <h3 style={{ fontFamily: "'Lora', serif", fontSize: 22, color: "#fff", marginBottom: 10 }}>You've hit the demo limit</h3>
            <p style={{ fontSize: 14, color: "#ffffff50", lineHeight: 1.7, marginBottom: 24 }}>
              Sign up free to unlock unlimited live chat, 20+ personas per run, and saved history across sessions.
            </p>
            <button onClick={onGetStarted} style={{
              width: "100%", padding: "13px", borderRadius: 12,
              background: "linear-gradient(135deg, #E8C547, #F07B54)",
              border: "none", cursor: "pointer", color: "#1a1a2e",
              fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              marginBottom: 12,
            }}>Create Free Account →</button>
            <button onClick={() => setShowSignUpModal(false)} style={{ background: "none", border: "none", color: "#ffffff30", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              Continue with demo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
