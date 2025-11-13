import { useState, useEffect } from "react";
import {
  Trophy,
  Users,
  Activity,
  TrendingUp,
  Calendar,
  RefreshCw,
  X,
  MapPin,
} from "lucide-react";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { syncUserActivities } from "../../services/strava-sync";
import { validateAndCalculatePoints } from "../../services/member-service";

const EventDashboard = ({ event, user, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalDistance: 0,
    totalActivities: 0,
    maleCount: 0,
    femaleCount: 0,
  });
  const [teamLeaderboard, setTeamLeaderboard] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // ✅ NEW: Tracklog viewer
  const [showActivities, setShowActivities] = useState(false);
  const [selectedMemberActivities, setSelectedMemberActivities] = useState([]);
  const [selectedMemberName, setSelectedMemberName] = useState("");

  // ✅ NEW: Real-time listener
  useEffect(() => {
    if (!event.id) return;

    // Listen to trackLogs changes
    const unsubscribeLogs = onSnapshot(
      collection(db, "trackLogs"),
      () => {
        console.log("🔔 TrackLog changed, reloading...");
        loadDashboardData();
      }
    );

    // Listen to participants changes
    const unsubscribeParticipants = onSnapshot(
      query(collection(db, "eventParticipants"), where("eventId", "==", event.id)),
      () => {
        console.log("🔔 Participant updated, reloading...");
        loadDashboardData();
      }
    );

    return () => {
      unsubscribeLogs();
      unsubscribeParticipants();
    };
  }, [event.id]);

  // ✅ Auto-sync when entering dashboard
  useEffect(() => {
    const autoSync = async () => {
      // Check last sync time
      const lastSyncKey = `lastAutoSync_${event.id}_${user.uid}`;
      const lastSync = localStorage.getItem(lastSyncKey);
      const now = Date.now();
      const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

      // Auto sync if:
      // 1. Never synced before OR
      // 2. Last sync > 5 minutes ago
      if (!lastSync || (now - parseInt(lastSync)) > SYNC_INTERVAL) {
        console.log("🔄 Auto-syncing on dashboard load...");
        
        try {
          const syncResult = await syncUserActivities(
            user,
            event.startDate,
            event.endDate
          );

          if (syncResult.success && syncResult.total > 0) {
            console.log(`✅ Auto-sync: ${syncResult.total} activities checked`);
            
            // Auto validate & calculate points
            await validateAndCalculatePoints(event.id, user.uid);
          }

          // Update last sync time
          localStorage.setItem(lastSyncKey, now.toString());
        } catch (error) {
          console.error("❌ Auto-sync error:", error);
        }
      }
    };

    autoSync();
    loadDashboardData();
  }, [event.id]);

  const handleSyncAndValidate = async () => {
    const tokenExpiry = user.stravaIntegration?.tokenExpiry;
    const now = Date.now() / 1000;
    
    if (!user.stravaIntegration?.isConnected || !user.stravaIntegration?.accessToken) {
      alert("❌ Chưa kết nối Strava. Vui lòng kết nối tài khoản Strava trước.");
      return;
    }

    if (tokenExpiry && tokenExpiry < now + 3600) {
      alert("❌ Token Strava đã hết hạn hoặc sắp hết hạn.\n\nVui lòng quay lại trang chủ và kết nối lại Strava.");
      return;
    }

    setSyncing(true);
    try {
      const syncResult = await syncUserActivities(
        user,
        event.startDate,
        event.endDate
      );

      if (!syncResult.success) {
        alert("❌ Lỗi đồng bộ: " + syncResult.error);
        setSyncing(false);
        return;
      }

      const validateResult = await validateAndCalculatePoints(event.id, user.uid);

      if (validateResult.success) {
        alert(`✅ Đồng bộ thành công!\n\n` +
          `📊 Hoạt động: ${validateResult.totalActivities}\n` +
          `✅ Hợp lệ: ${validateResult.validActivities}\n` +
          `🏃 Tổng km: ${validateResult.totalDistance.toFixed(2)}\n` +
          `⭐ Điểm: ${validateResult.totalPoints}`
        );
        
        await loadDashboardData();
      } else {
        alert("❌ Lỗi tính điểm: " + validateResult.error);
      }
    } catch (error) {
      console.error("Error syncing:", error);
      alert("❌ Lỗi: " + error.message);
    }
    setSyncing(false);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const participantsQuery = query(
        collection(db, "eventParticipants"),
        where("eventId", "==", event.id)
      );
      const participantsSnap = await getDocs(participantsQuery);
      const participants = participantsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let totalDistance = 0;
      let totalActivities = 0;
      const teamStats = {};

      const usersQuery = query(collection(db, "users"));
      const usersSnap = await getDocs(usersQuery);
      const usersMap = {};
      usersSnap.docs.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });

      let maleCount = 0;
      let femaleCount = 0;

      for (const participant of participants) {
        const userGender = usersMap[participant.userId]?.gender;
        if (userGender === "male") maleCount++;
        else if (userGender === "female") femaleCount++;

        const activitiesQuery = query(
          collection(db, "trackLogs"),
          where("userId", "==", participant.userId),
          where("date", ">=", event.startDate),
          where("date", "<=", event.endDate)
        );
        const activitiesSnap = await getDocs(activitiesQuery);
        
        let userDistance = 0;
        let userActivities = activitiesSnap.size;

        activitiesSnap.docs.forEach(doc => {
          const activity = doc.data();
          const dist = activity.distance || 0;
          userDistance += dist;
        });

        const userPoints = parseFloat(userDistance.toFixed(2));

        totalDistance += userDistance;
        totalActivities += userActivities;

        const teamId = participant.teamId;

        if (!teamStats[teamId]) {
          const team = event.teams?.find(t => t.id === teamId);
          teamStats[teamId] = {
            teamId,
            teamName: team?.name || "Unknown Team",
            totalDistance: 0,
            totalActivities: 0,
            totalPoints: 0,
            memberCount: 0,
            members: []
          };
        }

        teamStats[teamId].totalDistance += userDistance;
        teamStats[teamId].totalActivities += userActivities;
        teamStats[teamId].totalPoints += userPoints;
        teamStats[teamId].memberCount += 1;
        teamStats[teamId].members.push({
          userId: participant.userId,
          userName: participant.userName,
          distance: userDistance,
          activities: userActivities,
          points: userPoints,
          avatar: usersMap[participant.userId]?.avatarUrl || `https://i.pravatar.cc/150?u=${participant.userId}`
        });
      }

      const teamsArray = Object.values(teamStats).sort(
        (a, b) => b.totalPoints - a.totalPoints
      );

      teamsArray.forEach((team, index) => {
        team.rank = index + 1;
        team.totalDistance = parseFloat(team.totalDistance.toFixed(2));
        team.totalPoints = parseFloat(team.totalPoints.toFixed(2));
        
        team.members.sort((a, b) => b.points - a.points);
        team.members.forEach((member, idx) => {
          member.rank = idx + 1;
          member.distance = parseFloat(member.distance.toFixed(2));
          member.points = parseFloat(member.points.toFixed(2));
        });
      });

      setStats({
        totalParticipants: participants.length,
        totalDistance: totalDistance.toFixed(2),
        totalActivities,
        maleCount,
        femaleCount,
      });

      setTeamLeaderboard(teamsArray);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setLoading(false);
  };

  // ✅ NEW: Load member activities
  const handleViewMemberActivities = async (member) => {
    try {
      setSelectedMemberName(member.userName);
      
      const q = query(
        collection(db, "trackLogs"),
        where("userId", "==", member.userId),
        where("date", ">=", event.startDate),
        where("date", "<=", event.endDate)
      );
      
      const snap = await getDocs(q);
      const activities = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const dateA = a.startDateTime?.toDate ? a.startDateTime.toDate() : new Date(a.date);
        const dateB = b.startDateTime?.toDate ? b.startDateTime.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setSelectedMemberActivities(activities);
      setShowActivities(true);
    } catch (error) {
      console.error("Error loading activities:", error);
      alert("❌ Lỗi load activities: " + error.message);
    }
  };

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setTeamMembers(team.members);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  // ✅ NEW: Activities Modal
  const ActivitiesModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Hoạt động của {selectedMemberName}
          </h2>
          <button
            onClick={() => setShowActivities(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {selectedMemberActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có hoạt động nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedMemberActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {activity.map?.summaryPolyline && (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                        <MapPin className="w-8 h-8 text-blue-400" />
                      </div>
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
                      <span>⏱️ {activity.duration?.movingTimeFormatted}</span>
                      <span>⚡ {activity.pace?.averageFormatted}</span>
                      <span>📈 {activity.elevation?.total || 0}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Individual Leaderboard View
  if (selectedTeam) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedTeam(null)}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          ← Quay lại BXH Teams
        </button>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">
              #{selectedTeam.rank}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedTeam.teamName}
              </h2>
              <p className="text-gray-600">
                {selectedTeam.memberCount} thành viên
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tổng điểm</p>
              <p className="text-2xl font-bold text-blue-600">
                {selectedTeam.totalPoints}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tổng km</p>
              <p className="text-2xl font-bold text-green-600">
                {selectedTeam.totalDistance}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Hoạt động</p>
              <p className="text-2xl font-bold text-purple-600">
                {selectedTeam.totalActivities}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Bảng xếp hạng cá nhân
          </h3>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    member.rank === 1
                      ? "bg-yellow-400 text-yellow-900"
                      : member.rank === 2
                      ? "bg-gray-300 text-gray-700"
                      : member.rank === 3
                      ? "bg-orange-400 text-orange-900"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {member.rank}
                </div>

                <img
                  src={member.avatar}
                  alt={member.userName}
                  className="w-12 h-12 rounded-full"
                />

                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {member.userName}
                    {member.userId === user.uid && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        Bạn
                      </span>
                    )}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="font-medium text-blue-600">{member.distance} km</span>
                    <span>•</span>
                    <span>{member.activities} hoạt động</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {member.points}
                  </div>
                  <div className="text-xs text-gray-500">điểm</div>
                </div>

                {/* ✅ NEW: View Activities Button */}
                <button
                  onClick={() => handleViewMemberActivities(member)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Activity className="w-4 h-4" />
                  Xem
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ Activities Modal */}
        {showActivities && <ActivitiesModal />}
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        ← Quay lại
      </button>

      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {event.startDate} - {event.endDate}
              </span>
            </div>
          </div>
          <button
            onClick={handleSyncAndValidate}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? "Đang đồng bộ..." : "Đồng bộ & Tính điểm"}
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-gray-600">Tổng người chơi</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats.totalParticipants}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm text-gray-600">Tổng km đạt được</p>
          <p className="text-3xl font-bold text-green-600">
            {stats.totalDistance}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-sm text-gray-600">Tổng hoạt động</p>
          <p className="text-3xl font-bold text-purple-600">
            {stats.totalActivities}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-sm text-gray-600">Nam</p>
          <p className="text-3xl font-bold text-blue-600">
            {stats.maleCount}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-pink-400" />
          </div>
          <p className="text-sm text-gray-600">Nữ</p>
          <p className="text-3xl font-bold text-pink-600">
            {stats.femaleCount}
          </p>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900">
            Bảng xếp hạng Teams
          </h2>
        </div>

        <div className="space-y-3">
          {teamLeaderboard.map((team) => (
            <div
              key={team.teamId}
              onClick={() => handleTeamClick(team)}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  team.rank === 1
                    ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900"
                    : team.rank === 2
                    ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700"
                    : team.rank === 3
                    ? "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {team.rank}
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">
                  {team.teamName}
                </h3>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {team.memberCount} thành viên
                  </span>
                  <span className="font-medium text-blue-600">{team.totalDistance} km</span>
                  <span>{team.totalActivities} hoạt động</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {team.totalPoints}
                </div>
                <div className="text-sm text-gray-500">điểm</div>
              </div>

              <div className="text-gray-400">→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventDashboard;