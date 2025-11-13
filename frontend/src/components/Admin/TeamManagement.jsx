import { useState, useEffect } from "react";
import { Search, Users, ChevronLeft, ChevronRight, UserX } from "lucide-react";
import { getEvents } from "../../services/firebase-service";
import { doc, updateDoc, getDoc, deleteDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

const TeamManagement = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, statusFilter]);

  const loadEvents = async () => {
    setLoading(true);
    const result = await getEvents();
    if (result.success) {
      setEvents(result.data);
    }
    setLoading(false);
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvents = filteredEvents.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRemoveUser = async (userId, userName, teamId) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${userName} khỏi team này?`)) {
      return;
    }

    try {
      const eventRef = doc(db, "events", selectedEvent.id);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        alert("❌ Event không tồn tại");
        return;
      }

      const eventData = eventSnap.data();
      const teams = eventData.teams || [];

      // Update team: remove user from members, decrease currentMembers
      const updatedTeams = teams.map(team => {
        if (team.id === teamId) {
          return {
            ...team,
            currentMembers: Math.max(0, (team.currentMembers || 0) - 1),
            members: (team.members || []).filter(m => m.userId !== userId)
          };
        }
        return team;
      });

      // Update event
      await updateDoc(eventRef, {
        teams: updatedTeams,
        "registration.currentParticipants": Math.max(0, (eventData.registration?.currentParticipants || 0) - 1)
      });

      // Delete participant record
      const participantQuery = query(
        collection(db, "eventParticipants"),
        where("eventId", "==", selectedEvent.id),
        where("userId", "==", userId)
      );
      const participantSnap = await getDocs(participantQuery);
      
      if (!participantSnap.empty) {
        await deleteDoc(participantSnap.docs[0].ref);
      }

      alert("✅ Đã xóa thành viên khỏi team!");
      
      // Reload data
      const result = await getEvents();
      if (result.success) {
        const updatedEvent = result.data.find(e => e.id === selectedEvent.id);
        setSelectedEvent(updatedEvent);
        setEvents(result.data);
      }
    } catch (error) {
      console.error("Error removing user:", error);
      alert("❌ Lỗi: " + error.message);
    }
  };

  // Event List View
  if (!selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Teams</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sự kiện..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="created">Đã tạo</option>
                <option value="active">Đang diễn ra</option>
                <option value="pending">Sắp diễn ra</option>
                <option value="closed">Đã kết thúc</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Tìm thấy <strong>{filteredEvents.length}</strong> sự kiện
          </div>
        </div>

        {/* Events Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không tìm thấy sự kiện nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sự kiện
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Số Teams
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tổng thành viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentEvents.map((event) => {
                  const totalMembers = event.teams?.reduce(
                    (sum, t) => sum + (t.currentMembers || 0),
                    0
                  ) || 0;
                  const totalCapacity = event.teams?.reduce(
                    (sum, t) => sum + (t.capacity || 0),
                    0
                  ) || 0;

                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {event.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            event.status === "active"
                              ? "bg-green-100 text-green-800"
                              : event.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : event.status === "closed"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {event.status === "active"
                            ? "Đang diễn ra"
                            : event.status === "pending"
                            ? "Sắp diễn ra"
                            : event.status === "closed"
                            ? "Đã kết thúc"
                            : "Đã tạo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {event.teams?.length || 0} teams
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium">
                          {totalMembers}/{totalCapacity}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                totalCapacity > 0
                                  ? (totalMembers / totalCapacity) * 100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {event.startDate} → {event.endDate}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Trang {currentPage} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 border rounded-lg ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Team Detail View
  return (
    <div className="space-y-6">
      <button
        onClick={() => setSelectedEvent(null)}
        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        ← Quay lại
      </button>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {selectedEvent.name}
        </h2>
        <div className="flex gap-4 text-sm text-gray-600 mb-6">
          <span>
            {selectedEvent.startDate} - {selectedEvent.endDate}
          </span>
          <span>•</span>
          <span>{selectedEvent.teams?.length || 0} teams</span>
          <span>•</span>
          <span>
            {selectedEvent.teams?.reduce((sum, t) => sum + (t.currentMembers || 0), 0)} thành viên
          </span>
        </div>

        {/* Teams Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedEvent.teams?.map((team) => (
            <div
              key={team.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{team.name}</h3>
                <span className="text-sm text-gray-600">
                  {team.currentMembers || 0}/{team.capacity}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full ${
                    (team.currentMembers || 0) >= team.capacity
                      ? "bg-red-500"
                      : "bg-blue-600"
                  }`}
                  style={{
                    width: `${
                      ((team.currentMembers || 0) / team.capacity) * 100
                    }%`,
                  }}
                ></div>
              </div>

              {/* Members list */}
              {team.members && team.members.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 mb-2">Thành viên:</p>
                  {team.members.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-sm text-gray-700 bg-white p-2 rounded hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{member.userName}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(member.userId, member.userName, team.id)}
                        className="flex-shrink-0 p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Xóa khỏi team"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Chưa có thành viên
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;