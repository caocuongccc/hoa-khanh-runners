// FILE: src/components/Auth/LoginPage.jsx

import React, { useState } from 'react';
import { LogIn, UserPlus, TrendingUp } from 'lucide-react';
import { loginUser, registerUser } from '../../services/auth-service';

const LoginPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await loginUser(formData.email, formData.password);
      } else {
        result = await registerUser(formData.email, formData.password, formData.name);
      }

      if (result.success) {
        // Success - user sẽ được load tự động qua onAuthChange
        console.log('Login/Register success');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick login demo accounts
  const handleDemoLogin = async (email, password) => {
    setLoading(true);
    setError('');
    console.log(email);
    console.log(password);
    const result = await loginUser(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hòa Khánh Runners</h1>
          <p className="text-gray-600">Cộng đồng chạy bộ Việt Nam</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-3 rounded-md font-medium transition-all ${
              isLogin 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-3 rounded-md font-medium transition-all ${
              !isLogin 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required={!isLogin}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Nguyễn Văn A"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
            />
            {!isLogin && (
              <p className="text-xs text-gray-500 mt-1">Tối thiểu 6 ký tự</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Đang xử lý...
              </>
            ) : (
              <>
                {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">
            🎯 Tài khoản demo (click để đăng nhập nhanh)
          </p>
          <div className="space-y-2">
            <button
              onClick={() => handleDemoLogin('hoakhanhrunners@gmail.com', 'Admin@123')}
              disabled={loading}
              className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 p-3 rounded-lg transition-all text-left disabled:opacity-50"
            >
              <p className="font-semibold text-blue-900 text-sm">👨‍💼 Admin</p>
              <p className="text-blue-700 text-xs">hoakhanhrunners@gmail.com / Admin@123</p>
            </button>
            <button
              onClick={() => handleDemoLogin('member@gmail.com', 'Member@123')}
              disabled={loading}
              className="w-full bg-green-50 hover:bg-green-100 border border-green-200 p-3 rounded-lg transition-all text-left disabled:opacity-50"
            >
              <p className="font-semibold text-green-900 text-sm">👤 Member</p>
              <p className="text-green-700 text-xs">member@gmail.com / Member@123</p>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            ℹ️ Tài khoản demo chỉ hoạt động nếu đã tạo trong Firebase Authentication
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Bằng cách đăng nhập, bạn đồng ý với <a href="#" className="text-blue-600 hover:underline">Điều khoản</a> và <a href="#" className="text-blue-600 hover:underline">Chính sách</a> của chúng tôi
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;