import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Trash2, Activity, Calendar, Users } from "lucide-react";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase";

const TrackLogsManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState({});
  const [expandedDates, setExpandedDates] = useState({});
  const [expandedTeams, setExpandedTeams] = useState({});
  const [expandedMembers, setExpandedMembers] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all events
      const eventsSnap = await getDocs(collection(db, "events"));
      const eventsData = [];

      for (const eventDoc of eventsSnap.docs) {
        const event = { id: eventDoc.id, ...eventDoc.data() };

        // Get all tracklogs for this event
        const trackLogsQuery = query(
          collection(db, "trackLogs"),
          where("date", ">=", event.startDate),
          where("date", "<=", event.endDate)
        );
        const trackLogsSnap = await getDocs(trackLogsQuery);

        // Get participants to map userId → teamId
        const participantsQuery = query(
          collection(db, "eventParticipants"),
          where("eventId", "==", event.id)
        );
        const participantsSnap = await getDocs(participantsQuery);
        const userTeamMap = {};
        participantsSnap.docs.forEach(doc => {
          const p = doc.data();
          userTeamMap[p.userId] = {
            teamId: p.teamId,
            userName: p.userName,
          };
        });

        // Group tracklogs by date → team → member
        const dateMap = {};
        trackLogsSnap.docs.forEach(logDoc => {
          const log = { id: logDoc.id, ...logDoc.data() };
          const userInfo = userTeamMap[log.userId];
          
          if (!userInfo) return; // Skip if user not in this event

          const date = log.date;
          const teamId = userInfo.teamId;
          const userId = log.userId;

          if (!dateMap[date]) dateMap[date] = {};
          if (!dateMap[date][teamId]) dateMap[date][teamId] = {};
          if (!dateMap[date][teamId][userId]) {
            dateMap[date][teamId][userId] = {
              userName: userInfo.userName,
              logs: [],
            };
          }
          dateMap[date][teamId][userId].logs.push(log);
        });

        eventsData.push({
          ...event,
          trackLogsData: dateMap,
        });
      }

      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const toggleExpand = (type, id, setState, state) => {
    setState({ ...state, [id]: !state[id] });
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Bạn có chắc muốn xóa tracklog này?")) return;

    try {
      await deleteDoc(doc(db, "trackLogs", logId));
      alert("✅ Đã xóa tracklog!");
      loadData();
    } catch (error) {
      console.error("Error deleting log:", error);
      alert("❌ Lỗi: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Quản lý TrackLogs</h1>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có dữ liệu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const dateCount = Object.keys(event.trackLogsData || {}).length;
            
            return (
              <div key={event.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Event Header */}
                <div
                  onClick={() =>
                    toggleExpand("event", event.id, setExpandedEvents, expandedEvents)
                  }
                  className="p-4 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {expandedEvents[event.id] ? (
                      <ChevronDown className="w-5 h-5 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-blue-600" />
                    )}
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-bold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-600">
                        {event.startDate} → {event.endDate}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm font-semibold">
                    {dateCount} ngày có hoạt động
                  </span>
                </div>

                {/* Dates */}
                {expandedEvents[event.id] && (
                  <div className="p-4 space-y-2">
                    {Object.entries(event.trackLogsData || {}).map(([date, teams]) => {
                      const teamCount = Object.keys(teams).length;
                      const dateKey = `${event.id}-${date}`;

                      return (
                        <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Date Header */}
                          <div
                            onClick={() =>
                              toggleExpand("date", dateKey, setExpandedDates, expandedDates)
                            }
                            className="p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {expandedDates[dateKey] ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                              <span className="font-semibold text-gray-900">📅 {date}</span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {teamCount} teams
                            </span>
                          </div>

                          {/* Teams */}
                          {expandedDates[dateKey] && (
                            <div className="p-3 space-y-2">
                              {Object.entries(teams).map(([teamId, members]) => {
                                const team = event.teams?.find(t => t.id === teamId);
                                const memberCount = Object.keys(members).length;
                                const teamKey = `${dateKey}-${teamId}`;

                                return (
                                  <div key={teamId} className="border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Team Header */}
                                    <div
                                      onClick={() =>
                                        toggleExpand("team", teamKey, setExpandedTeams, expandedTeams)
                                      }
                                      className="p-2 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        {expandedTeams[teamKey] ? (
                                          <ChevronDown className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-green-600" />
                                        )}
                                        <Users className="w-4 h-4 text-green-600" />
                                        <span className="font-medium text-gray-900">
                                          {team?.name || teamId}
                                        </span>
                                      </div>
                                      <span className="text-sm text-gray-600">
                                        {memberCount} members
                                      </span>
                                    </div>

                                    {/* Members */}
                                    {expandedTeams[teamKey] && (
                                      <div className="p-2 space-y-1">
                                        {Object.entries(members).map(([userId, memberData]) => {
                                          const logsCount = memberData.logs.length;
                                          const memberKey = `${teamKey}-${userId}`;

                                          return (
                                            <div key={userId} className="border border-gray-200 rounded-lg overflow-hidden">
                                              {/* Member Header */}
                                              <div
                                                onClick={() =>
                                                  toggleExpand("member", memberKey, setExpandedMembers, expandedMembers)
                                                }
                                                className="p-2 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors flex items-center justify-between"
                                              >
                                                <div className="flex items-center gap-2">
                                                  {expandedMembers[memberKey] ? (
                                                    <ChevronDown className="w-4 h-4 text-purple-600" />
                                                  ) : (
                                                    <ChevronRight className="w-4 h-4 text-purple-600" />
                                                  )}
                                                  <span className="text-sm font-medium text-gray-900">
                                                    👤 {memberData.userName}
                                                  </span>
                                                </div>
                                                <span className="text-xs text-gray-600">
                                                  {logsCount} activities
                                                </span>
                                              </div>

                                              {/* Activities */}
                                              {expandedMembers[memberKey] && (
                                                <div className="p-2 space-y-1">
                                                  {memberData.logs.map((log) => (
                                                    <div
                                                      key={log.id}
                                                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                                    >
                                                      <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                          {log.name}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                          {log.distance?.toFixed(2)} km • {log.pace?.averageFormatted}
                                                        </p>
                                                      </div>
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleDeleteLog(log.id);
                                                        }}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Xóa"
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrackLogsManagement;