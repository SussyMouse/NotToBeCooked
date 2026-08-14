

import RegisterPage from "./pages/register";
import LoginPage from "./pages/login";
import DashboardPage from "./pages/dashboard";
import { AuthProvider } from "./context/AuthContext";
import ProtectedLayout from "./components/ProtectedLayout";
import {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
} from "react-router";

import { useAuth } from "./context/auth-context";

/**
 * Shared Multi-Page Application Container.
 * Automatically selects MemoryRouter for Tauri desktop and BrowserRouter for Web.
 */
export function SharedMainApp({ platform }: { platform: "web" | "tauri" }) {
  const Router = platform === "tauri" ? MemoryRouter : BrowserRouter;

  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="*" element={<Navigate to="/register" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<DashboardPage platform={platform} />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}
