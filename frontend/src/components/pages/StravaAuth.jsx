// src/pages/StravaAuth.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { exchangeToken } from '../../services/strava-service';
import { syncUserActivities } from '../../services/strava-sync';

const StravaAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('Đang xử lý...');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleStravaCallback();
  }, []);

  const handleStravaCallback = async () => {
    try {
      // Get code from URL
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const errorParam = params.get('error');

      if (errorParam) {
        throw new Error('Người dùng từ chối kết nối Strava');
      }

      if (!code) {
        throw new Error('Không tìm thấy authorization code');
      }

      setStatus('Đang kết nối với Strava...');

      // Exchange code for tokens
      const tokenResult = await exchangeToken(code);
      
      if (!tokenResult.success) {
        throw new Error(tokenResult.error);
      }

      const { accessToken, refreshToken, expiresAt, athleteId } = tokenResult.data;

      setStatus('Đang tạo/cập nhật tài khoản...');

      // Fetch athlete info from Strava
      const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!athleteResponse.ok) {
        throw new Error('Không thể lấy thông tin athlete');
      }

      const athlete = await athleteResponse.json();
      console.log('👤 Athlete info:', athlete);

      // Use athleteId as user ID in Firestore
      const userId = athleteId.toString();
      const userRef = doc(db, 'users', userId);

      // Check if user exists
      const userSnap = await getDoc(userRef);
      const isNewUser = !userSnap.exists();

      // Create/Update user document
      const userData = {
        id: userId,
        name: `${athlete.firstname} ${athlete.lastname}`,
        email: athlete.email || null,
        avatarUrl: athlete.profile || athlete.profile_medium || null,
        gender: athlete.sex === 'M' ? 'male' : athlete.sex === 'F' ? 'female' : null,
        city: athlete.city || null,
        country: athlete.country || null,
        stravaIntegration: {
          isConnected: true,
          athleteId: athleteId.toString(),
          accessToken,
          refreshToken,
          tokenExpiry: expiresAt,
          connectedAt: Timestamp.now(),
          username: athlete.username,
        },
        role: 'member',
        updatedAt: Timestamp.now(),
      };

      if (isNewUser) {
        userData.createdAt = Timestamp.now();
        console.log('✨ Creating new user:', userId);
      } else {
        console.log('🔄 Updating existing user:', userId);
      }

      await setDoc(userRef, userData, { merge: true });

      setStatus('Đang đồng bộ hoạt động...');

      // Sync ALL activities from last 90 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      console.log(`📅 Syncing activities: ${startDate} → ${endDate}`);

      const syncResult = await syncUserActivities(
        { uid: userId, stravaIntegration: userData.stravaIntegration },
        startDate,
        endDate
      );

      if (syncResult.success) {
        console.log(`✅ Synced ${syncResult.total} activities`);
      }

      // Save user to localStorage for session
      localStorage.setItem('currentUser', JSON.stringify({
        uid: userId,
        ...userData
      }));

      setStatus('Hoàn tất! Đang chuyển hướng...');

      // Redirect to member dashboard
      setTimeout(() => {
        navigate('/member');
      }, 1000);

    } catch (error) {
      console.error('❌ Error in Strava callback:', error);
      setError(error.message);
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {error ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi kết nối</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">Đang quay về trang chủ...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Đang kết nối...</h2>
              <p className="text-gray-600">{status}</p>
              <div className="mt-6 space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Xác thực Strava</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-100"></div>
                  <span>Tạo/cập nhật tài khoản</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-200"></div>
                  <span>Đồng bộ hoạt động</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StravaAuth;