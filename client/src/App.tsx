import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login Page - Coming Soon</div>} />
        <Route path="/home" element={<div>Home Page - Coming Soon</div>} />
        <Route path="/scan" element={<div>Scanner Page - Coming Soon</div>} />
        <Route
          path="/notifications"
          element={<div>Notifications Page - Coming Soon</div>}
        />
        <Route
          path="/profile"
          element={<div>Profile Page - Coming Soon</div>}
        />
        <Route
          path="/relationship/:id"
          element={<div>Relationship Detail - Coming Soon</div>}
        />
        <Route
          path="/invite/:token"
          element={<div>Invitation Page - Coming Soon</div>}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<div>404 - Page non trouv\u00E9e</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
