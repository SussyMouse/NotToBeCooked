import { BrowserRouter, MemoryRouter, Routes, Route, Navigate, Link } from "react-router";

import RegisterPage from "./pages/register";
import LoginPage from "./pages/login";


function DashboardPage({ platform }: { platform: "web" | "tauri" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Platform: {platform}</p>
      <Link to="/login" className="mt-4 text-primary underline">Log Out</Link>
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
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={<DashboardPage platform={platform} />} />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </Router>
  );
}
