import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";

const StravaCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Đang xử lý...");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!window._stravaCallbackHandled) {
      window._stravaCallbackHandled = true;
      handleCallback();
    }
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      console.log("🔄 code ", code);
      if (errorParam) {
        throw new Error("Người dùng từ chối kết nối Strava");
      }

      if (!code) {
        throw new Error("Không tìm thấy authorization code");
      }

      setStatus("Đang xác thực với Strava...");

      // ✅ FIX 1: Use direct fetch with proper CORS handling
      console.log("🔄 Exchanging token with Strava...");

      const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.REACT_APP_STRAVA_CLIENT_ID,
          client_secret: process.env.REACT_APP_STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
        }),
      });
      console.log("🔄 tokenResponse ", tokenResponse);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("❌ Strava token error:", errorText);
        throw new Error(
          `Strava authentication failed: ${tokenResponse.status}`
        );
      }

      const tokenData = await tokenResponse.json();
      console.log("✅ Token received from Strava:", tokenData);

      const { access_token, refresh_token, expires_at, athlete } = tokenData;

      setStatus("Đang tạo/cập nhật tài khoản...");

      // ✅ FIX 2: Check if user exists first, then create/update
      const userId = athlete.id.toString();
      const userRef = doc(db, "users", userId);
      console.log("✅ userId:", userId);
      console.log("✅ userRef:", userRef);
      // Check if user exists
      const userSnap = await getDoc(userRef);
      const isNewUser = !userSnap.exists();

      console.log(
        isNewUser ? "🆕 Creating new user" : "🔄 Updating existing user"
      );

      // Prepare user data
      const userData = {
        id: userId,
        name: `${athlete.firstname} ${athlete.lastname}`,
        email: athlete.email || null,
        avatarUrl: athlete.profile || athlete.profile_medium || null,
        gender:
          athlete.sex === "M" ? "male" : athlete.sex === "F" ? "female" : null,
        city: athlete.city || null,
        country: athlete.country || null,
        stravaIntegration: {
          isConnected: true,
          athleteId: userId,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: expires_at,
          connectedAt: Timestamp.now(),
          username: athlete.username,
        },
        role: isNewUser ? "member" : userSnap.data()?.role || "member",
        updatedAt: Timestamp.now(),
      };

      // Add createdAt only for new users
      if (isNewUser) {
        userData.createdAt = Timestamp.now();
      }

      // ✅ Save to Firestore with merge
      await setDoc(userRef, userData, { merge: true });
      console.log("✅ User saved to Firestore:", userId);

      // Save to localStorage
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          uid: userId,
          ...userData,
        })
      );

      setStatus("Hoàn tất! Đang chuyển hướng...");

      // Check if user intended to join an event
      const intendedEventId = localStorage.getItem("intendedEventId");
      if (intendedEventId) {
        localStorage.removeItem("intendedEventId");
        setTimeout(() => {
          navigate(`/member/event/${intendedEventId}`);
        }, 1000);
      } else {
        setTimeout(() => {
          navigate("/feed");
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Error in Strava callback:", error);
      setError(error.message);

      // Redirect to home after showing error
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {error ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Lỗi kết nối
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">Đang quay về trang chủ...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Đang kết nối...
              </h2>
              <p className="text-gray-600">{status}</p>
              <div className="mt-6 space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Xác thực Strava</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-100"></div>
                  <span>Tạo/cập nhật tài khoản</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-200"></div>
                  <span>Chuyển hướng...</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StravaCallback;
