import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Users, Settings, LogOut, Edit, Trash2, Eye } from 'lucide-react';
import { getEvents, createEvent, getRules, getRuleGroups } from '../../services/firebase-service';
import { logoutUser } from '../../services/auth-service';
import CreateEventModal from './CreateEventModal';

const AdminDashboard = ({ user, onLogout }) => {
  const [currentTab, setCurrentTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [ruleGroups, setRuleGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [eventsResult, rulesResult, groupsResult] = await Promise.all([
      getEvents(),
      getRules(),
      getRuleGroups()
    ]);

    if (eventsResult.success) setEvents(eventsResult.data);
    if (rulesResult.success) setRules(rulesResult.data);
    if (groupsResult.success) setRuleGroups(groupsResult.data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const handleCreateEvent = async (eventData) => {
    const result = await createEvent(eventData);
    if (result.success) {
      alert('Tạo sự kiện thành công!');
      setShowCreateEvent(false);
      loadData();
    } else {
      alert('Lỗi: ' + result.error);
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
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Quản lý hệ thống - {user.name}</p>
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
          onClick={() => setCurrentTab('events')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentTab === 'events' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Quản lý Sự kiện</span>
        </button>
        <button
          onClick={() => setCurrentTab('rules')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentTab === 'rules' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Quản lý Rules</span>
        </button>
        <button
          onClick={() => setCurrentTab('users')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Quản lý Users</span>
        </button>
      </nav>
    </aside>
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
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên sự kiện</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tham gia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map(event => (
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
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      event.status === 'active' ? 'bg-green-100 text-green-800' : 
                      event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800 p-1">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800 p-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800 p-1">
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

  // Rules Management
  const RulesManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Thư viện Rules</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Tạo rule mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        ruleGroups.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {group.icon} {group.name}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {rules
                .filter(r => r.groupId === group.id)
                .map(rule => (
                  <div key={rule.id} className="border border-gray-200 p-4 rounded-lg hover:border-blue-500 transition-colors">
                    <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Sử dụng: {rule.stats?.usageCount || 0} lần
                      </span>
                      <div className="flex gap-2">
                        <button className="text-blue-600 text-sm hover:underline">Sửa</button>
                        <button className="text-red-600 text-sm hover:underline">Xóa</button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
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

  {showCreateEvent && (
  <CreateEventModal
    onClose={() => setShowCreateEvent(false)}
    onSuccess={() => {
      setShowCreateEvent(false);
      loadData(); // Reload events
    }}
  />
)}
};

export default AdminDashboard;