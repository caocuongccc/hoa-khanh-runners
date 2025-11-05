import { getStravaActivities } from "./strava-service";
import { saveTrackLog } from "./firebase-service";

export const syncUserActivities = async (user, startDate, endDate) => {
  try {
    // Check token expiry
    const now = Date.now() / 1000;
    if (user.stravaIntegration.tokenExpiry < now) {
      // Refresh token
      // TODO: Implement refresh token logic
    }

    // Convert dates to timestamps
    const afterTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const beforeTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    // Get activities from Strava
    const activities = await getStravaActivities(
      user.stravaIntegration.accessToken,
      afterTimestamp,
      beforeTimestamp
    );

    // Save to Firebase
    let savedCount = 0;
    for (const activity of activities) {
      //alert(JSON.stringify(activity));
      const trackLog = {
        userId: user.uid,
        stravaActivityId: activity.id.toString(),
        name: activity.name,
        date: activity.start_date.split("T")[0],
        distance: activity.distance / 1000, // meters to km
        duration: {
          movingTime: activity.moving_time,
          elapsedTime: activity.elapsed_time,
        },
        pace: {
          average: Math.round(
            activity.moving_time / (activity.distance / 1000)
          ),
        },
        elevation: {
          total: Math.round(activity.total_elevation_gain),
        },
        type: activity.type,
      };
//alert(JSON.stringify(trackLog));
      const result = await saveTrackLog(trackLog);
      //alert('vao day chua'+`  Result: ${JSON.stringify(result)}`);
      if (result.success) savedCount++;
    }

    return {
      success: true,
      total: activities.length,
      saved: savedCount,
        activities: activities, // thêm dòng này

    };
  } catch (error) {
    console.error("Error syncing activities:", error);
    return { success: false, error: error.message };
  }
};
