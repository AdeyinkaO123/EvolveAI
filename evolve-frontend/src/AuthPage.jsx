import { useState } from "react";
import { supabase } from "./supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const inputStyle = {
    width: "100%",
    background: "#080818",
    border: "1px solid #ffffff15",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.2s",
    outline: "none",
  };

  const handleEmailAuth = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange in main.jsx handles the redirect
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Page will redirect to Google — no cleanup needed
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,600;1,400&family=Space+Mono:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080818; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #ffffff25; }
        input:focus { border-color: #E8C547 !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#080818",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Background glow */}
        <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #E8C54708 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 420, animation: "fadeSlideUp 0.5s ease" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, justifyContent: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #E8C547, #F07B54)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "0.05em" }}>Evolve AI</span>
          </div>

          {/* Card */}
          <div style={{ background: "#0e0e22", border: "1px solid #ffffff10", borderRadius: 20, padding: "36px 36px 32px" }}>

            <h2 style={{ fontFamily: "'Lora', serif", fontSize: 22, color: "#ffffff", marginBottom: 6, textAlign: "center" }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p style={{ fontSize: 13, color: "#ffffff40", textAlign: "center", marginBottom: 28 }}>
              {mode === "login" ? "Sign in to access your personas" : "Start simulating your customers"}
            </p>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: "#ffffff08",
                border: "1px solid #ffffff15",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: googleLoading || loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "background 0.2s, border-color 0.2s",
                marginBottom: 20,
                opacity: googleLoading || loading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!googleLoading && !loading) e.currentTarget.style.background = "#ffffff12"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#ffffff08"; }}
            >
              {googleLoading ? (
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #ffffff30", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "#ffffff10" }} />
              <span style={{ fontSize: 12, color: "#ffffff30" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#ffffff10" }} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#ffffff50", marginBottom: 8, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleEmailAuth()}
                placeholder="you@company.com"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, color: "#ffffff50", marginBottom: 8, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleEmailAuth()}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            {/* Error / Success */}
            {error && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "#F0707015", border: "1px solid #F0707040", borderRadius: 10, color: "#F07070", fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}
            {success && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "#6BCFB015", border: "1px solid #6BCFB040", borderRadius: 10, color: "#6BCFB0", fontSize: 13 }}>
                ✓ {success}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleEmailAuth}
              disabled={loading || googleLoading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 12,
                background: loading || googleLoading ? "#ffffff10" : "linear-gradient(135deg, #E8C547, #F07B54)",
                border: "none",
                cursor: loading || googleLoading ? "not-allowed" : "pointer",
                color: loading || googleLoading ? "#ffffff30" : "#1a1a2e",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                transition: "opacity 0.2s",
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #1a1a2e40", borderTopColor: "#1a1a2e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>

            {/* Toggle mode */}
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#ffffff40" }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setSuccess(null); }}
                style={{ background: "none", border: "none", color: "#E8C547", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
