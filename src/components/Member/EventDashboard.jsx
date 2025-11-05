import React, { useState, useEffect } from "react";
import {
  Trophy,
  Users,
  Activity,
  TrendingUp,
  Award,
  Target,
  Calendar,
  Zap,
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

const EventDashboard = ({ event, user, onBack }) => {
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadDashboardData();
  }, [event.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get all participants for this event
      const participantsQuery = query(
        collection(db, "eventParticipants"),
        where("eventId", "==", event.id)
      );
      const participantsSnap = await getDocs(participantsQuery);
      const participants = participantsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate overall stats
      let totalDistance = 0;
      let totalActivities = 0;
      const teamStats = {};

      // Get user details for gender count
      const usersQuery = query(collection(db, "users"));
      const usersSnap = await getDocs(usersQuery);
      const usersMap = {};
      usersSnap.docs.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });

      let maleCount = 0;
      let femaleCount = 0;

      participants.forEach(participant => {
        const distance = participant.progress?.totalDistance || 0;
        const activities = participant.progress?.totalActivities || 0;
        const points = participant.progress?.totalPoints || 0;
        const teamId = participant.teamId;

        totalDistance += distance;
        totalActivities += activities;

        // Count gender
        const userGender = usersMap[participant.userId]?.gender;
        if (userGender === "male") maleCount++;
        else if (userGender === "female") femaleCount++;

        // Aggregate by team
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

        teamStats[teamId].totalDistance += distance;
        teamStats[teamId].totalActivities += activities;
        teamStats[teamId].totalPoints += points;
        teamStats[teamId].memberCount += 1;
        teamStats[teamId].members.push({
          userId: participant.userId,
          userName: participant.userName,
          distance,
          activities,
          points,
          avatar: usersMap[participant.userId]?.avatarUrl || `https://i.pravatar.cc/150?u=${participant.userId}`
        });
      });

      // Convert to array and sort
      const teamsArray = Object.values(teamStats).sort(
        (a, b) => b.totalPoints - a.totalPoints
      );

      // Add rank
      teamsArray.forEach((team, index) => {
        team.rank = index + 1;
        // Sort members within team
        team.members.sort((a, b) => b.points - a.points);
        team.members.forEach((member, idx) => {
          member.rank = idx + 1;
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

          {/* Team Stats */}
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
                {selectedTeam.totalDistance.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Hoạt động</p>
              <p className="text-2xl font-bold text-purple-600">
                {selectedTeam.totalActivities}
              </p>
            </div>
          </div>

          {/* Members Leaderboard */}
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
                    <span>{member.distance.toFixed(2)} km</span>
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
              </div>
            ))}
          </div>
        </div>
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
        <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
        <div className="flex items-center gap-4 text-sm opacity-90">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {event.startDate} - {event.endDate}
          </span>
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
                  <span>{team.totalDistance.toFixed(2)} km</span>
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