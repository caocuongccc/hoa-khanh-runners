import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, RefreshCw, Link2, Check, LogOut, Activity, Home, ChevronRight, Award, Heart, Share2, X } from 'lucide-react';
import { getEvents } from '../../services/firebase-service';
import { getStravaAuthUrl } from '../../services/strava-service';
import { syncUserActivities } from '../../services/strava-sync';
import { logoutUser } from '../../services/auth-service';

const MemberDashboard = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('home');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [myActivities, setMyActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, message: '' });

  const stravaConnected = user?.stravaIntegration?.isConnected || false;

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const result = await getEvents();
    if (result.success) {
      // Lọc các events active và sắp xếp theo ngày tạo mới nhất
      const activeEvents = result.data
        //.filter(e => e.status === 'active' || e.status === 'upcoming')
        .sort((a, b) => {
          // Sắp xếp theo startDate, mới nhất lên đầu
          return new Date(b.startDate) - new Date(a.startDate);
        });
      setEvents(activeEvents);
    }
    setLoading(false);
  };

  const handleConnectStrava = () => {
    const authUrl = getStravaAuthUrl();
    window.location.href = authUrl;
  };

  const handleSyncActivities = async () => {
    if (!stravaConnected) {
      alert('Vui lòng kết nối Strava trước!');
      return;
    }

    setSyncStatus({ syncing: true, message: 'Đang đồng bộ...' });
    
    const result = await syncUserActivities(
      user,
      '2024-01-01',
      new Date().toISOString().split('T')[0]
    );
    
    if (result.success) {
      setSyncStatus({ 
        syncing: false, 
        message: `✅ Đồng bộ thành công ${result.saved}/${result.total} hoạt động!` 
      });
    } else {
      setSyncStatus({ 
        syncing: false, 
        message: `❌ Lỗi: ${result.error}` 
      });
    }

    setTimeout(() => setSyncStatus({ syncing: false, message: '' }), 5000);
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const formatPace = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Header Component
  const Header = () => (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hòa Khánh Runners</h1>
              <p className="text-xs text-gray-500">Member Dashboard</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setCurrentPage('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === 'home' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Trang chủ</span>
            </button>
            <button 
              onClick={() => setCurrentPage('events')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === 'events' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Sự kiện</span>
            </button>
            <button 
              onClick={() => setCurrentPage('activities')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentPage === 'activities' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Hoạt động</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-gray-700">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  // Strava Connection Card
  const StravaConnectCard = () => (
    <div className="mb-6">
      {stravaConnected ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Đã kết nối Strava</p>
              <p className="text-sm text-green-600">Hoạt động sẽ được tự động đồng bộ</p>
            </div>
          </div>
          <button
            onClick={handleSyncActivities}
            disabled={syncStatus.syncing}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus.syncing ? 'animate-spin' : ''}`} />
            {syncStatus.syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
          </button>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Link2 className="w-8 h-8 text-orange-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">Kết nối với Strava</h3>
              <p className="text-sm text-orange-700 mb-4">
                Kết nối tài khoản Strava để tự động đồng bộ hoạt động chạy bộ và tham gia sự kiện
              </p>
              <button
                onClick={handleConnectStrava}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Kết nối ngay
              </button>
            </div>
          </div>
        </div>
      )}
      {syncStatus.message && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">{syncStatus.message}</p>
        </div>
      )}
    </div>
  );

  // Home Page
  const HomePage = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-green-600 to-green-400 rounded-2xl p-8 md:p-12 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Chào mừng, {user.name}!</h1>
          <p className="text-lg md:text-xl opacity-90 mb-6">
            Tham gia challenges và theo dõi tiến độ của bạn
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sự kiện đang diễn ra</h2>
          <button 
            onClick={() => setCurrentPage('events')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            Xem tất cả
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có sự kiện nào đang diễn ra</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {events.slice(0, 3).map(event => (
              <div key={event.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onClick={() => {
                setSelectedEvent(event);
                setCurrentPage('event-detail');
              }}>
                <div className="relative h-48">
                  <img 
                    src={event.media?.coverImage || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'} 
                    alt={event.name} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.status === 'active' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {event.status === 'active' ? 'Đang diễn ra' : 'Sắp diễn ra'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{event.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {event.startDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {event.registration?.currentParticipants || 0}
                    </span>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Events Page
  const EventsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tất cả sự kiện</h1>
        <button
          onClick={loadEvents}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Chưa có sự kiện nào</p>
          <button
            onClick={loadEvents}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Làm mới →
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onClick={() => {
              setSelectedEvent(event);
              setCurrentPage('event-detail');
            }}>
              <div className="relative h-48">
                <img 
                  src={event.media?.coverImage || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'} 
                  alt={event.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-3 line-clamp-2">{event.name}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{event.startDate} - {event.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{event.registration?.currentParticipants || 0} người tham gia</span>
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Đăng ký tham gia
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Activities Page
  const ActivitiesPage = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Hoạt động của tôi</h1>
      
      {myActivities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Chưa có hoạt động nào</p>
          <p className="text-sm text-gray-400">Nhấn nút "Đồng bộ Strava" để tải hoạt động</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khoảng cách</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {myActivities.map(activity => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {activity.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {activity.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                    {activity.distance} km
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(activity.duration.movingTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatPace(activity.pace.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Event Detail Page
  const EventDetailPage = () => {
    if (!selectedEvent) return null;

    return (
      <div className="space-y-6">
        <button 
          onClick={() => setCurrentPage('events')}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          ← Quay lại
        </button>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="relative h-96">
            <img 
              src={selectedEvent.media?.coverImage || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'} 
              alt={selectedEvent.name} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h1 className="text-4xl font-bold mb-4">{selectedEvent.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  {selectedEvent.startDate} - {selectedEvent.endDate}
                </span>
                <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Users className="w-4 h-4" />
                  {selectedEvent.registration?.currentParticipants || 0} người tham gia
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Giới thiệu</h2>
              <p className="text-gray-700 leading-relaxed">
                {selectedEvent.description || 'Chưa có mô tả chi tiết'}
              </p>
            </div>
          </div>

          <div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl shadow-md p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Tham gia ngay!</h3>
              <p className="text-sm opacity-90 mb-4">
                Kết nối Strava và bắt đầu challenge cùng cộng đồng
              </p>
              <button className="w-full bg-white text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Đăng ký tham gia
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <StravaConnectCard />
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'events' && <EventsPage />}
        {currentPage === 'activities' && <ActivitiesPage />}
        {currentPage === 'event-detail' && <EventDetailPage />}
      </main>
    </div>
  );
};

export default MemberDashboard;