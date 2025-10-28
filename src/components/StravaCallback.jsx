import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeToken } from '../services/strava-service';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const StravaCallback = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      
      if (code && currentUser) {
        try {
          const tokens = await exchangeToken(code);
          
          // Lưu tokens vào Firestore
          await updateDoc(doc(db, 'users', currentUser.uid), {
            'stravaIntegration.isConnected': true,
            'stravaIntegration.stravaUserId': tokens.athlete.id.toString(),
            'stravaIntegration.accessToken': tokens.accessToken,
            'stravaIntegration.refreshToken': tokens.refreshToken,
            'stravaIntegration.tokenExpiry': tokens.expiresAt
          });
          
          alert('Kết nối Strava thành công!');
          navigate('/');
        } catch (error) {
          alert('Lỗi kết nối Strava: ' + error.message);
          navigate('/');
        }
      }
    };
    
    handleCallback();
  }, [searchParams, currentUser, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Đang kết nối với Strava...</p>
      </div>
    </div>
  );
};

export default StravaCallback;