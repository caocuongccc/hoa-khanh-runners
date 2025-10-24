import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Users, TrendingUp, Trophy, RefreshCw, LogOut, Settings, Award, Activity, Clock, MapPin, Zap, Mountain, Home, Search, Bell, User, ChevronRight, Filter, Heart, Share2, MessageCircle } from 'lucide-react';
import { getEvents } from './services/firebase-service';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StravaCallback from './components/StravaCallback';

// Wrap toàn bộ app trong BrowserRouter
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/strava/callback" element={<StravaCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

const MainApp = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Test connection
  useEffect(() => {
    const testFirebase = async () => {
      const result = await getEvents();
      console.log('Firebase test:', result);
    };
    testFirebase();
  }, []);
  // Mock user - trong thực tế lấy từ Firebase Auth
  useEffect(() => {
    setCurrentUser({
      id: 'user_001',
      name: 'Nguyễn Văn A',
      avatar: 'https://i.pravatar.cc/150?img=12',
      stravaConnected: true
    });
  }, []);

  // Mock events data
  const events = [
    {
      id: 'evt_001',
      title: 'CHALLENGE 06/01/2025 – 02/02/2025 "CHẠY ĐÓN TẾT"',
      coverImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800',
      startDate: '06/01/2025',
      endDate: '02/02/2025',
      participants: 156,
      status: 'active',
      description: 'Nối tiếp thành công của "Mùa hè rực rỡ" – sau challenge mùa hè HTR đã có thêm rất nhiều elite ultraroad...',
      rules: [
        'Chạy tối thiểu 35km/tuần',
        'Hoặc chạy mỗi ngày tối thiểu 2km, liên tục 6 ngày',
        'Upload lên trước 24h tối chủ nhật'
      ]
    },
    {
      id: 'evt_002',
      title: '"TRẬN ĐÁNH MARATHON – 490 TCN"',
      coverImage: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800',
      startDate: '23/09/2024',
      endDate: '13/10/2024',
      participants: 89,
      status: 'completed',
      description: 'Thử thách lịch sử với cự ly marathon đầy ý nghĩa...'
    },
    {
      id: 'evt_003',
      title: 'The Last Man Standing 2024 – MÙA BA',
      coverImage: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800',
      startDate: '01/11/2024',
      endDate: '24/11/2024',
      participants: 234,
      status: 'active',
      description: 'TLMS là 1 trong số các sự kiện nổi bật do CLB Hòa Khánh Runners tổ chức...'
    }
  ];

  // Mock leaderboard data
  const leaderboard = [
    { rank: 1, name: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?img=1', distance: 245.8, activities: 28, points: 1250 },
    { rank: 2, name: 'Trần Thị B', avatar: 'https://i.pravatar.cc/150?img=2', distance: 238.2, activities: 26, points: 1180 },
    { rank: 3, name: 'Lê Văn C', avatar: 'https://i.pravatar.cc/150?img=3', distance: 225.5, activities: 25, points: 1120 },
    { rank: 4, name: 'Phạm Thị D', avatar: 'https://i.pravatar.cc/150?img=4', distance: 218.3, activities: 24, points: 1090 },
    { rank: 5, name: 'Hoàng Văn E', avatar: 'https://i.pravatar.cc/150?img=5', distance: 205.7, activities: 22, points: 1020 }
  ];

  // ===== HEADER COMPONENT =====
  const Header = () => (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sự kiện chạy bộ nội bộ</h1>
              <p className="text-xs text-gray-500">Cộng đồng yêu chạy bộ VN</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setCurrentPage('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentPage === 'home' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Trang chủ</span>
            </button>
            <button 
              onClick={() => setCurrentPage('events')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentPage === 'events' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Sự kiện</span>
            </button>
            <button 
              onClick={() => setCurrentPage('leaderboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentPage === 'leaderboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Bảng xếp hạng</span>
            </button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2">
              <img src={currentUser?.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
              <span className="text-sm font-medium text-gray-700 hidden md:block">{currentUser?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  // ===== HOME PAGE =====
  const HomePage = () => (
    
    <div className="space-y-8">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-8 md:p-12 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Tạo giải chạy bộ online miễn phí</h1>
          <p className="text-lg md:text-xl opacity-90 mb-6">
            Kết nối Strava, tham gia challenges và theo dõi kết quả real-time
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Tạo sự kiện ngay
            </button>
            <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Xem hướng dẫn
            </button>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sự kiện nổi bật</h2>
          <button 
            onClick={() => setCurrentPage('events')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            Xem tất cả
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {events.slice(0, 3).map(event => (
            <div key={event.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onClick={() => {
              setSelectedEvent(event);
              setCurrentPage('event-detail');
            }}>
              <div className="relative h-48">
                <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    event.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {event.status === 'active' ? 'Đang diễn ra' : 'Đã kết thúc'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {event.startDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {event.participants}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Thống kê cộng đồng</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">1,250+</div>
            <div className="text-gray-600">Thành viên</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">156</div>
            <div className="text-gray-600">Sự kiện</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">45,678</div>
            <div className="text-gray-600">Hoạt động</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">123,456 km</div>
            <div className="text-gray-600">Tổng quãng đường</div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Cách thức hoạt động</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Kết nối Strava</h3>
            <p className="text-gray-600 text-sm">Liên kết tài khoản Strava để tự động đồng bộ hoạt động</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Tham gia Challenge</h3>
            <p className="text-gray-600 text-sm">Đăng ký và tham gia các challenge phù hợp</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-orange-600">3</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Theo dõi kết quả</h3>
            <p className="text-gray-600 text-sm">Xem bảng xếp hạng và thống kê real-time</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== EVENTS PAGE =====
  const EventsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tất cả sự kiện</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Lọc
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Tạo sự kiện
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {['Tất cả', 'Đang diễn ra', 'Sắp diễn ra', 'Đã kết thúc'].map(tab => (
          <button key={tab} className="px-4 py-2 bg-white border border-gray-300 rounded-lg whitespace-nowrap hover:border-blue-600 hover:text-blue-600">
            {tab}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onClick={() => {
            setSelectedEvent(event);
            setCurrentPage('event-detail');
          }}>
            <div className="relative h-48">
              <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  event.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {event.status === 'active' ? 'Đang diễn ra' : 'Đã kết thúc'}
                </span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-gray-900 mb-3 line-clamp-2">{event.title}</h3>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{event.startDate} - {event.endDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{event.participants} người tham gia</span>
                </div>
              </div>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== EVENT DETAIL PAGE =====
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

        {/* Event Hero */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="relative h-96">
            <img src={selectedEvent.coverImage} alt={selectedEvent.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h1 className="text-4xl font-bold mb-4">{selectedEvent.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  {selectedEvent.startDate} - {selectedEvent.endDate}
                </span>
                <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Users className="w-4 h-4" />
                  {selectedEvent.participants} người tham gia
                </span>
                <span className={`flex items-center gap-2 backdrop-blur-sm px-3 py-1 rounded-full ${
                  selectedEvent.status === 'active' ? 'bg-green-500/80' : 'bg-gray-500/80'
                }`}>
                  {selectedEvent.status === 'active' ? 'Đang diễn ra' : 'Đã kết thúc'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Giới thiệu</h2>
              <p className="text-gray-700 leading-relaxed">{selectedEvent.description}</p>
            </div>

            {/* Rules */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Luật chơi</h2>
              <ul className="space-y-3">
                {selectedEvent.rules?.map((rule, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <span className="text-gray-700">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Leaderboard Preview */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Bảng xếp hạng</h2>
                <button 
                  onClick={() => setCurrentPage('leaderboard')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  Xem đầy đủ
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {leaderboard.slice(0, 3).map(item => (
                  <div key={item.rank} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8">
                      {item.rank <= 3 ? (
                        <Award className={`w-6 h-6 ${
                          item.rank === 1 ? 'text-yellow-500' : 
                          item.rank === 2 ? 'text-gray-400' : 'text-orange-600'
                        }`} />
                      ) : (
                        <span className="font-bold text-gray-600">{item.rank}</span>
                      )}
                    </div>
                    <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.distance}km • {item.activities} hoạt động</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{item.points}</p>
                      <p className="text-xs text-gray-500">điểm</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Register Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl shadow-md p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Tham gia ngay!</h3>
              <p className="text-sm opacity-90 mb-4">
                Kết nối Strava và bắt đầu challenge cùng cộng đồng
              </p>
              <button className="w-full bg-white text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Đăng ký tham gia
              </button>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4">Thống kê sự kiện</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tổng hoạt động</span>
                  <span className="font-bold text-gray-900">3,456</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tổng km</span>
                  <span className="font-bold text-gray-900">12,345 km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pace TB</span>
                  <span className="font-bold text-gray-900">5:45/km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Độ cao TB</span>
                  <span className="font-bold text-gray-900">1,234 m</span>
                </div>
              </div>
            </div>

            {/* Share Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4">Chia sẻ</h3>
              <div className="flex gap-3">
                <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Chia sẻ</span>
                </button>
                <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">Yêu thích</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== LEADERBOARD PAGE =====
  const LeaderboardPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Bảng xếp hạng</h1>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Tất cả sự kiện</option>
            {events.map(e => (
              <option key={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Podium */}
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* Rank 2 */}
          <div className="flex flex-col items-center">
            <img src={leaderboard[1].avatar} alt={leaderboard[1].name} className="w-20 h-20 rounded-full mb-2 border-4 border-gray-400" />
            <Award className="w-8 h-8 text-gray-400 mb-2" />
            <p className="font-bold text-gray-900">{leaderboard[1].name}</p>
            <p className="text-2xl font-bold text-gray-400">{leaderboard[1].points}</p>
            <div className="w-24 h-32 bg-gray-200 mt-4 rounded-t-lg flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-500">2</span>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="flex flex-col items-center">
            <img src={leaderboard[0].avatar} alt={leaderboard[0].name} className="w-24 h-24 rounded-full mb-2 border-4 border-yellow-500" />
            <Award className="w-10 h-10 text-yellow-500 mb-2" />
            <p className="font-bold text-gray-900">{leaderboard[0].name}</p>
            <p className="text-3xl font-bold text-yellow-500">{leaderboard[0].points}</p>
            <div className="w-24 h-40 bg-yellow-200 mt-4 rounded-t-lg flex items-center justify-center">
              <span className="text-5xl font-bold text-yellow-600">1</span>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="flex flex-col items-center">
            <img src={leaderboard[2].avatar} alt={leaderboard[2].name} className="w-20 h-20 rounded-full mb-2 border-4 border-orange-600" />
            <Award className="w-8 h-8 text-orange-600 mb-2" />
            <p className="font-bold text-gray-900">{leaderboard[2].name}</p>
            <p className="text-2xl font-bold text-orange-600">{leaderboard[2].points}</p>
            <div className="w-24 h-28 bg-orange-200 mt-4 rounded-t-lg flex items-center justify-center">
              <span className="text-4xl font-bold text-orange-600">3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Hạng</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Người chơi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Khoảng cách</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Hoạt động</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map((item, index) => (
                <tr key={item.rank} className={`hover:bg-gray-50 ${index < 3 ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {item.rank <= 3 ? (
                        <Award className={`w-6 h-6 ${
                          item.rank === 1 ? 'text-yellow-500' : 
                          item.rank === 2 ? 'text-gray-400' : 'text-orange-600'
                        }`} />
                      ) : (
                        <span className="font-bold text-gray-600 w-6 text-center">{item.rank}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full" />
                      <span className="font-semibold text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-gray-900">{item.distance} km</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-700">{item.activities}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-blue-600">{item.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Personal Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl shadow-md p-6 text-white">
        <h3 className="text-xl font-bold mb-4">Thành tích của bạn</h3>
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm opacity-80 mb-1">Hạng hiện tại</p>
            <p className="text-3xl font-bold">#12</p>
          </div>
          <div>
            <p className="text-sm opacity-80 mb-1">Tổng km</p>
            <p className="text-3xl font-bold">185.5</p>
          </div>
          <div>
            <p className="text-sm opacity-80 mb-1">Hoạt động</p>
            <p className="text-3xl font-bold">20</p>
          </div>
          <div>
            <p className="text-sm opacity-80 mb-1">Điểm</p>
            <p className="text-3xl font-bold">920</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== FOOTER =====
  const Footer = () => (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">Sự kiện chạy bộ nội bộ</span>
            </div>
            <p className="text-gray-400 text-sm">
              Sự kiện chạy bộ nội bộ.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Về chúng tôi</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Giới thiệu</a></li>
              <li><a href="#" className="hover:text-white">Đội ngũ</a></li>
              <li><a href="#" className="hover:text-white">Liên hệ</a></li>
              <li><a href="#" className="hover:text-white">Tuyển dụng</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Hướng dẫn</a></li>
              <li><a href="#" className="hover:text-white">FAQ</a></li>
              <li><a href="#" className="hover:text-white">Chính sách</a></li>
              <li><a href="#" className="hover:text-white">Điều khoản</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Kết nối</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                <span className="text-xl">f</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                <span className="text-xl">in</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                <span className="text-xl">ig</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>© 2025 Sự kiện chạy bộ nội bộ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'events' && <EventsPage />}
        {currentPage === 'event-detail' && <EventDetailPage />}
        {currentPage === 'leaderboard' && <LeaderboardPage />}
      </main>

      <Footer />
    </div>
  );
};

export default App;