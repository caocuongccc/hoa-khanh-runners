// api/stravaWebhook.js
import admin from "firebase-admin";
import fetch from "node-fetch";

// --- Khởi tạo Firebase Admin (chỉ 1 lần) ---
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// --- Helper functions ---
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

// --- Webhook handler ---
export default async function handler(req, res) {
  console.log("📥 Webhook received:", req.method, req.query, req.body);

  // ✅ 1) VERIFY ENDPOINT (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || "hoa_khanh_runners_2025";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified");
      return res.status(200).json({ "hub.challenge": challenge });
    }
    console.log("❌ Verification failed");
    return res.status(403).send("Forbidden");
  }

  // ✅ 2) HANDLE POST EVENT
  if (req.method === "POST") {
    const event = req.body;
    console.log("🎯 Event:", event.object_type, event.aspect_type);

    // Only process new activities
    if (event.object_type === "activity" && event.aspect_type === "create") {
      const athleteId = event.owner_id;
      const activityId = event.object_id;

      try {
        const db = admin.firestore();

        // Find user by athleteId
        const usersSnap = await db
          .collection("users")
          .where("stravaIntegration.athleteId", "==", athleteId.toString())
          .limit(1)
          .get();

        if (usersSnap.empty) {
          console.log("⚠️ User not found for athlete:", athleteId);
          return res.status(200).send("User not found");
        }

        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data();
        const accessToken = userData.stravaIntegration?.accessToken;
        if (!accessToken) {
          console.log("❌ No access token for user");
          return res.status(200).send("No access token");
        }

        console.log("🔍 Fetching activity:", activityId);
        const actRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!actRes.ok) {
          console.log("❌ Strava fetch failed:", actRes.status);
          return res.status(200).send("Fetch failed");
        }

        const activity = await actRes.json();
        console.log("✅ Activity:", activity.name);

        // Build trackLog
        const trackLog = {
          userId: userDoc.id,
          stravaActivityId: activity.id.toString(),
          name: activity.name,
          date: activity.start_date.split("T")[0],
          startDateTime: admin.firestore.Timestamp.fromDate(new Date(activity.start_date)),
          distance: activity.distance / 1000,
          duration: {
            movingTime: activity.moving_time,
            elapsedTime: activity.elapsed_time,
            movingTimeFormatted: formatDuration(activity.moving_time),
            elapsedTimeFormatted: formatDuration(activity.elapsed_time),
          },
          pace: {
            average: Math.round(activity.moving_time / (activity.distance / 1000)),
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
            average: (activity.average_speed || 0) * 3.6,
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
          syncedAt: admin.firestore.Timestamp.now(),
          syncMethod: "webhook",
        };

        const existing = await db
          .collection("trackLogs")
          .where("stravaActivityId", "==", activity.id.toString())
          .limit(1)
          .get();

        if (existing.empty) {
          await db.collection("trackLogs").add(trackLog);
          console.log("✅ Saved new activity:", activity.name);
        } else {
          console.log("⚠️ Activity already exists");
        }

        return res.status(200).send("OK");
      } catch (err) {
        console.error("❌ Error:", err);
        return res.status(500).send(err.message);
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.status(405).send("Method Not Allowed");
}
