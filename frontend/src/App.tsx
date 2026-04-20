import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import { useAuthStore } from "./store/auth-store";
import { CreateSessionPage } from "./pages/create-session-page";
import { DashboardPage } from "./pages/dashboard-page";
import { LandingPage } from "./pages/landing-page";
import { LoginPage } from "./pages/login-page";
import { PresenterViewPage } from "./pages/presenter-view-page";
import { RegisterPage } from "./pages/register-page";
import { SlideEditorPage } from "./pages/slide-editor-page";
import { ViewerViewPage } from "./pages/viewer-view-page";

function AuthBootstrap() {
  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/new"
          element={
            <ProtectedRoute>
              <CreateSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:id/edit"
          element={
            <ProtectedRoute>
              <SlideEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:id/present"
          element={
            <ProtectedRoute>
              <PresenterViewPage />
            </ProtectedRoute>
          }
        />
        <Route path="/view/:code" element={<ViewerViewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
