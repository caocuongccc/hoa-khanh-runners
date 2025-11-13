import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Trophy,
  Activity,
  TrendingUp,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getStravaAuthUrl } from "../../services/strava-service";
import EventDetailModal from "./EventDetailModal";

const HomePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalParticipants: 0,
    totalActivities: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
    // Check if user is logged in
    const user = localStorage.getItem("currentUser");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load active events
      const eventsSnap = await getDocs(collection(db, "events"));
      const eventsData = eventsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter active/pending events
      const activeEvents = eventsData
        .filter((e) => e.status === "active" || e.status === "pending")
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

      setEvents(activeEvents);

      // Calculate stats
      const participantsSnap = await getDocs(
        collection(db, "eventParticipants")
      );
      const trackLogsSnap = await getDocs(collection(db, "trackLogs"));

      setStats({
        totalEvents: activeEvents.length,
        totalParticipants: participantsSnap.size,
        totalActivities: trackLogsSnap.size,
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleEventClick = (eventId) => {
    // ✅ Always show detail modal first
    setSelectedEventId(eventId);
  };

  const handleLogin = () => {
    const authUrl = getStravaAuthUrl();
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Hòa Khánh Runners
                </h1>
                <p className="text-xs text-gray-500">Cộng đồng chạy bộ Đà Nẵng</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => navigate("/")}
                className="text-blue-600 font-medium"
              >
                Trang chủ
              </button>
              <button
                onClick={() => navigate("/feed")}
                className="text-gray-600 hover:text-gray-900"
              >
                Hoạt động
              </button>
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Đăng nhập
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Chạy cùng nhau, mạnh mẽ hơn
            </h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8">
              Tham gia cộng đồng chạy bộ năng động nhất Đà Nẵng
            </p>
            <button
              onClick={handleLogin}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2 shadow-lg"
            >
              <Activity className="w-6 h-6" />
              Kết nối Strava & Tham gia ngay
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 -mt-12">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalEvents}
                </p>
                <p className="text-sm text-gray-600">Sự kiện đang diễn ra</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalParticipants}
                </p>
                <p className="text-sm text-gray-600">Thành viên tham gia</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalActivities}
                </p>
                <p className="text-sm text-gray-600">Hoạt động ghi nhận</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Sự kiện đang diễn ra
          </h2>
          <p className="text-gray-600 text-lg">
            Tham gia các thử thách và cạnh tranh cùng cộng đồng
          </p>
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
          <div className="grid md:grid-cols-2 gap-8">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all cursor-pointer group"
              >
                <div className="relative h-64">
                  <img
                    src={
                      event.media?.coverImage ||
                      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800"
                    }
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold ${
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

                  {/* Event Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {event.name}
                    </h3>
                  </div>
                </div>

                <div className="p-6">
                  {/* Description */}
                  {event.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {/* Event Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">
                        {event.startDate} → {event.endDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Users className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium">
                        {event.registration?.currentParticipants || 0} người tham gia
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium">
                        {event.teams?.length || 0} teams
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-600 font-semibold transition-all group-hover:shadow-lg">
                    Xem chi tiết & Tham gia
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu?</h2>
          <p className="text-xl mb-8 opacity-90">
            Kết nối Strava và tham gia cộng đồng chạy bộ ngay hôm nay
          </p>
          <button
            onClick={handleLogin}
            className="bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-orange-50 transition-colors inline-flex items-center gap-2 text-lg shadow-lg"
          >
            <Activity className="w-6 h-6" />
            Kết nối với Strava
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2025 Hòa Khánh Runners. Made with ❤️ in Da Nang
            </p>
          </div>
        </div>
      </footer>

      {/* Event Detail Modal */}
      {selectedEventId && (
        <EventDetailModal
          eventId={selectedEventId}
          currentUser={currentUser}
          onClose={() => setSelectedEventId(null)}
        />
      )}
    </div>
  );
};

export default HomePage;