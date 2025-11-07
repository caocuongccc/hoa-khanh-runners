import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Calendar,
  MapPin,
  TrendingUp,
  Heart,
  MessageCircle,
  Clock,
  Zap,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";

const FeedPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  const loadRecentActivities = async () => {
    setLoading(true);
    try {
      // Get recent 10 activities
      const q = query(
        collection(db, "trackLogs"),
        orderBy("startDateTime", "desc"),
        limit(10)
      );
      const activitiesSnap = await getDocs(q);

      // Get user info for each activity
      const activitiesData = [];
      for (const actDoc of activitiesSnap.docs) {
        const activity = actDoc.data();
        
        // Get user info
        const userDoc = await getDoc(doc(db, "users", activity.userId));
        const userData = userDoc.exists() ? userDoc.data() : null;

        activitiesData.push({
          id: actDoc.id,
          ...activity,
          user: {
            name: userData?.name || "Unknown User",
            avatar:
              userData?.avatarUrl ||
              `https://i.pravatar.cc/150?u=${activity.userId}`,
          },
        });
      }

      setActivities(activitiesData);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
    setLoading(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Hòa Khánh Runners
                </h1>
              </div>
            </div>

            <nav className="flex items-center gap-6">
              <button
                onClick={() => navigate("/")}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Trang chủ
              </button>
              <button
                onClick={() => navigate("/feed")}
                className="text-blue-600 font-semibold"
              >
                Hoạt động
              </button>
              {currentUser ? (
                <button
                  onClick={() => navigate("/member")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Đăng nhập
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ⚡ Hoạt động gần đây
          </h1>
          <p className="text-gray-600">
            Cập nhật hoạt động mới nhất từ cộng đồng
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có hoạt động nào</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* User Info */}
                <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                  <img
                    src={activity.user.avatar}
                    alt={activity.user.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">
                      {activity.user.name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(activity.startDateTime)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    {activity.type || "Run"}
                  </span>
                </div>

                {/* Activity Content */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {activity.name}
                  </h2>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {activity.distance?.toFixed(2)} km
                      </p>
                      <p className="text-xs text-gray-500">Khoảng cách</p>
                    </div>

                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {activity.duration?.movingTimeFormatted}
                      </p>
                      <p className="text-xs text-gray-500">Thời gian</p>
                    </div>

                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Zap className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {activity.pace?.averageFormatted}
                      </p>
                      <p className="text-xs text-gray-500">Pace TB</p>
                    </div>

                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Heart className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {activity.heartRate?.average || "-"}
                      </p>
                      <p className="text-xs text-gray-500">HR TB</p>
                    </div>

                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <MapPin className="w-6 h-6 text-orange-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {activity.elevation?.total || 0}m
                      </p>
                      <p className="text-xs text-gray-500">Độ cao</p>
                    </div>
                  </div>

                  {/* Map Preview */}
                  {activity.map?.summaryPolyline && (
                    <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Route map</p>
                      </div>
                    </div>
                  )}

                  {/* Interactions */}
                  <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                    <button className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors">
                      <Heart className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {activity.stravaData?.kudosCount || 0}
                      </span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {activity.stravaData?.commentCount || 0}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {!loading && activities.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={loadRecentActivities}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Tải thêm hoạt động
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedPage;