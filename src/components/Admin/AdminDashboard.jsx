import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Users,
  Settings,
  LogOut,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  X,
} from "lucide-react";
import {
  getEvents,
  createEvent,
  getRules,
  getRuleGroups,
} from "../../services/firebase-service";
import { logoutUser } from "../../services/auth-service";
import CreateEventModal from "./CreateEventModal";
import CreateRuleModal from "./CreateRuleModal";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../../services/firebase";

const AdminDashboard = ({ user, onLogout }) => {
  const [currentTab, setCurrentTab] = useState("events");
  const [events, setEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [ruleGroups, setRuleGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [error, setError] = useState("");

  const [selectedEventForTeams, setSelectedEventForTeams] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [eventsResult, rulesResult, groupsResult] = await Promise.all([
        getEvents(),
        getRules(),
        getRuleGroups(),
      ]);

      console.log("Events result:", eventsResult);
      console.log("Rules result:", rulesResult);
      console.log("Groups result:", groupsResult);

      if (eventsResult.success) {
        setEvents(eventsResult.data || []);
      } else {
        console.error("Events error:", eventsResult.error);
      }

      if (rulesResult.success) {
        setRules(rulesResult.data || []);
      } else {
        console.error("Rules error:", rulesResult.error);
      }

      if (groupsResult.success) {
        setRuleGroups(groupsResult.data || []);
      } else {
        console.error("Groups error:", groupsResult.error);
      }

      if (rulesResult.data?.length === 0 && groupsResult.data?.length === 0) {
        setError("Chưa có dữ liệu Rules. Vui lòng chạy Seed Data trước.");
      }
    } catch (err) {
      console.error("Load data error:", err);
      setError("Lỗi khi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (
      !window.confirm(
        "⚠️ Bạn có chắc muốn xóa sự kiện này?\n\nHành động này không thể hoàn tác!"
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "events", eventId));
      alert("✅ Đã xóa sự kiện thành công!");
      loadData();
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowCreateEvent(true);
  };

  const handleChangeEventStatus = async (eventId, newStatus) => {
    const statusLabels = {
      created: "Mới tạo",
      active: "Đang diễn ra",
      pending: "Tạm dừng",
      closed: "Đã kết thúc",
    };

    if (
      !window.confirm(`Chuyển trạng thái sang "${statusLabels[newStatus]}"?`)
    ) {
      return;
    }

    try {
      await updateDoc(doc(db, "events", eventId), {
        status: newStatus,
        [`${newStatus}At`]: Timestamp.now(),
      });
      alert("✅ Đã cập nhật trạng thái!");
      loadData();
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    }
  };

  // Header
  const Header = () => (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Quản lý hệ thống - {user.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  // Sidebar Navigation
  const Sidebar = () => (
    <aside className="w-64 bg-white h-screen shadow-md sticky top-0">
      <nav className="p-4 space-y-2">
        <button
          onClick={() => setCurrentTab("events")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentTab === "events"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Quản lý Sự kiện</span>
        </button>
        <button
          onClick={() => setCurrentTab("rules")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentTab === "rules"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Quản lý Rules</span>
        </button>
        <button
          onClick={() => setCurrentTab("users")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentTab === "users"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Quản lý Users</span>
        </button>
        <button
          onClick={() => setCurrentTab("teams")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentTab === "teams"
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Quản lý Teams</span>
        </button>
      </nav>
    </aside>
  );

  // Error Message Component
  const ErrorMessage = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-yellow-900">Chưa có dữ liệu</p>
          <p className="text-sm text-yellow-800 mt-1">{error}</p>
          <a
            href="/seed-data"
            className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
          >
            Đi tới Seed Data →
          </a>
        </div>
      </div>
    </div>
  );

  // Events Management
  const EventsManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Sự kiện</h2>
        <button
          onClick={() => setShowCreateEvent(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tạo sự kiện mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Chưa có sự kiện nào</p>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Tạo sự kiện đầu tiên →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tên sự kiện
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Người tham gia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{event.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {event.startDate} - {event.endDate}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {event.registration?.currentParticipants || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        event.status === "active"
                          ? "bg-green-100 text-green-800"
                          : event.status === "completed"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewEvent(event)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Status Actions */}
                      {event.status === "created" && (
                        <button
                          onClick={() =>
                            handleChangeEventStatus(event.id, "active")
                          }
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Kích hoạt"
                        >
                          ▶️
                        </button>
                      )}

                      {event.status === "active" && (
                        <button
                          onClick={() =>
                            handleChangeEventStatus(event.id, "pending")
                          }
                          className="text-yellow-600 hover:text-yellow-800 p-1"
                          title="Tạm dừng"
                        >
                          ⏸️
                        </button>
                      )}

                      {event.status === "pending" && (
                        <button
                          onClick={() =>
                            handleChangeEventStatus(event.id, "active")
                          }
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Tiếp tục"
                        >
                          ▶️
                        </button>
                      )}

                      <button
                        onClick={() => handleEditEvent(event)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-800 p-1"
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
        </div>
      )}
    </div>
  );

  // Event Detail Modal
  const EventDetailModal = () => {
    if (!selectedEvent) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Chi tiết sự kiện
            </h2>
            <button
              onClick={() => setShowEventDetail(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Cover Image */}
            {selectedEvent.media?.coverImage && (
              <div className="relative h-64 rounded-lg overflow-hidden">
                <img
                  src={selectedEvent.media.coverImage}
                  alt={selectedEvent.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên sự kiện
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedEvent.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedEvent.status === "active"
                      ? "bg-green-100 text-green-800"
                      : selectedEvent.status === "completed"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {selectedEvent.status}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày bắt đầu
                </label>
                <p className="text-gray-900">{selectedEvent.startDate}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kết thúc
                </label>
                <p className="text-gray-900">{selectedEvent.endDate}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <p className="text-gray-700 leading-relaxed">
                {selectedEvent.description || "Chưa có mô tả"}
              </p>
            </div>

            {/* Registration Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">
                Thông tin đăng ký
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Người tham gia</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {selectedEvent.registration?.currentParticipants || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Giới hạn</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {selectedEvent.registration?.maxParticipants ||
                      "Không giới hạn"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Đăng ký</p>
                  <p className="text-lg font-bold text-blue-900">
                    {selectedEvent.registration?.isOpen ? "Đang mở" : "Đã đóng"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" />
                Chỉnh sửa
              </button>
              <button className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                Xóa sự kiện
              </button>
              <button
                onClick={() => setShowEventDetail(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Rules Management
  const RulesManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Thư viện Rules</h2>
        <button
          onClick={() => setShowCreateRule(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tạo rule mới
        </button>
      </div>

      {error && <ErrorMessage />}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : ruleGroups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Chưa có Rule Groups</p>
          <a
            href="/seed-data"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Chạy Seed Data →
          </a>
        </div>
      ) : (
        ruleGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {group.icon} {group.name}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {rules
                .filter((r) => r.groupId === group.id)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="border border-gray-200 p-4 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {rule.description}
                    </p>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Sử dụng: {rule.stats?.usageCount || 0} lần
                      </span>
                      <div className="flex gap-2">
                        <button className="text-blue-600 text-sm hover:underline">
                          Sửa
                        </button>
                        <button className="text-red-600 text-sm hover:underline">
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {rules.filter((r) => r.groupId === group.id).length === 0 && (
              <p className="text-gray-500 text-sm">
                Chưa có rule nào trong nhóm này
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );

  // Users Management
  const UsersManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Quản lý Users</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Đang phát triển...</p>
      </div>
    </div>
  );

  // Teams Management
  // Teams Management
  const TeamsManagement = () => {
    const [localEvents, setLocalEvents] = useState(events);

    const handleSelectEvent = (event) => {
      setSelectedEventForTeams(event);
    };

    const handleEditTeam = (event, team) => {
      setEditingTeam({ ...team, eventId: event.id });
      setShowEditTeam(true);
    };

    const handleRemoveMember = async (eventId, teamId, memberId) => {
      if (!window.confirm("Xóa thành viên này khỏi team?")) return;

      // TODO: Implement remove member logic
      alert("Tính năng đang phát triển");
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Teams</h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Chưa có sự kiện nào</p>
            <button
              onClick={() => setCurrentTab("events")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Tạo sự kiện đầu tiên →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {event.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {event.startDate} - {event.endDate}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        event.status === "active"
                          ? "bg-green-100 text-green-800"
                          : event.status === "completed"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {!event.teams || event.teams.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">Chưa có team nào</p>
                      <p className="text-sm text-gray-400">
                        Sự kiện này chưa được cấu hình teams
                      </p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {event.teams.map((team) => (
                        <div
                          key={team.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">
                              {team.name}
                            </h4>
                            <button
                              onClick={() => handleEditTeam(event, team)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Sửa team"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Thành viên</span>
                              <span className="font-semibold">
                                {team.currentMembers || 0}/{team.capacity}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${
                                    ((team.currentMembers || 0) /
                                      team.capacity) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          {team.members && team.members.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-700">
                                Thành viên:
                              </p>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {team.members.map((member, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                                  >
                                    <span className="text-gray-700">
                                      {member.name || member.userId}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleRemoveMember(
                                          event.id,
                                          team.id,
                                          member.userId
                                        )
                                      }
                                      className="text-red-500 hover:text-red-700"
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">
                              Chưa có thành viên
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Edit Team Modal
  const EditTeamModal = () => {
    if (!editingTeam) return null;

    const [teamData, setTeamData] = useState(editingTeam);

    const handleSubmit = async (e) => {
      e.preventDefault();

      // TODO: Implement updateTeam in firebase-service
      alert("Tính năng đang phát triển");
      setShowEditTeam(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Sửa Team</h2>
              <button
                onClick={() => setShowEditTeam(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên Team *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={teamData.name}
                  onChange={(e) =>
                    setTeamData({ ...teamData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số người tối đa *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={teamData.capacity}
                  onChange={(e) =>
                    setTeamData({
                      ...teamData,
                      capacity: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  📊 Hiện tại: {teamData.currentMembers || 0}/
                  {teamData.capacity} thành viên
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Lưu thay đổi
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditTeam(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {currentTab === "events" && <EventsManagement />}
          {currentTab === "rules" && <RulesManagement />}
          {currentTab === "users" && <UsersManagement />}
          {currentTab === "teams" && <TeamsManagement />}
        </main>
      </div>

      {showCreateEvent && (
        <CreateEventModal
          onClose={() => {
            setShowCreateEvent(false);
            setEditingEvent(null);
          }}
          onSuccess={() => {
            loadData();
            setEditingEvent(null);
          }}
          eventData={editingEvent} // ← THÊM PROP NÀY
        />
      )}
      {showEventDetail && <EventDetailModal />}
      {showCreateRule && (
        <CreateRuleModal
          onClose={() => setShowCreateRule(false)}
          onSuccess={loadData}
        />
      )}
      {showEditTeam && <EditTeamModal />}
    </div>
  );
};

export default AdminDashboard;
