import { useNavigate, useLocation } from "react-router-dom";
import { Activity, Home, Calendar, TrendingUp, LogOut } from "lucide-react";

const SharedHeader = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const handleStravaLogin = () => {
    const authUrl = getStravaAuthUrl();
    window.location.href = authUrl;
  };
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    if (onLogout) onLogout();
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(currentUser ? "/member" : "/")}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Hòa Khánh Runners
              </h1>
              <p className="text-xs text-gray-500">
                {currentUser ? "Member Dashboard" : "Chạy để sông tốt hơn"}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate(currentUser ? "/member" : "/")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isActive("/member") &&
                !isActive("/member/events") &&
                !isActive("/member/activities")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Trang chủ</span>
            </button>

            {currentUser && (
              <>
                <button
                  onClick={() => navigate("/member/events")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive("/member/events")
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Sự kiện</span>
                </button>

                <button
                  onClick={() => navigate("/member/activities")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive("/member/activities")
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Hoạt động</span>
                </button>
              </>
            )}

            <button
              onClick={() => navigate("/feed")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isActive("/feed")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium">Feed</span>
            </button>
          </nav>

          {/* User Info / Login */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-700">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-gray-500">{currentUser.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden md:inline">Đăng xuất</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStravaLogin}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-medium shadow-md flex items-center gap-2 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Đăng nhập bằng Strava
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default SharedHeader;
