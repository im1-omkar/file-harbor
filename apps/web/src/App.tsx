import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicLandingPage } from "./pages/PublicLandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { api, type UserProfile } from "./services/api";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth session
    api
      .getMe()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleSignOut() {
    try {
      await api.signout();
    } catch {}
    setUser(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs">
        Connecting to File Harbor...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page (P2P Sharing available WITHOUT login) */}
        <Route
          path="/"
          element={
            <PublicLandingPage
              user={user}
              onAuthSuccess={(u) => setUser(u)}
            />
          }
        />

        {/* Authenticated Dashboard Page */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <DashboardPage
                user={user}
                onSignOut={handleSignOut}
                onUserUpdate={(u) => setUser(u)}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Catch-all redirect to / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
