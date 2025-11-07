// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, Activity, ArrowRight } from 'lucide-react';
import { getEvents } from '../../services/firebase-service';
import { getStravaAuthUrl } from '../../services/strava-service';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadEvents();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = () => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    const result = await getEvents();
    if (result.success) {
      const activeEvents = result.data
        .filter(e => e.status === 'active' || e.status === 'pending')
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setEvents(activeEvents);
    }
    setLoading(false);
  };

  const handleConnectStrava = () => {
    const authUrl = getStravaAuthUrl();
    window.location.href = authUrl;
  };

  const handleEventClick = (event) => {
    if (currentUser) {
      // Already logged in, go to event detail
      navigate(`/event/${event.id}`);
    } else {
      // Not logged in, need to connect Strava first
      localStorage.setItem('redirectAfterAuth', `/event/${event.id}`);
      handleConnectStrava();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Hòa Khánh Runners</h1>
            <p className="text-xl mb-8 opacity-90">
              Tham gia cộng đồng chạy bộ, theo dõi tiến độ và cạnh tranh cùng bạn bè
            </p>
            
            {currentUser ? (
              <button
                onClick={() => navigate('/member')}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
              >
                Vào Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleConnectStrava}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
              >
                <Activity className="w-5 h-5" />
                Kết nối với Strava
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                <p className="text-sm text-gray-600">Sự kiện đang diễn ra</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">250+</p>
                <p className="text-sm text-gray-600">Thành viên tham gia</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">1,500+</p>
                <p className="text-sm text-gray-600">Hoạt động ghi nhận</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Sự kiện đang diễn ra</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có sự kiện nào</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleEventClick(event)}
              >
                <div className="relative h-48">
                  <img
                    src={event.media?.coverImage || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.status === 'active' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-yellow-500 text-white'
                    }`}>
                      {event.status === 'active' ? 'Đang diễn ra' : 'Sắp diễn ra'}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2">
                    {event.name}
                  </h3>
                  
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
                  
                  <button 
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {currentUser ? 'Xem chi tiết' : 'Tham gia ngay'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white">
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <h2 className="text-3xl font-bold mb-4">Sẵn sàng tham gia?</h2>
            <p className="text-xl mb-8 opacity-90">
              Kết nối Strava và bắt đầu thử thách ngay hôm nay
            </p>
            <button
              onClick={handleConnectStrava}
              className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors inline-flex items-center gap-2 text-lg"
            >
              <Activity className="w-6 h-6" />
              Kết nối với Strava
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;