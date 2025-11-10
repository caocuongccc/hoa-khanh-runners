import React, { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ListChecks,
  Layers,
  LogOut,
  Activity,
  UserCog,
} from "lucide-react";
import { logoutUser } from "../../services/auth-service";
import EventsManagement from "./EventsManagement";
import TeamManagement from "./TeamManagement";
import UserManagement from "./UserManagement";
import RulesManagement from "./RulesManagement";
import TrackLogsManagement from "./TrackLogsManagement";

const AdminDashboard = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState("overview");

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  // Sidebar navigation items
  const navItems = [
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { id: "events", label: "Quản lý sự kiện", icon: Calendar },
    { id: "teams", label: "Quản lý Teams", icon: Users },
    { id: "users", label: "Quản lý Users", icon: UserCog },
    { id: "rules", label: "Quản lý Rules", icon: ListChecks },
    { id: "tracklogs", label: "Quản lý TrackLogs", icon: Activity }, // ← THÊM
  ];

  // Overview Page
  const OverviewPage = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Tổng quan</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">12</span>
          </div>
          <p className="text-sm opacity-90">Sự kiện đang hoạt động</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">248</span>
          </div>
          <p className="text-sm opacity-90">Thành viên tham gia</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">1,456</span>
          </div>
          <p className="text-sm opacity-90">Hoạt động đã ghi nhận</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <ListChecks className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">24</span>
          </div>
          <p className="text-sm opacity-90">Rules được áp dụng</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Sự kiện gần đây
          </h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    Challenge tháng {i}
                  </p>
                  <p className="text-sm text-gray-600">120 thành viên</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Đang diễn ra
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage("events")}
            className="w-full mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Xem tất cả →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Thành viên mới
          </h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <img
                  src={`https://i.pravatar.cc/150?u=${i}`}
                  alt="User"
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Thành viên {i}</p>
                  <p className="text-sm text-gray-600">member{i}@email.com</p>
                </div>
                <span className="text-xs text-gray-500">2 giờ trước</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage("users")}
            className="w-full mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Xem tất cả →
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Hòa Khánh Runners
              </h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User info & Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <img
              src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.uid}`}
              alt={user.name}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {currentPage === "overview" && <OverviewPage />}
          {currentPage === "events" && <EventsManagement />}
          {currentPage === "teams" && <TeamManagement />}
          {currentPage === "users" && <UserManagement />}
          {currentPage === "rules" && <RulesManagement />}
          {currentPage === "tracklogs" && <TrackLogsManagement />}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;