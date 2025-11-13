import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Users,
  Trophy,
  Award
} from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getStravaAuthUrl } from "../../services/strava-service";
import { useNavigate } from "react-router-dom";

const EventDetailModal = ({ eventId, onClose, currentUser }) => {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [topRunners, setTopRunners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  const loadEventDetails = async () => {
    setLoading(true);
    try {
      // ✅ Load event - public access, no auth needed
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (!eventDoc.exists()) {
        console.error("Event not found:", eventId);
        alert("Sự kiện không tồn tại");
        onClose();
        return;
      }

      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(eventData);

      // ✅ Load participants - only if user is logged in
      if (currentUser) {
        try {
          const participantsSnap = await getDocs(
            query(
              collection(db, "eventParticipants"),
              where("eventId", "==", eventId),
              where("status", "==", "active")
            )
          );

          const participantsData = [];
          for (const pDoc of participantsSnap.docs) {
            const participant = pDoc.data();
            
            // Load user data
            try {
              const userDoc = await getDoc(doc(db, "users", participant.userId));
              if (userDoc.exists()) {
                participantsData.push({
                  ...participant,
                  userData: { id: userDoc.id, ...userDoc.data() },
                });
              }
            } catch (userError) {
              console.warn("Could not load user:", participant.userId);
              // Continue without this user's data
            }
          }

          setParticipants(participantsData);

          // Get top 10 runners
          const sorted = [...participantsData].sort(
            (a, b) =>
              (b.progress?.totalPoints || 0) - (a.progress?.totalPoints || 0)
          );
          setTopRunners(sorted.slice(0, 10));
        } catch (participantsError) {
          console.error("Error loading participants:", participantsError);
          // Continue without participants data
          setParticipants([]);
          setTopRunners([]);
        }
      } else {
        // Not logged in, show event info only
        console.log("User not logged in, showing event info only");
        setParticipants([]);
        setTopRunners([]);
      }
    } catch (error) {
      console.error("Error loading event details:", error);
      alert("Lỗi tải thông tin sự kiện: " + error.message);
      onClose();
    }
    setLoading(false);
  };

  const handleJoin = () => {
    if (!currentUser) {
      // ✅ Save intended event and redirect to Strava
      console.log("🔐 User not logged in, redirecting to Strava auth...");
      localStorage.setItem("intendedEventId", eventId);
      
      const authUrl = getStravaAuthUrl();
      console.log("🔗 Redirecting to:", authUrl);
      
      // Use window.location.href for full page redirect
      window.location.href = authUrl;
    } else {
      // User is logged in, navigate to event page
      console.log("✅ User logged in, navigating to event page");
      navigate(`/member/event/${eventId}`);
      onClose();
    }
  };

  if (loading || !event) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Cover Image */}
        <div className="relative h-64">
          <img
            src={
              event.media?.coverImage ||
              "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200"
            }
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>

          {/* Event Title */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  event.status === "active"
                    ? "bg-green-500 text-white"
                    : event.status === "pending"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {event.status === "active"
                  ? "Đang diễn ra"
                  : event.status === "pending"
                  ? "Sắp diễn ra"
                  : "Đã kết thúc"}
              </span>
              {event.isPrivate && (
                <span className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold">
                  🔒 Private
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{event.name}</h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50">
            <div className="text-center">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Thời gian</p>
              <p className="font-bold text-gray-900 text-sm">
                {event.startDate} → {event.endDate}
              </p>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Thành viên</p>
              <p className="font-bold text-gray-900">
                {participants.length} người
              </p>
            </div>
            <div className="text-center">
              <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Teams</p>
              <p className="font-bold text-gray-900">
                {event.teams?.length || 0} teams
              </p>
            </div>
            <div className="text-center">
              <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Tổng KM</p>
              <p className="font-bold text-gray-900">
                {participants
                  .reduce((sum, p) => sum + (p.progress?.totalDistance || 0), 0)
                  .toFixed(1)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-4 border-b-2 font-medium transition-colors ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Tổng quan
              </button>
              {currentUser && (
                <>
                  <button
                    onClick={() => setActiveTab("leaderboard")}
                    className={`py-4 border-b-2 font-medium transition-colors ${
                      activeTab === "leaderboard"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Bảng xếp hạng
                  </button>
                  <button
                    onClick={() => setActiveTab("participants")}
                    className={`py-4 border-b-2 font-medium transition-colors ${
                      activeTab === "participants"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Thành viên
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Description */}
                {event.description && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      Mô tả sự kiện
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Rules */}
                {event.rules && event.rules.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      📋 Thể lệ
                    </h3>
                    <ul className="space-y-2">
                      {event.rules.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">
                            {idx + 1}.
                          </span>
                          <span className="text-gray-700">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rewards */}
                {event.rewards && event.rewards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      🏆 Phần thưởng
                    </h3>
                    <div className="space-y-2">
                      {event.rewards.map((reward, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-900">
                            {reward.rank}
                          </span>
                          <span className="text-gray-700">
                            {reward.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Login prompt if not logged in */}
                {!currentUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-center">
                      🔐 Đăng nhập để xem bảng xếp hạng và danh sách thành viên
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "leaderboard" && currentUser && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  🏆 Top 10 Runners
                </h3>
                {topRunners.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có dữ liệu xếp hạng
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topRunners.map((runner, idx) => (
                      <div
                        key={runner.userId}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div
                          className={`text-2xl font-bold w-10 text-center ${
                            idx === 0
                              ? "text-yellow-500"
                              : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                              ? "text-orange-600"
                              : "text-gray-600"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <img
                          src={
                            runner.userData?.avatarUrl ||
                            `https://i.pravatar.cc/150?u=${runner.userId}`
                          }
                          alt={runner.userData?.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">
                            {runner.userData?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {runner.progress?.totalActivities || 0} hoạt động
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {runner.progress?.totalDistance?.toFixed(1) || 0}
                          </p>
                          <p className="text-sm text-gray-600">km</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "participants" && currentUser && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  👥 Danh sách thành viên ({participants.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {participants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
                    >
                      <img
                        src={
                          participant.userData?.avatarUrl ||
                          `https://i.pravatar.cc/150?u=${participant.userId}`
                        }
                        alt={participant.userData?.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">
                          {participant.userData?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {participant.progress?.totalDistance?.toFixed(1) || 0}{" "}
                          km • {participant.progress?.totalActivities || 0}{" "}
                          hoạt động
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Join Button */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <button
            onClick={handleJoin}
            disabled={event.status === "closed"}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-600 font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {event.status === "closed" 
              ? "Sự kiện đã kết thúc" 
              : currentUser
              ? "Tham gia sự kiện ngay"
              : "Đăng nhập Strava để tham gia"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;