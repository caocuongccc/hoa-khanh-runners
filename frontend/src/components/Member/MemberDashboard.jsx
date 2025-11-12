import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  MapPin,
  List,
  Map as MapIcon,
} from "lucide-react";
import { getEvents } from "../../services/firebase-service";
import { 
  isUserRegistered,
  getLeaderboard,
} from "../../services/member-service";
import { getStravaAuthUrl, refreshStravaToken } from "../../services/strava-service";
import { syncUserActivities } from "../../services/strava-sync";
import { logoutUser } from "../../services/auth-service";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import EventRegistrationModal from "./EventRegistrationModal";
import EventDashboard from "./EventDashboard";

const MemberDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState("home");
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [myActivities, setMyActivities] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, message: "" });
  const [tokenExpired, setTokenExpired] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);

  // ✅ NEW: State cho activity view mode
  const [showMyActivitiesOnly, setShowMyActivitiesOnly] = useState(false);

  const stravaConnected = user?.stravaIntegration?.isConnected || false;
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeringEvent, setRegisteringEvent] = useState(null);

  useEffect(() => {
    const init = async () => {
      await checkTokenExpiry();
      await loadEvents();
      await loadMyActivities();
    };
    init();
  }, []);

  const checkTokenExpiry = async () => {
    if (user?.stravaIntegration?.isConnected) {
      const tokenExpiry = user.stravaIntegration.tokenExpiry;
      const refreshToken = user.stravaIntegration.refreshToken;
      const now = Date.now() / 1000;
      
      if (tokenExpiry && tokenExpiry < now + 86400) {
        console.log('⚠️ Token expiring soon, attempting auto refresh...');
        
        if (refreshToken) {
          await handleAutoRefreshToken(refreshToken);
        } else {
          setTokenExpired(true);
        }
      } else {
        console.log('✅ Token still valid');
        await autoSyncIfNeeded();
      }
    }
  };

  const autoSyncIfNeeded = async () => {
    const lastSync = localStorage.getItem(`lastSync_${user.uid}`);
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    if (!lastSync || (now - parseInt(lastSync)) > ONE_HOUR) {
      console.log('🔄 Auto syncing activities (last sync > 1 hour)...');
      await handleSyncActivities();
      localStorage.setItem(`lastSync_${user.uid}`, now.toString());
    } else {
      console.log('✅ Recent sync exists, skipping auto sync');
    }
  };

  const handleAutoRefreshToken = async (refreshToken) => {
    setRefreshingToken(true);
    
    try {
      const result = await refreshStravaToken(refreshToken);
      
      if (result.success) {
        await updateDoc(doc(db, "users", user.uid), {
          "stravaIntegration.accessToken": result.data.accessToken,
          "stravaIntegration.refreshToken": result.data.refreshToken,
          "stravaIntegration.tokenExpiry": result.data.expiresAt,
        });

        user.stravaIntegration.accessToken = result.data.accessToken;
        user.stravaIntegration.refreshToken = result.data.refreshToken;
        user.stravaIntegration.tokenExpiry = result.data.expiresAt;

        setTokenExpired(false);
        console.log('✅ Token refreshed successfully');
        
        setSyncStatus({
          syncing: false,
          message: "✅ Đã tự động làm mới kết nối Strava"
        });
        
        setTimeout(() => {
          setSyncStatus({ syncing: false, message: "" });
        }, 3000);
      } else {
        console.error('❌ Failed to refresh token:', result.error);
        setTokenExpired(true);
      }
    } catch (error) {
      console.error('❌ Error auto-refreshing token:', error);
      setTokenExpired(true);
    }
    
    setRefreshingToken(false);
  };

  const loadEvents = async () => {
    setLoading(true);
    const result = await getEvents();
    if (result.success) {
      const activeEvents = result.data.sort((a, b) => {
        return new Date(b.startDate) - new Date(a.startDate);
      });
      setEvents(activeEvents);
      
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
      
      activities.sort((a, b) => {
        const dateA = a.startDateTime?.toDate ? a.startDateTime.toDate() : new Date(a.date);
        const dateB = b.startDateTime?.toDate ? b.startDateTime.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setMyActivities(activities);
      console.log("📊 Loaded activities:", activities.length);
    } catch (error) {
      console.error("Error loading activities:", error);
      setMyActivities([]);
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

    if (tokenExpired) {
      alert("Token Strava đã hết hạn. Vui lòng kết nối lại!");
      return;
    }

    setSyncStatus({ syncing: true, message: "Đang đồng bộ..." });

    let totalSaved = 0;
    let totalUpdated = 0;
    let totalActivities = 0;

    for (const event of myEvents) {
      console.log(`🔄 Syncing activities for event: ${event.name}`);
      console.log(`📅 Date range: ${event.startDate} → ${event.endDate}`);
      
      const result = await syncUserActivities(
        user,
        event.startDate,
        event.endDate
      );

      if (result.success) {
        totalSaved += result.saved;
        totalUpdated += result.updated;
        totalActivities += result.total;
      }
    }

    if (myEvents.length === 0) {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      
      console.log(`🔄 Syncing recent activities: ${startDate} → ${endDate}`);
      
      const result = await syncUserActivities(user, startDate, endDate);
      
      if (result.success) {
        totalSaved = result.saved;
        totalUpdated = result.updated;
        totalActivities = result.total;
      }
    }

    setSyncStatus({
      syncing: false,
      message: `✅ Đồng bộ thành công! ${totalSaved} mới, ${totalUpdated} cập nhật (${totalActivities} tổng)`,
    });

    await loadMyActivities();

    setTimeout(() => setSyncStatus({ syncing: false, message: "" }), 5000);
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
    navigate("/");
  };

  const handleRegister = async (event) => {
    const isRegistered = await isUserRegistered(event.id, user.uid);
    if (isRegistered) {
      alert("⚠️ Bạn đã đăng ký sự kiện này rồi!");
      return;
    }

    console.log("🎯 Opening registration modal for event:", event);
    setRegisteringEvent(event);
    setShowRegisterModal(true);
  };

  const handleEventClick = (event) => {
    console.log("🎯 Event clicked:", event.id);
    setSelectedEvent(event);
    setCurrentPage("event-dashboard");
  };

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
              onClick={() => setCurrentPage("events")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === "events"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Sự kiện</span>
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
          {refreshingToken && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 mb-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-700">
                Đang tự động làm mới kết nối Strava...
              </p>
            </div>
          )}
          
          {tokenExpired && !refreshingToken ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-orange-800">Token Strava đã hết hạn</p>
                  <p className="text-sm text-orange-600">
                    Không thể làm mới tự động. Vui lòng kết nối lại.
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
              disabled={syncStatus.syncing || tokenExpired || refreshingToken}
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
                onClick={() => handleEventClick(event)}
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
                        onClick={() => handleEventClick(event)}
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
              onClick={() => handleEventClick(event)}
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

 // Events Page
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
                        handleEventClick(event);
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

  // ✅ Activities Page - CẢI TIẾN với tabs [Tất cả | Của tôi] và [Danh sách | Bản đồ]
  const ActivitiesPage = () => {
    const [viewMode, setViewMode] = useState("list");

    // ✅ Lọc activities theo tab đã chọn
    const displayedActivities = showMyActivitiesOnly
      ? myActivities.filter(activity => 
          myEvents.some(event => {
            const activityDate = new Date(activity.date);
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            return activityDate >= startDate && activityDate <= endDate;
          })
        )
      : myActivities;

    const getMapImageUrl = (polyline, width = 400, height = 300) => {
      if (!polyline) return null;
      const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;
      
      if (GOOGLE_MAPS_KEY) {
        return `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&path=enc:${polyline}&key=${GOOGLE_MAPS_KEY}`;
      }
      
      return `https://staticmap.openstreetmap.de/staticmap.php?center=auto&zoom=14&size=${width}x${height}&path=enc:${polyline}&markers=0,0,red`;
    };

    const ActivityCard = ({ activity }) => {
      const mapUrl = getMapImageUrl(activity.map?.summaryPolyline, 600, 400);
      
      return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          {viewMode === "map" && activity.map?.summaryPolyline && (
            <div className="h-48 bg-gray-100 relative">
              {mapUrl ? (
                <img
                  src={mapUrl}
                  alt="Route"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50';
                    placeholder.innerHTML = `
                      <div class="text-center">
                        <svg class="w-12 h-12 mx-auto text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <p class="text-sm text-gray-500">${activity.distance?.toFixed(2)} km</p>
                      </div>
                    `;
                    e.target.parentElement.appendChild(placeholder);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto text-blue-400 mb-2" />
                    <p className="text-sm text-gray-500">{activity.distance?.toFixed(2)} km</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="p-4">
            <div className="flex items-start gap-3">
              {viewMode === "list" && activity.map?.summaryPolyline && (
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {getMapImageUrl(activity.map.summaryPolyline, 200, 200) ? (
                    <img
                      src={getMapImageUrl(activity.map.summaryPolyline, 200, 200)}
                      alt="Route"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50">
                      <Activity className="w-8 h-8 text-blue-300" />
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-1 truncate">
                  {activity.name}
                </h3>
                <div className="flex flex-wrap gap-2 text-sm mb-2">
                  <span className="font-bold text-blue-600">
                    {activity.distance?.toFixed(2)} km
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{activity.date}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{activity.type || "Run"}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>⏱️ {activity.duration?.movingTimeFormatted || formatDuration(activity.duration?.movingTime || 0)}</span>
                  <span>⚡ {activity.pace?.averageFormatted || formatPace(activity.pace?.average || 0)}</span>
                  <span>📈 {activity.elevation?.total || 0}m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Hoạt động</h1>
          
          <div className="flex items-center gap-3">
            {/* ✅ Tab: Tất cả / Của tôi */}
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setShowMyActivitiesOnly(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !showMyActivitiesOnly
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setShowMyActivitiesOnly(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showMyActivitiesOnly
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Của tôi
              </button>
            </div>

            {/* ✅ View Toggle: Danh sách / Bản đồ */}
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">Danh sách</span>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === "map"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Bản đồ</span>
              </button>
            </div>
            
            <button
              onClick={loadMyActivities}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>

        {activitiesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : displayedActivities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {showMyActivitiesOnly 
                ? "Chưa có hoạt động trong sự kiện đã đăng ký" 
                : "Chưa có hoạt động nào"}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Nhấn nút "Đồng bộ Strava" ở trên để tải hoạt động
            </p>
          </div>
        ) : (
          <>
            <div className={viewMode === "list" ? "space-y-3" : "grid md:grid-cols-2 lg:grid-cols-3 gap-4"}>
              {displayedActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  {showMyActivitiesOnly ? "Trong sự kiện: " : "Tổng: "}
                  <strong>{displayedActivities.length}</strong> hoạt động
                </span>
                <span>
                  Tổng km: <strong className="text-blue-600">
                    {displayedActivities.reduce((sum, a) => sum + (a.distance || 0), 0).toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Event Detail Page
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
            onBack={() => setCurrentPage("events")}
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