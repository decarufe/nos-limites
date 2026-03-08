import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";
import AuthVerifyPage from "./pages/auth/AuthVerifyPage";
import OAuthCallbackPage from "./pages/auth/OAuthCallbackPage";
import ProfileSetupPage from "./pages/auth/ProfileSetupPage";
import HomePage from "./pages/relationships/HomePage";
import ScanPage from "./pages/relationships/ScanPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import ProfilePage from "./pages/profile/ProfilePage";
import InvitePage from "./pages/relationships/InvitePage";
import RelationshipPage from "./pages/relationships/RelationshipPage";
import AboutPage from "./pages/profile/AboutPage";
import NotificationSettingsPage from "./pages/notifications/NotificationSettingsPage";

function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth pages without bottom nav */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/verify" element={<AuthVerifyPage />} />
            <Route
              path="/auth/oauth-callback"
              element={<OAuthCallbackPage />}
            />
            <Route path="/profile/setup" element={<ProfileSetupPage />} />

            {/* Main app with bottom tab navigation */}
            <Route element={<AppLayout />}>
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scan"
                element={
                  <ProtectedRoute>
                    <ScanPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relationship/:id"
                element={
                  <ProtectedRoute>
                    <RelationshipPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invite/:token"
                element={
                  <ProtectedRoute>
                    <InvitePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<AboutPage />} />
            </Route>

            {/* Settings pages without bottom nav */}
            <Route
              path="/settings/notifications"
              element={
                <ProtectedRoute>
                  <NotificationSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationsProvider>
    </AuthProvider>
  );
}

export default App;
