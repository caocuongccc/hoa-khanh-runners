// FILE: src/App.js
// App hoàn chỉnh với Authentication, Member Dashboard, Admin Dashboard

import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { onAuthChange, isAdmin } from "./services/auth-service";
import LoginPage from "./components/Auth/LoginPage";
import MemberDashboard from "./components/Member/MemberDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import StravaCallback from "./components/StravaCallback";
import SeedDataPage from "./components/SeedData";
import SetupAdmin from "./components/Admin/SetupAdmin";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lắng nghe trạng thái đăng nhập
    const unsubscribe = onAuthChange((user) => {
      console.log("Auth state changed:", user); // Debug
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
        {/* Seed Data Page - Không cần login */}
        <Route path="/seed-data" element={<SeedDataPage />} />
        {/* Thêm route (trong <Routes>) */}
        <Route path="/setup-admin" element={<SetupAdmin />} />
        {/* Strava Callback */}
        <Route
          path="/strava/callback"
          element={<StravaCallback currentUser={currentUser} />}
        />

        {/* Main Routes */}
        <Route
          path="/*"
          element={
            !currentUser ? (
              <LoginPage onLoginSuccess={setCurrentUser} />
            ) : isAdmin(currentUser) ? (
              <AdminDashboard
                user={currentUser}
                onLogout={() => setCurrentUser(null)}
              />
            ) : (
              <MemberDashboard
                user={currentUser}
                onLogout={() => setCurrentUser(null)}
              />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
