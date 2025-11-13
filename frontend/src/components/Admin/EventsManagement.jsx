import  { useState, useEffect } from "react";
import { Plus, Search, Calendar, Users, Edit2, Trash2, ChevronLeft, ChevronRight, Play, Pause, X } from "lucide-react";
import { getEvents } from "../../services/firebase-service";
import { doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import CreateEventModal from "./CreateEventModal";

const EventsManagement = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

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

    if (searchTerm) {
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  };

  // ✅ NEW: Change event status
  const handleStatusChange = async (eventId, newStatus) => {
    const statusLabels = {
      active: "Kích hoạt",
      pending: "Tạm dừng", 
      closed: "Đóng"
    };

    if (!window.confirm(`Bạn có chắc muốn ${statusLabels[newStatus]} sự kiện này?`)) return;

    try {
      await updateDoc(doc(db, "events", eventId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      alert(`✅ ${statusLabels[newStatus]} sự kiện thành công!`);
      loadEvents();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("❌ Lỗi: " + error.message);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Bạn có chắc muốn xóa sự kiện này?")) return;

    try {
      await deleteDoc(doc(db, "events", eventId));
      alert("✅ Xóa sự kiện thành công!");
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("❌ Lỗi: " + error.message);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowCreateModal(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Sự kiện</h1>
        <button
          onClick={() => {
            setEditingEvent(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo sự kiện mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid md:grid-cols-3 gap-4">
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
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="created">Đã tạo</option>
              <option value="active">Đang diễn ra</option>
              <option value="pending">Tạm dừng</option>
              <option value="closed">Đã kết thúc</option>
            </select>
          </div>
        </div>
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
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thành viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          event.media?.coverImage ||
                          "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=200"
                        }
                        alt={event.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {event.name}
                        </div>
                        {event.isPrivate && (
                          <span className="text-xs text-orange-600">
                            🔒 Private
                          </span>
                        )}
                      </div>
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
                        ? "Tạm dừng"
                        : event.status === "closed"
                        ? "Đã kết thúc"
                        : "Đã tạo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {event.startDate} → {event.endDate}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-900">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">
                        {event.registration?.currentParticipants || 0}
                      </span>
                      {event.registration?.maxParticipants && (
                        <span className="text-gray-500">
                          /{event.registration.maxParticipants}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {event.teams?.length || 0} teams
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* ✅ Status Actions */}
                      {event.status === "created" && (
                        <button
                          onClick={() => handleStatusChange(event.id, "active")}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Kích hoạt"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      {event.status === "active" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(event.id, "pending")}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                            title="Tạm dừng"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(event.id, "closed")}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                            title="Đóng sự kiện"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {event.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(event.id, "active")}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Tiếp tục"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(event.id, "closed")}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                            title="Đóng sự kiện"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Edit & Delete */}
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateEventModal
          eventData={editingEvent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
          onSuccess={() => {
            loadEvents();
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default EventsManagement;