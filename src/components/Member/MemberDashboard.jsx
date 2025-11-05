import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Trophy,
  RefreshCw,
  Link2,
  Check,
  LogOut,
  Activity,
  Home,
  ChevronRight,
  Award,
  TrendingUp,
  Target,
} from "lucide-react";
import { getEvents } from "../../services/firebase-service";
import { 
  isUserRegistered,
  getLeaderboard,
} from "../../services/member-service";
import { getStravaAuthUrl } from "../../services/strava-service";
import { syncUserActivities } from "../../services/strava-sync";
import { logoutUser } from "../../services/auth-service";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import EventRegistrationModal from "./EventRegistrationModal";
import EventDashboard from "./EventDashboard";

const MemberDashboard = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState("home");
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [myActivities, setMyActivities] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, message: "" });
  const [tokenExpired, setTokenExpired] = useState(false);

  const stravaConnected = user?.stravaIntegration?.isConnected || false;
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeringEvent, setRegisteringEvent] = useState(null);

  useEffect(() => {
    loadEvents();
    loadMyActivities();
    checkTokenExpiry();
  }, []);

  const checkTokenExpiry = () => {
    if (user?.stravaIntegration?.isConnected) {
      const tokenExpiry = user.stravaIntegration.tokenExpiry;
      const now = Date.now() / 1000;
      
      // Check if token expired or will expire in next hour
      if (tokenExpiry && tokenExpiry < now + 3600) {
        setTokenExpired(true);
      }
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    const result = await getEvents();
    if (result.success) {
      const activeEvents = result.data.sort((a, b) => {
        return new Date(b.startDate) - new Date(a.startDate);
      });
      setEvents(activeEvents);
      
      // Check which events user has registered
      const registeredEvents = [];
      for (const event of activeEvents) {
        const isRegistered = await isUserRegistered(event.id, user.uid);
        if (isRegistered) {
          registeredEvents.push(event);
        }
      }
      setMyEvents(registeredEvents);
    }
    setLoading(false);
  };

  const loadMyActivities = async () => {
    setActivitiesLoading(true);
    try {
      const q = query(
        collection(db, "trackLogs"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by date descending
      activities.sort((a, b) => {
        const dateA = a.startDateTime?.toDate ? a.startDateTime.toDate() : new Date(a.date);
        const dateB = b.startDateTime?.toDate ? b.startDateTime.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setMyActivities(activities);
      console.log("📊 Loaded activities:", activities.length);
    } catch (error) {
      console.error("Error loading activities:", error);
      setMyActivities([]); // ← Set empty array on error
    }
    setActivitiesLoading(false);
  };

  const handleConnectStrava = () => {
    const authUrl = getStravaAuthUrl();
    window.location.href = authUrl;
  };

  const handleSyncActivities = async () => {
    if (!stravaConnected) {
      alert("Vui lòng kết nối Strava trước!");
      return;
    }

    setSyncStatus({ syncing: true, message: "Đang đồng bộ..." });

    const result = await syncUserActivities(
      user,
      "2024-01-01",
      new Date().toISOString().split("T")[0]
    );

    if (result.success) {
      setSyncStatus({
        syncing: false,
        message: `✅ Đồng bộ thành công ${result.saved}/${result.total} hoạt động!`,
      });
    } else {
      setSyncStatus({
        syncing: false,
        message: `❌ Lỗi: ${result.error}`,
      });
    }

    setTimeout(() => setSyncStatus({ syncing: false, message: "" }), 5000);
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const handleRegister = async (event) => {
    // Check if already registered
    const isRegistered = await isUserRegistered(event.id, user.uid);
    if (isRegistered) {
      alert("⚠️ Bạn đã đăng ký sự kiện này rồi!");
      return;
    }

    console.log("🎯 Opening registration modal for event:", event);
    setRegisteringEvent(event);
    setShowRegisterModal(true);
  };

  // Helper functions - MUST BE BEFORE USING THEM
  const formatPace = (seconds) => {
    if (!seconds || seconds === 0) return "0:00/km";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}/km`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Header Component
  const Header = () => (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setCurrentPage("home")}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Hòa Khánh Runners
              </h1>
              <p className="text-xs text-gray-500">Member Dashboard</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setCurrentPage("home")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === "home"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Trang chủ</span>
            </button>
            <button
              onClick={() => setCurrentPage("my-events")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === "my-events"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Sự kiện của tôi</span>
            </button>
            <button
              onClick={() => setCurrentPage("activities")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === "activities"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium">Hoạt động</span>
            </button>
            <button
              onClick={() => setCurrentPage("events")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === "events"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Khám phá</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-gray-700">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  // Strava Connection Card
  const StravaConnectCard = () => (
    <div className="mb-6">
      {stravaConnected ? (
        <>
          {tokenExpired ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-orange-800">Token Strava đã hết hạn</p>
                  <p className="text-sm text-orange-600">
                    Vui lòng kết nối lại để tiếp tục đồng bộ hoạt động
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnectStrava}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Kết nối lại
              </button>
            </div>
          ) : null}
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Đã kết nối Strava</p>
                <p className="text-sm text-green-600">
                  Hoạt động sẽ được tự động đồng bộ
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncActivities}
              disabled={syncStatus.syncing || tokenExpired}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${syncStatus.syncing ? "animate-spin" : ""}`}
              />
              {syncStatus.syncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Link2 className="w-8 h-8 text-orange-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">
                Kết nối với Strava
              </h3>
              <p className="text-sm text-orange-700 mb-4">
                Kết nối tài khoản Strava để tự động đồng bộ hoạt động chạy bộ và
                tham gia sự kiện
              </p>
              <button
                onClick={handleConnectStrava}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Kết nối ngay
              </button>
            </div>
          </div>
        </div>
      )}
      {syncStatus.message && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">{syncStatus.message}</p>
        </div>
      )}
    </div>
  );

  // Home Page
  const HomePage = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-green-600 to-green-400 rounded-2xl p-8 md:p-12 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Chào mừng, {user.name}!
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-6">
            Tham gia challenges và theo dõi tiến độ của bạn
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
              <p className="text-sm opacity-90">Sự kiện tham gia</p>
              <p className="text-2xl font-bold">{myEvents.length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
              <p className="text-sm opacity-90">Sự kiện có sẵn</p>
              <p className="text-2xl font-bold">{events.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Events Section */}
      {myEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Sự kiện của tôi
            </h2>
            <button
              onClick={() => setCurrentPage("my-events")}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              Xem tất cả
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {myEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedEvent(event);
                  setCurrentPage("event-dashboard");
                }}
              >
                <div className="relative h-48">
                  <img
                    src={
                      event.media?.coverImage ||
                      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800"
                    }
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
                      Đã tham gia
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                    {event.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {event.startDate}
                    </span>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Xem dashboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Events */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Sự kiện có sẵn
          </h2>
          <button
            onClick={() => setCurrentPage("events")}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            Xem tất cả
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có sự kiện nào</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {events.slice(0, 3).map((event) => {
              const isRegistered = myEvents.some(e => e.id === event.id);
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div
                    className="relative h-48 cursor-pointer"
                    onClick={() => {
                      setSelectedEvent(event);
                      setCurrentPage("event-detail");
                    }}
                  >
                    <img
                      src={
                        event.media?.coverImage ||
                        "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800"
                      }
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          event.status === "active"
                            ? "bg-green-500 text-white"
                            : "bg-yellow-500 text-white"
                        }`}
                      >
                        {event.status === "active"
                          ? "Đang diễn ra"
                          : "Sắp diễn ra"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {event.startDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.registration?.currentParticipants || 0}
                      </span>
                    </div>
                    {isRegistered ? (
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setCurrentPage("event-dashboard");
                        }}
                        className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
                      >
                        Xem dashboard
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegister(event);
                        }}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                      >
                        Đăng ký tham gia
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // My Events Page
  const MyEventsPage = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Sự kiện của tôi</h1>

      {myEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            Bạn chưa tham gia sự kiện nào
          </p>
          <button
            onClick={() => setCurrentPage("events")}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Khám phá sự kiện →
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedEvent(event);
                setCurrentPage("event-dashboard");
              }}
            >
              <div className="relative h-48">
                <img
                  src={
                    event.media?.coverImage ||
                    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800"
                  }
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-3 line-clamp-2">
                  {event.name}
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {event.startDate} - {event.endDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>
                      {event.registration?.currentParticipants || 0} người tham gia
                    </span>
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Xem dashboard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Events Page (same as before but with registered check)
  const EventsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tất cả sự kiện</h1>
        <button
          onClick={loadEvents}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isRegistered = myEvents.some(e => e.id === event.id);
            return (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div
                  className="relative h-48 cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event);
                    setCurrentPage("event-detail");
                  }}
                >
                  <img
                    src={
                      event.media?.coverImage ||
                      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800"
                    }
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-3 line-clamp-2">
                    {event.name}
                  </h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {event.startDate} - {event.endDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {event.registration?.currentParticipants || 0} người tham gia
                      </span>
                    </div>
                  </div>
                  {isRegistered ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        setCurrentPage("event-dashboard");
                      }}
                      className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
                    >
                      Xem dashboard
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegister(event);
                      }}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Đăng ký tham gia
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Activities Page - MOVED HERE BEFORE EventDetailPage
  const ActivitiesPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Hoạt động của tôi</h1>
        <button
          onClick={loadMyActivities}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {activitiesLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : myActivities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Chưa có hoạt động nào</p>
          <p className="text-sm text-gray-400 mb-4">
            Nhấn nút "Đồng bộ Strava" ở trên để tải hoạt động
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Khoảng cách
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pace
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Độ cao
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {activity.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {activity.type || "Run"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {activity.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {activity.distance?.toFixed(2)} km
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {activity.duration?.movingTimeFormatted || 
                        formatDuration(activity.duration?.movingTime || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {activity.pace?.averageFormatted || 
                        formatPace(activity.pace?.average || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {activity.elevation?.total || 0}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Tổng: <strong>{myActivities.length}</strong> hoạt động</span>
              <span>
                Tổng km: <strong className="text-blue-600">
                  {myActivities.reduce((sum, a) => sum + (a.distance || 0), 0).toFixed(2)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Event Detail Page (simplified, just show info)
  const EventDetailPage = () => {
    if (!selectedEvent) return null;
    const isRegistered = myEvents.some(e => e.id === selectedEvent.id);

    return (
      <div className="space-y-6">
        <button
          onClick={() => setCurrentPage("events")}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          ← Quay lại
        </button>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="relative h-96">
            <img
              src={
                selectedEvent.media?.coverImage ||
                "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800"
              }
              alt={selectedEvent.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h1 className="text-4xl font-bold mb-4">{selectedEvent.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  {selectedEvent.startDate} - {selectedEvent.endDate}
                </span>
                <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Users className="w-4 h-4" />
                  {selectedEvent.registration?.currentParticipants || 0} người tham gia
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Giới thiệu
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {selectedEvent.description || "Chưa có mô tả chi tiết"}
              </p>
            </div>
          </div>

          <div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl shadow-md p-6 text-white">
              <h3 className="text-xl font-bold mb-4">
                {isRegistered ? "Đã tham gia!" : "Tham gia ngay!"}
              </h3>
              <p className="text-sm opacity-90 mb-4">
                {isRegistered
                  ? "Bạn đã đăng ký sự kiện này. Xem dashboard để theo dõi tiến độ!"
                  : "Kết nối Strava và bắt đầu challenge cùng cộng đồng"}
              </p>
              {isRegistered ? (
                <button
                  onClick={() => {
                    setCurrentPage("event-dashboard");
                  }}
                  className="w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
                >
                  Xem dashboard
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(selectedEvent)}
                  className="w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
                >
                  Đăng ký tham gia
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <StravaConnectCard />
        {currentPage === "home" && <HomePage />}
        {currentPage === "my-events" && <MyEventsPage />}
        {currentPage === "activities" && <ActivitiesPage />}
        {currentPage === "events" && <EventsPage />}
        {currentPage === "event-detail" && <EventDetailPage />}
        {currentPage === "event-dashboard" && selectedEvent && (
          <EventDashboard
            event={selectedEvent}
            user={user}
            onBack={() => setCurrentPage("my-events")}
          />
        )}
      </main>

      {showRegisterModal && registeringEvent && (
        <EventRegistrationModal
          event={registeringEvent}
          user={user}
          onClose={() => {
            setShowRegisterModal(false);
            setRegisteringEvent(null);
          }}
          onSuccess={() => {
            loadEvents();
            setShowRegisterModal(false);
            setRegisteringEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default MemberDashboard;