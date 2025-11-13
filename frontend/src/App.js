import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthChange, isAdmin } from "./services/auth-service";
import LoginPage from "./components/Auth/LoginPage";
import MemberDashboard from "./components/Member/MemberDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import StravaCallback from "./components/StravaCallback";
import SeedDataPage from "./components/SeedData";
import SetupAdmin from "./components/Admin/SetupAdmin";
import HomePage from "./components/pages/HomePage";
import FeedPage from "./components/pages/FeedPage";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthChange((user) => {
      console.log("Auth state changed:", user);
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - No login required */}
        <Route path="/" element={<HomePage />} />
        <Route path="/feed" element={<FeedPage currentUser={currentUser} />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage onLoginSuccess={setCurrentUser} />} />
        <Route path="/strava/callback" element={<StravaCallback currentUser={currentUser} />} />
        
        {/* Admin Only Routes */}
        <Route path="/seed-data" element={<SeedDataPage />} />
        <Route path="/setup-admin" element={<SetupAdmin />} />

        {/* Protected Routes - Login required */}
        <Route
          path="/member/*"
          element={
            currentUser ? (
              isAdmin(currentUser) ? (
                <Navigate to="/admin" replace />
              ) : (
                <MemberDashboard
                  user={currentUser}
                  onLogout={() => setCurrentUser(null)}
                />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/admin/*"
          element={
            currentUser && isAdmin(currentUser) ? (
              <AdminDashboard
                user={currentUser}
                onLogout={() => setCurrentUser(null)}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;