import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";

const StravaCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!window._stravaCallbackHandled) {
      window._stravaCallbackHandled = true;
      handleCallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      
      console.log("🔄 Strava OAuth code:", code);

      if (errorParam) {
        throw new Error("Người dùng từ chối kết nối Strava");
      }

      if (!code) {
        throw new Error("Không tìm thấy authorization code");
      }

      setStatus("authenticating");

      // Exchange authorization code for access token
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

      console.log("📡 Token response status:", tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("❌ Strava token error:", errorText);
        throw new Error(
          `Strava authentication failed: ${tokenResponse.status}`
        );
      }

      const tokenData = await tokenResponse.json();
      console.log("✅ Token received from Strava");

      const { access_token, refresh_token, expires_at, athlete } = tokenData;

      setStatus("creating");

      // Use athlete ID as user ID
      const userId = athlete.id.toString();
      const userRef = doc(db, "users", userId);
      
      console.log("📝 User ID:", userId);

      // Check if user exists
      const userSnap = await getDoc(userRef);
      const isNewUser = !userSnap.exists();

      console.log(isNewUser ? "🆕 Creating new user" : "🔄 Updating existing user");

      // Prepare user data
      const newUserData = {
        id: userId,
        name: `${athlete.firstname} ${athlete.lastname}`,
        email: athlete.email || `${userId}@strava.user`,
        avatarUrl: athlete.profile || athlete.profile_medium || null,
        gender: athlete.sex === "M" ? "male" : athlete.sex === "F" ? "female" : null,
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
        newUserData.createdAt = Timestamp.now();
      }

      // Save to Firestore
      await setDoc(userRef, newUserData, { merge: true });
      console.log("✅ User saved to Firestore:", userId);

      // ✅ SHOW CONFIRMATION MODAL
      setUserData({
        uid: userId,
        ...newUserData,
        isNewUser: isNewUser
      });
      setStatus("success");

    } catch (error) {
      console.error("❌ Error in Strava callback:", error);
      setError(error.message);
      setStatus("error");
    }
  };

  const handleContinue = () => {
    // Save to localStorage
    localStorage.setItem("currentUser", JSON.stringify(userData));
    
    // Trigger a custom event to notify App.js
    window.dispatchEvent(new Event('userLoggedIn'));
    
    // Check if user intended to join an event
    const intendedEventId = localStorage.getItem("intendedEventId");
    if (intendedEventId) {
      localStorage.removeItem("intendedEventId");
      navigate(`/member/event/${intendedEventId}`);
    } else {
      navigate("/member");
    }
    
    // Force reload to trigger auth state change
    window.location.href = "/member";
  };

  const handleCancel = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  // Processing state
  if (status === "processing" || status === "authenticating" || status === "creating") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Đang kết nối...
            </h2>
            <p className="text-gray-600">
              {status === "authenticating" && "Đang xác thực với Strava..."}
              {status === "creating" && "Đang tạo tài khoản..."}
              {status === "processing" && "Đang xử lý..."}
            </p>
            <div className="mt-6 space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === "authenticating" || status === "creating" ? "bg-blue-600 animate-pulse" : "bg-gray-300"}`}></div>
                <span>Xác thực Strava</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === "creating" ? "bg-blue-600 animate-pulse" : "bg-gray-300"}`}></div>
                <span>Tạo/cập nhật tài khoản</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
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
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Quay về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ SUCCESS STATE - SHOW CONFIRMATION MODAL
  if (status === "success" && userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {userData.isNewUser ? "Chào mừng bạn!" : "Chào mừng trở lại!"}
            </h2>
            <p className="text-gray-600">
              {userData.isNewUser 
                ? "Tài khoản của bạn đã được tạo thành công" 
                : "Bạn đã đăng nhập thành công"}
            </p>
          </div>

          {/* User Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              {userData.avatarUrl ? (
                <img
                  src={userData.avatarUrl}
                  alt={userData.name}
                  className="w-16 h-16 rounded-full border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md">
                  {userData.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {userData.name}
                </h3>
                <p className="text-sm text-gray-600">{userData.email}</p>
                {userData.city && (
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {userData.city}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <span className="font-semibold">Đã kết nối Strava</span>
            </div>
          </div>

          {/* Info Messages */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Hoạt động chạy bộ của bạn sẽ được tự động đồng bộ từ Strava</p>
            </div>
            
            {userData.isNewUser && (
              <div className="flex items-start gap-3 text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Tham gia các sự kiện và cạnh tranh cùng cộng đồng ngay!</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-600 font-semibold transition-all shadow-md"
            >
              Tiếp tục →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StravaCallback;