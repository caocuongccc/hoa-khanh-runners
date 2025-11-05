// FILE: src/services/strava-sync.js
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { getStravaActivities } from "./strava-service";

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
};

const formatPace = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}/km`;
};

export const syncUserActivities = async (user, startDate, endDate) => {
  try {
    console.log("🔄 Starting sync:", { userId: user.uid, startDate, endDate });
    console.log("👤 User strava integration:", user.stravaIntegration);

    // Check if Strava is connected
    if (!user.stravaIntegration?.isConnected) {
      return {
        success: false,
        error: "Chưa kết nối Strava. Vui lòng kết nối tài khoản Strava trước.",
      };
    }

    // Check token
    const accessToken = user.stravaIntegration?.accessToken;
    const tokenExpiry = user.stravaIntegration?.tokenExpiry;

    if (!accessToken) {
      return {
        success: false,
        error: "Không tìm thấy access token. Vui lòng kết nối lại Strava.",
      };
    }

    // Check if token expired (with 1 hour buffer)
    const now = Date.now() / 1000;
    if (tokenExpiry && tokenExpiry < now + 3600) {
      return {
        success: false,
        error: "Token Strava sắp hết hạn hoặc đã hết hạn. Vui lòng kết nối lại.",
      };
    }

    // Get activities from Strava
    const afterTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const beforeTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    console.log("📅 Time range:", { afterTimestamp, beforeTimestamp });

    const activities = await getStravaActivities(
      user.stravaIntegration.accessToken,
      afterTimestamp,
      beforeTimestamp
    );

    console.log("📥 Got activities from Strava:", activities?.length || 0);

    if (!activities || activities.length === 0) {
      return {
        success: true,
        total: 0,
        saved: 0,
        message: "Không có hoạt động mới",
      };
    }

    // Save to Firebase
    let savedCount = 0;
    let updatedCount = 0;

    for (const activity of activities) {
      try {
        // Check if activity already exists
        const q = query(
          collection(db, "trackLogs"),
          where("stravaActivityId", "==", activity.id.toString())
        );
        const existingSnap = await getDocs(q);

        const trackLog = {
          userId: user.uid,
          stravaActivityId: activity.id.toString(),
          name: activity.name,
          date: activity.start_date.split("T")[0],
          startDateTime: Timestamp.fromDate(new Date(activity.start_date)),
          distance: activity.distance / 1000, // m to km
          duration: {
            movingTime: activity.moving_time,
            elapsedTime: activity.elapsed_time,
            movingTimeFormatted: formatDuration(activity.moving_time),
            elapsedTimeFormatted: formatDuration(activity.elapsed_time),
          },
          pace: {
            average: Math.round(
              activity.moving_time / (activity.distance / 1000)
            ),
            averageFormatted: formatPace(
              Math.round(activity.moving_time / (activity.distance / 1000))
            ),
          },
          elevation: {
            total: Math.round(activity.total_elevation_gain || 0),
            high: activity.elev_high || 0,
            low: activity.elev_low || 0,
          },
          heartRate: {
            average: activity.average_heartrate || null,
            max: activity.max_heartrate || null,
            hasHeartRateData: !!activity.average_heartrate,
          },
          speed: {
            average: (activity.average_speed || 0) * 3.6, // m/s to km/h
            max: (activity.max_speed || 0) * 3.6,
          },
          calories: activity.calories || null,
          type: activity.type || "Run",
          map: {
            summaryPolyline: activity.map?.summary_polyline || null,
            hasMap: !!activity.map?.summary_polyline,
          },
          location: {
            startLatlng: activity.start_latlng || null,
            endLatlng: activity.end_latlng || null,
          },
          stravaData: {
            kudosCount: activity.kudos_count || 0,
            commentCount: activity.comment_count || 0,
            athleteCount: activity.athlete_count || 0,
            isPrivate: activity.private || false,
          },
          syncedAt: Timestamp.now(),
        };

        if (existingSnap.empty) {
          await addDoc(collection(db, "trackLogs"), trackLog);
          savedCount++;
          console.log("✅ Saved new activity:", activity.name);
        } else {
          await updateDoc(existingSnap.docs[0].ref, trackLog);
          updatedCount++;
          console.log("🔄 Updated activity:", activity.name);
        }
      } catch (activityError) {
        console.error("Error processing activity:", activity.id, activityError);
      }
    }

    console.log("✅ Sync complete:", { total: activities.length, saved: savedCount, updated: updatedCount });

    return {
      success: true,
      total: activities.length,
      saved: savedCount,
      updated: updatedCount,
    };
  } catch (error) {
    console.error("❌ Error syncing activities:", error);
    return { success: false, error: error.message };
  }
};