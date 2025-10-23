import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeToken } from '../services/strava-service';

const StravaCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      
      if (code) {
        try {
          const tokens = await exchangeToken(code);
          console.log('Strava tokens:', tokens);
          
          // Lưu tokens vào Firebase (user document)
          // TODO: Implement save to Firebase
          
          alert('Kết nối Strava thành công!');
          navigate('/');
        } catch (error) {
          alert('Lỗi kết nối Strava: ' + error.message);
          navigate('/');
        }
      }
    };
    
    handleCallback();
  }, [searchParams, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang kết nối với Strava...</p>
      </div>
    </div>
  );
};

export default StravaCallback;