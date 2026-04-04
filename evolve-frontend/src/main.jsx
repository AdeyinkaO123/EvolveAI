import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { supabase } from "./supabase";
import AuthPage from "./AuthPage";
import EvolveAI from "./EvolveAI";

function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    // Brief loading state while Supabase checks the existing session
    return (
      <div style={{ minHeight: "100vh", background: "#080818", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: "2px solid #ffffff15", borderTopColor: "#E8C547", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return <AuthPage />;
  return <EvolveAI session={session} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
