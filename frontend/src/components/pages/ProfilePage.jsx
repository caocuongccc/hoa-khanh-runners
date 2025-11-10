import React, { useState, useEffect } from "react";
import {
  Activity,
  Calendar,
  MapPin,
  TrendingUp,
  Trophy,
  Users,
  Heart,
  Award,
  Target,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../services/firebase";

const ProfilePage = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState("list"); // "list", "grid", or "events"
  const [myActivities, setMyActivities] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDistance: 0,
    totalActivities: 0,
    totalEvents: 0,
    totalPoints: 0,
  });

  useEffect(() => {
    loadData();
  }, [user.uid]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load activities
      const activitiesQuery = query(
        collection(db, "trackLogs"),
        where("userId", "==", user.uid),
        orderBy("startDateTime", "desc")
      );
      const activitiesSnap = await getDocs(activitiesQuery);
      const activities = activitiesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMyActivities(activities);

      // Load events
      const participantsQuery = query(
        collection(db, "eventParticipants"),
        where("userId", "==", user.uid)
      );
      const participantsSnap = await getDocs(participantsQuery);
      
      const eventsData = [];
      for (const partDoc of participantsSnap.docs) {
        const participant = partDoc.data();
        const eventSnap = await getDocs(
          query(collection(db, "events"), where("__name__", "==", participant.eventId))
        );
        
        if (!eventSnap.empty) {
          eventsData.push({
            id: eventSnap.docs[0].id,
            ...eventSnap.docs[0].data(),
            participantData: participant,
          });
        }
      }
      setMyEvents(eventsData);

      // Calculate stats
      const totalDistance = activities.reduce(
        (sum, a) => sum + (a.distance || 0),
        0
      );
      const totalPoints = eventsData.reduce(
        (sum, e) => sum + (e.participantData?.progress?.totalPoints || 0),
        0
      );

      setStats({
        totalDistance: totalDistance.toFixed(2),
        totalActivities: activities.length,
        totalEvents: eventsData.length,
        totalPoints: totalPoints.toFixed(2),
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  // Activities Tab (3-column grid)
  const ActivitiesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          🏃 Hoạt động của tôi
        </h2>
        <p className="text-sm text-gray-600">
          Tổng: <strong>{myActivities.length}</strong> hoạt động
        </p>
      </div>

      {myActivities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có hoạt động nào</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {myActivities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Map Preview */}
              {activity.map?.summaryPolyline ? (
                <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-blue-400" />
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                  <Activity className="w-10 h-10 text-gray-400" />
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                  {activity.name}
                </h3>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Khoảng cách</p>
                    <p className="font-bold text-blue-600">
                      {activity.distance?.toFixed(2)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pace TB</p>
                    <p className="font-bold text-green-600">
                      {activity.pace?.averageFormatted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Thời gian</p>
                    <p className="font-medium text-gray-700 text-sm">
                      {activity.duration?.movingTimeFormatted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Độ cao</p>
                    <p className="font-medium text-gray-700 text-sm">
                      {activity.elevation?.total || 0}m
                    </p>
                  </div>
                </div>

                {/* Date & Type */}
                <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                  <span>{activity.date}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    {activity.type || "Run"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Events Tab
  const EventsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          🏆 Sự kiện của tôi
        </h2>
        <p className="text-sm text-gray-600">
          Tham gia: <strong>{myEvents.length}</strong> sự kiện
        </p>
      </div>

      {myEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Chưa tham gia sự kiện nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-6 p-6">
                {/* Event Image */}
                <img
                  src={
                    event.media?.coverImage ||
                    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400"
                  }
                  alt={event.name}
                  className="w-32 h-32 rounded-lg object-cover"
                />

                {/* Event Info */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {event.name}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {event.startDate} → {event.endDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {event.registration?.currentParticipants || 0} người
                    </span>
                  </div>

                  {/* Progress Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Tổng km</p>
                      <p className="text-lg font-bold text-blue-600">
                        {event.participantData?.progress?.totalDistance?.toFixed(
                          2
                        ) || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Hoạt động</p>
                      <p className="text-lg font-bold text-green-600">
                        {event.participantData?.progress?.totalActivities || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Hợp lệ</p>
                      <p className="text-lg font-bold text-purple-600">
                        {event.participantData?.progress?.validActivities || 0}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Điểm</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {event.participantData?.progress?.totalPoints?.toFixed(
                          2
                        ) || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-start gap-6">
          <img
            src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.uid}`}
            alt={user.name}
            className="w-24 h-24 rounded-full"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {user.name}
            </h1>
            <p className="text-gray-600 mb-4">{user.email}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-gray-600">Tổng km</p>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {stats.totalDistance}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-gray-600">Hoạt động</p>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {stats.totalActivities}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-purple-600" />
                  <p className="text-xs text-gray-600">Sự kiện</p>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {stats.totalEvents}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-yellow-600" />
                  <p className="text-xs text-gray-600">Tổng điểm</p>
                </div>
                <p className="text-xl font-bold text-yellow-600">
                  {stats.totalPoints}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("activities")}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "activities"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            🏃 Hoạt động của tôi
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "events"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            🏆 Sự kiện của tôi
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "activities" ? <ActivitiesTab /> : <EventsTab />}
    </div>
  );
};

export default ProfilePage;