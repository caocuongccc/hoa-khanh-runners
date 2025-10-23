const STRAVA_CONFIG = {
  clientId: process.env.REACT_APP_STRAVA_CLIENT_ID,
  clientSecret: process.env.REACT_APP_STRAVA_CLIENT_SECRET,
  redirectUri: process.env.REACT_APP_STRAVA_REDIRECT_URI,
  scope: 'read,activity:read_all'
};

export const getStravaAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: STRAVA_CONFIG.clientId,
    redirect_uri: STRAVA_CONFIG.redirectUri,
    response_type: 'code',
    scope: STRAVA_CONFIG.scope
  });
  
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
};

export const exchangeToken = async (code) => {
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      })
    });
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athlete: data.athlete
    };
  } catch (error) {
    console.error('Error exchanging token:', error);
    throw error;
  }
};

export const getStravaActivities = async (accessToken, after, before) => {
  try {
    const params = new URLSearchParams({
      after: after,
      before: before,
      per_page: 100
    });
    
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    const activities = await response.json();
    return activities;
  } catch (error) {
    console.error('Error getting Strava activities:', error);
    throw error;
  }
};