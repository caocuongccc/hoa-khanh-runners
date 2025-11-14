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
    // ✅ Check localStorage first for Strava login
    const checkLocalStorage = () => {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          console.log("✅ User loaded from localStorage:", user.name);
          setCurrentUser(user);
          setLoading(false);
          return true;
        } catch (error) {
          console.error("Error parsing stored user:", error);
          localStorage.removeItem("currentUser");
        }
      }
      return false;
    };

    // Check localStorage immediately
    const hasStoredUser = checkLocalStorage();

    // ✅ Listen to custom event when user logs in via Strava
    const handleUserLogin = () => {
      console.log("🔔 User logged in event received");
      checkLocalStorage();
    };

    window.addEventListener('userLoggedIn', handleUserLogin);

    // Also listen to Firebase auth changes (for admin login)
    const unsubscribe = onAuthChange((user) => {
      if (!hasStoredUser) {
        console.log("Auth state changed:", user);
        setCurrentUser(user);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('userLoggedIn', handleUserLogin);
    };
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
        
        {/* ✅ Auth Routes - Strava OAuth Callback */}
        <Route path="/strava/callback" element={<StravaCallback />} />
        
        {/* ✅ Admin Route - Direct access for admin login */}
        <Route path="/admin/login" element={<LoginPage onLoginSuccess={setCurrentUser} />} />
        
        {/* Admin Only Routes */}
        <Route path="/seed-data" element={<SeedDataPage />} />
        <Route path="/setup-admin" element={<SetupAdmin />} />

        {/* ✅ Protected Member Routes - Auto redirect from Strava OAuth */}
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
              <Navigate to="/" replace />
            )
          }
        />

        {/* ✅ Admin Dashboard Routes */}
        <Route
          path="/admin/*"
          element={
            currentUser && isAdmin(currentUser) ? (
              <AdminDashboard
                user={currentUser}
                onLogout={() => setCurrentUser(null)}
              />
            ) : (
              <Navigate to="/admin/login" replace />
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