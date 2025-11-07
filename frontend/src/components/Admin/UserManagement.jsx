import React, { useState, useEffect } from "react";
import { Search, Users, ChevronLeft, ChevronRight, Mail, Calendar, Activity, Award } from "lucide-react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // User stats
  const [userStats, setUserStats] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [stravaFilter, setStravaFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, stravaFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setLoading(false);
  };

  const loadUserStats = async (userId) => {
    try {
      // Get user's events
      const participantsQuery = query(
        collection(db, "eventParticipants"),
        where("userId", "==", userId)
      );
      const participantsSnap = await getDocs(participantsQuery);
      
      const eventsCount = participantsSnap.size;
      let totalDistance = 0;
      let totalActivities = 0;
      let totalPoints = 0;

      participantsSnap.docs.forEach(doc => {
        const data = doc.data();
        totalDistance += data.progress?.totalDistance || 0;
        totalActivities += data.progress?.totalActivities || 0;
        totalPoints += data.progress?.totalPoints || 0;
      });

      setUserStats({
        eventsCount,
        totalDistance: totalDistance.toFixed(2),
        totalActivities,
        totalPoints
      });
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Strava filter
    if (stravaFilter === "connected") {
      filtered = filtered.filter(u => u.stravaIntegration?.isConnected);
    } else if (stravaFilter === "not-connected") {
      filtered = filtered.filter(u => !u.stravaIntegration?.isConnected);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      alert("✅ Cập nhật vai trò thành công!");
      loadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      alert("❌ Lỗi: " + error.message);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // User List View
  if (!selectedUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Users</h1>
          <div className="text-sm text-gray-600">
            Tổng: <strong>{users.length}</strong> users
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admin</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.role === "admin").length}
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Member</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.role === "member").length}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kết nối Strava</p>
                <p className="text-2xl font-bold text-orange-600">
                  {users.filter(u => u.stravaIntegration?.isConnected).length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tên, email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </div>

            {/* Strava Filter */}
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={stravaFilter}
                onChange={(e) => setStravaFilter(e.target.value)}
              >
                <option value="all">Tất cả Strava</option>
                <option value="connected">Đã kết nối</option>
                <option value="not-connected">Chưa kết nối</option>
              </select>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Tìm thấy <strong>{filteredUsers.length}</strong> users
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : currentUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không tìm thấy user nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Strava
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="font-medium text-gray-900">
                          {user.name || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {user.stravaIntegration?.isConnected ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Đã kết nối
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Chưa kết nối
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          loadUserStats(user.id);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Chi tiết
                      </button>
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
      </div>
    );
  }

  // User Detail View
  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          setSelectedUser(null);
          setUserStats(null);
        }}
        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        ← Quay lại
      </button>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-start gap-6 mb-6">
          <img
            src={selectedUser.avatarUrl || `https://i.pravatar.cc/150?u=${selectedUser.id}`}
            alt={selectedUser.name}
            className="w-24 h-24 rounded-full"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {selectedUser.name}
            </h2>
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Mail className="w-4 h-4" />
              <span>{selectedUser.email}</span>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                selectedUser.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedUser.role === 'admin' ? 'Admin' : 'Member'}
              </span>
              {selectedUser.stravaIntegration?.isConnected && (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">
                  Strava Connected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {userStats && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Sự kiện tham gia</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.eventsCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tổng km</p>
              <p className="text-2xl font-bold text-blue-600">{userStats.totalDistance}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Hoạt động</p>
              <p className="text-2xl font-bold text-green-600">{userStats.totalActivities}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tổng điểm</p>
              <p className="text-2xl font-bold text-purple-600">{userStats.totalPoints}</p>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Thông tin tài khoản</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">User ID:</span>
              <span className="ml-2 font-mono text-gray-900">{selectedUser.id}</span>
            </div>
            <div>
              <span className="text-gray-600">Ngày tạo:</span>
              <span className="ml-2 text-gray-900">
                {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('vi-VN') : 'N/A'}
              </span>
            </div>
            {selectedUser.stravaIntegration?.athleteId && (
              <div>
                <span className="text-gray-600">Strava Athlete ID:</span>
                <span className="ml-2 font-mono text-gray-900">
                  {selectedUser.stravaIntegration.athleteId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;