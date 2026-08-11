import { BrowserRouter, MemoryRouter, Routes, Route, Navigate, Link } from "react-router";

import RegisterPage from "./pages/register";
import LoginPage from "./pages/login";
import { AuthProvider } from "./context/AuthContext";
import ProtectedLayout from "./components/ProtectedLayout";


import { useAuth } from "./context/AuthContext";

function DashboardPage({ platform }: { platform: "web" | "tauri" }) {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Platform: {platform}</p>
      {user && <p className="text-sm text-muted-foreground mt-1">Logged in as: {user.email}</p>}
      <button 
        onClick={logout} 
        className="mt-4 text-primary underline hover:text-primary/80 transition-colors"
      >
        Log Out
      </button>
    </div>
  );
}

/**
 * Shared Multi-Page Application Container.
 * Automatically selects MemoryRouter for Tauri desktop and BrowserRouter for Web.
 */
export function SharedMainApp({ platform }: { platform: "web" | "tauri" }) {
  const Router = platform === "tauri" ? MemoryRouter : BrowserRouter;

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={ <ProtectedLayout /> }>
            <Route path="/dashboard" element={<DashboardPage platform={platform} />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}
