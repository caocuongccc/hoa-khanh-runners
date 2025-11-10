// src/services/strava-service.js - FIXED AUTH URL
const STRAVA_CLIENT_ID = process.env.REACT_APP_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.REACT_APP_STRAVA_CLIENT_SECRET;
const REDIRECT_URI = process.env.REACT_APP_STRAVA_REDIRECT_URI || 'http://localhost:3000/strava/callback';

/**
 * Generate Strava OAuth URL with proper encoding
 */
export const getStravaAuthUrl = () => {
  // ✅ Use URLSearchParams for proper encoding
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,activity:write,profile:read_all'
  });

  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  console.log('🔗 Generated Strava auth URL:', authUrl);
  
  return authUrl;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeToken = async (code) => {
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange token: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Exchanged token from Strava');
    
    return {
      success: true,
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        athleteId: data.athlete.id,
      },
    };
  } catch (error) {
    console.error('Error exchanging token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Refresh Strava access token
 */
export const refreshStravaToken = async (refreshToken) => {
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
      },
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Alias for refreshStravaToken
 */
export const refreshAccessToken = refreshStravaToken;

/**
 * Get Strava activities for a date range
 */
export const getStravaActivities = async (accessToken, after, before) => {
  try {
    console.log('🔍 Fetching Strava activities:', { after, before });
    
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=100`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn');
      }
      throw new Error(`Strava API error: ${response.status}`);
    }

    const activities = await response.json();
    console.log('✅ Got activities from Strava:', activities.length);
    
    return activities;
  } catch (error) {
    console.error('❌ Error fetching Strava activities:', error);
    throw error;
  }
};

/**
 * Get athlete profile from Strava
 */
export const getAthleteProfile = async (accessToken) => {
  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get athlete profile');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Get athlete error:', error);
    throw error;
  }
};

/**
 * Get detailed activity by ID
 */
export const getActivityById = async (accessToken, activityId) => {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get activity ${activityId}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error getting activity:', error);
    throw error;
  }
};

/**
 * Update activity description on Strava
 */
export const updateActivityDescription = async (accessToken, activityId, description) => {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update activity description');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error updating activity:', error);
    throw error;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (expiresAt) => {
  if (!expiresAt) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt;
};

/**
 * Get valid access token (refresh if expired)
 */
export const getValidAccessToken = async (user) => {
  const { accessToken, refreshToken, tokenExpiry } = user.stravaIntegration || {};

  if (!accessToken || !refreshToken) {
    throw new Error('No Strava tokens found');
  }

  // If token is still valid, return it
  if (!isTokenExpired(tokenExpiry)) {
    return accessToken;
  }

  // Token expired, refresh it
  console.log('🔄 Token expired, refreshing...');
  const result = await refreshStravaToken(refreshToken);

  if (!result.success) {
    throw new Error('Failed to refresh token');
  }

  return result.data.accessToken;
};

// Export all functions
export default {
  getStravaAuthUrl,
  exchangeToken,
  refreshStravaToken,
  refreshAccessToken,
  getStravaActivities,
  getAthleteProfile,
  getActivityById,
  updateActivityDescription,
  isTokenExpired,
  getValidAccessToken,
};