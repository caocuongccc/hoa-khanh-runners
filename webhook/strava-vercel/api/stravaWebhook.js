// api/stravaWebhook.js - UPDATED với auto validate & calculate
import admin from "firebase-admin";
import fetch from "node-fetch";
import "dotenv/config";

// --- Khởi tạo Firebase Admin ---
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

// ✅ NEW: Validate & Calculate Points
const validateAndCalculatePoints = async (db, userId) => {
  try {
    console.log("🔢 Calculating points for user:", userId);

    // Get all active events user is participating in
    const participantsSnap = await db
      .collection("eventParticipants")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();

    if (participantsSnap.empty) {
      console.log("⚠️ User not in any active events");
      return;
    }

    for (const participantDoc of participantsSnap.docs) {
      const participant = participantDoc.data();
      const eventId = participant.eventId;

      // Get event
      const eventDoc = await db.collection("events").doc(eventId).get();
      if (!eventDoc.exists) continue;

      const event = eventDoc.data();

      // Get activities in event period
      const logsSnap = await db
        .collection("trackLogs")
        .where("userId", "==", userId)
        .where("date", ">=", event.startDate)
        .where("date", "<=", event.endDate)
        .get();

      const logs = logsSnap.docs.map((d) => d.data());

      // Calculate stats
      let totalDistance = 0;
      let totalElevation = 0;
      let validActivities = 0;

      logs.forEach((log) => {
        totalDistance += log.distance || 0;
        totalElevation += log.elevation?.total || 0;
        validActivities++; // Tạm thời count tất cả, sau này validate theo rules
      });

      // Update participant
      await participantDoc.ref.update({
        progress: {
          totalDistance: parseFloat(totalDistance.toFixed(2)),
          totalActivities: logs.length,
          totalElevation: totalElevation,
          validActivities: validActivities,
          completionRate: validActivities / logs.length || 0,
          totalPoints: parseFloat(totalDistance.toFixed(2)), // 1km = 1 point
        },
        lastUpdated: admin.firestore.Timestamp.now(),
      });

      console.log(
        `✅ Updated points for event ${eventId}: ${totalDistance.toFixed(
          2
        )} points`
      );
    }
  } catch (error) {
    console.error("❌ Error calculating points:", error);
  }
};

// --- Webhook handler ---
export default async function handler(req, res) {
  console.log("📥 Webhook received:", req.method);

  // ✅ 1) VERIFY ENDPOINT (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const VERIFY_TOKEN =
      process.env.STRAVA_VERIFY_TOKEN || "hoa_khanh_runners_2025";

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
        const actRes = await fetch(
          `https://www.strava.com/api/v3/activities/${activityId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

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
          startDateTime: admin.firestore.Timestamp.fromDate(
            new Date(activity.start_date)
          ),
          distance: activity.distance / 1000,
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

        // Check if exists
        const existing = await db
          .collection("trackLogs")
          .where("stravaActivityId", "==", activity.id.toString())
          .limit(1)
          .get();

        if (existing.empty) {
          await db.collection("trackLogs").add(trackLog);
          console.log("✅ Saved new activity:", activity.name);
          // === 🔹 STEP: Generate AI summary and update back to Strava ===
          try {
            console.log("🧠 Generating AI summary...");

            const prompt = `
              Bạn là chuyên gia chạy bộ. Hãy viết một đoạn phân tích ngắn (3–5 đoạn, 600–900 ký tự) cho buổi chạy này, giọng văn thân thiện – gọn gàng – truyền cảm hứng.
              Thông tin:
              - Tên: ${activity.name}
              - Quãng đường: ${(activity.distance / 1000).toFixed(2)} km
              - Thời gian: ${(activity.moving_time / 60).toFixed(1)} phút
              - Pace TB: ${Math.round(
                            activity.moving_time / (activity.distance / 1000)
                          )} giây/km
              - Nhịp tim TB: ${activity.average_heartrate || "N/A"} bpm
              - Cadence TB: ${activity.average_cadence || "N/A"} spm
              - Độ cao: ${activity.total_elevation_gain || 0} m
              Yêu cầu:
              1️⃣ Mở đầu tóm tắt hiệu suất tổng quan.
              2️⃣ Giữa bài nêu 1–2 nhận xét kỹ thuật (pace, cadence, tim...).
              3️⃣ Cuối bài khuyến nghị luyện tập & 1 câu động viên tích cực.
              Tránh giọng báo cáo, hãy nói như HLV động viên học viên.`;

            const aiRes = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  temperature: 0.8,
                  messages: [
                    {
                      role: "system",
                      content: "Bạn là trợ lý AI chuyên về phân tích chạy bộ.",
                    },
                    { role: "user", content: prompt },
                  ],
                }),
              }
            );

            const aiJson = await aiRes.json();
            const aiSummary =
              aiJson.choices?.[0]?.message?.content?.trim() || "";

            console.log("✅ AI summary generated, length:", aiSummary.length);

            if (aiSummary) {
              const content = `🤖 **AI Running Insight**\n\n${aiSummary}\n\n—\nPhân tích tự động bởi Hòa Khánh Runners AI`;

              const updateRes = await fetch(
                `https://www.strava.com/api/v3/activities/${activity.id}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ description: content }),
                }
              );

              if (updateRes.ok) {
                console.log("✅ Updated Strava description successfully!");
              } else {
                console.error(
                  "❌ Failed to update Strava description:",
                  await updateRes.text()
                );
              }
            }
          } catch (err) {
            console.error("⚠️ AI summary or Strava update failed:", err);
          }
          // ✅ NEW: Auto calculate points
          await validateAndCalculatePoints(db, userDoc.id);
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
