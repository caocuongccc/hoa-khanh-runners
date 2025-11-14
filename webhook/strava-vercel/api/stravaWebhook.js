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

            // 1. Chuyển start_date về giờ địa phương UTC+7
            const startDateUTC = new Date(activity.start_date); // ví dụ "November 14, 2025 at 2:30:00 AM UTC+7"
            const startDate = new Date(startDateUTC.getTime() + 7*60*60*1000); // chuyển sang UTC+7
            const hours = startDate.getHours();

            // 2. Xác định thời gian trong ngày và emoji
            let emoji = "";
            let timeOfDay = "";

            if (hours >= 4 && hours < 11) {
              emoji = "🌅"; // sáng
              timeOfDay = "sáng";
            } else if (hours >= 11 && hours < 17) {
              emoji = "🌤️"; // chiều
              timeOfDay = "chiều";
            } else {
              emoji = "🌙"; // tối / đêm
              timeOfDay = "tối";
            }

            // 3. Tính pace trung bình dạng phút:giây
            const paceMinutes = Math.floor(activity.moving_time / (activity.distance / 1000) / 60);
            const paceSeconds = Math.round(activity.moving_time / (activity.distance / 1000) % 60);
            const paceFormatted = `${paceMinutes}:${String(paceSeconds).padStart(2, "0")}/km`;

            // 4. Phân loại buổi chạy theo pace
            const pacePerKm = activity.moving_time / (activity.distance / 1000);
            let runType = "";
            if (pacePerKm / 60 > 7) {
              runType = "Easy Run";
            } else if (pacePerKm / 60 > 5.5) {
              runType = "Aerobic";
            } else if (pacePerKm / 60 > 4.5) {
              runType = "Tempo";
            } else {
              runType = "Interval/Speed";
            }

            // 5. Tạo prompt hoàn chỉnh
            const prompt = `
            Bạn là chuyên gia chạy bộ với phong cách thân thiện và hài hước nhẹ nhàng.
            Hãy viết bài phân tích chạy (3–5 đoạn, 600–900 ký tự), văn phong vui tươi – duyên dáng – tích cực, tránh giọng báo cáo khô khan.

            Dữ liệu buổi chạy:
            - Tên: ${activity.name}
            - Quãng đường: ${(activity.distance / 1000).toFixed(2)} km
            - Thời gian: ${(activity.moving_time / 60).toFixed(1)} phút
            - Pace TB: ${paceFormatted}
            - Nhịp tim TB: ${activity.average_heartrate || "N/A"}
            - Cadence TB: ${activity.average_cadence || "N/A"}
            - Độ cao: ${activity.total_elevation_gain || 0} m
            - Thời gian bắt đầu: ${activity.start_date}

            Phân loại buổi chạy: ${runType}

            Yêu cầu nội dung:
            1) Mở bài tóm tắt hiệu suất và tự chọn emoji phù hợp theo thời gian chạy:
              Chào mừng bạn đến với buổi chạy ${timeOfDay} thật tuyệt vời! ${emoji}

            2) Thân bài:
              - Phân tích kỹ thuật: pace, độ đều, form chạy.
              - Nếu nhịp tim hoặc cadence = "N/A", viết theo dạng:
                "Hệ thống chưa ghi nhận dữ liệu ___, nên tôi phân tích dựa trên performance tổng quan."
              - Tự đánh giá effort:
                  + Pace chậm + HR thấp → Effort thấp (recovery/easy)
                  + Pace TB + HR ổn → Effort trung bình
                  + Pace nhanh + HR cao → Effort cao (tempo/interval)

            3) Điều chỉnh nội dung theo loại buổi chạy (Easy/Aerobic/Tempo/Interval):
              - Easy: nhẹ nhàng, thư giãn, tập nền
              - Aerobic: bền thể lực
              - Tempo: ngưỡng, thử thách nhưng kiểm soát
              - Interval: nhanh – bùng nổ – tập tốc độ

            4) Kết bài:
              - Gợi ý luyện tập phù hợp.
              - Thêm 1 câu động viên vui vui, hài nhẹ, tinh tế, không lố.

            Giọng điệu:
            - Thân thiện, vui tươi, duyên dáng, hài nhẹ.
            - Không châm biếm, không phán xét.
            - Như HLV nói chuyện khích lệ học viên.
            Xuất ra văn bản THUẦN, không dùng markdown.
            `;



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
