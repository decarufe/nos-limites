import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import AuthVerifyPage from "./pages/AuthVerifyPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import HomePage from "./pages/HomePage";
import ScanPage from "./pages/ScanPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import InvitePage from "./pages/InvitePage";
import RelationshipPage from "./pages/RelationshipPage";

function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth pages without bottom nav */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/verify" element={<AuthVerifyPage />} />
            <Route path="/profile/setup" element={<ProfileSetupPage />} />

            {/* Main app with bottom tab navigation */}
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/relationship/:id"
                element={<RelationshipPage />}
              />
              <Route
                path="/invite/:token"
                element={<InvitePage />}
              />
            </Route>

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
