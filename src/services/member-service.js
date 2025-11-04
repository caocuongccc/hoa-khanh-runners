import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  Timestamp,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { getStravaActivities } from "./strava-service";

// ===== EVENT REGISTRATION =====
export const registerForEvent = async (eventId, userId, userName, teamId) => {
  try {
    console.log("📝 Starting registration:", { eventId, userId, userName, teamId });

    // ✅ 1. Check if already registered
    const q = query(
      collection(db, "eventParticipants"),
      where("eventId", "==", eventId),
      where("userId", "==", userId)
    );
    const existing = await getDocs(q);

    if (!existing.empty) {
      console.log("⚠️ User already registered");
      return { success: false, error: "Đã đăng ký sự kiện này rồi" };
    }

    // ✅ 2. Get event data để check team capacity
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      return { success: false, error: "Sự kiện không tồn tại" };
    }

    const eventData = eventSnap.data();
    const teams = eventData.teams || [];

    console.log("📥 Event data:", eventData);
    console.log("👥 Teams:", teams);

    // ✅ 3. Check team capacity
    const selectedTeam = teams.find(t => t.id === teamId);
    if (!selectedTeam) {
      return { success: false, error: "Team không tồn tại" };
    }

    if (selectedTeam.currentMembers >= selectedTeam.capacity) {
      return { success: false, error: "Team đã đầy" };
    }

    console.log("✅ Team available:", selectedTeam);

    // ✅ 4. Use transaction để đảm bảo atomic
    await runTransaction(db, async (transaction) => {
      // 4.1. Create participant
      const participantRef = doc(collection(db, "eventParticipants"));
      transaction.set(participantRef, {
        eventId,
        userId,
        userName,
        teamId,
        status: "active",
        registeredAt: Timestamp.now(),
        progress: {
          totalDistance: 0,
          totalActivities: 0,
          totalElevation: 0,
          validActivities: 0,
          completionRate: 0,
          currentRank: 0,
          totalPoints: 0,
        },
        rulesCompliance: [],
      });

      console.log("✅ Created participant document");

      // 4.2. Update event participant count
      const currentCount = eventData.registration?.currentParticipants || 0;
      transaction.update(eventRef, {
        "registration.currentParticipants": currentCount + 1,
      });

      console.log("✅ Updated participant count:", currentCount + 1);

      // 4.3. Update team members
      const updatedTeams = teams.map(team => {
        if (team.id === teamId) {
          return {
            ...team,
            currentMembers: (team.currentMembers || 0) + 1,
            members: [...(team.members || []), { userId, userName }]
          };
        }
        return team;
      });

      transaction.update(eventRef, {
        teams: updatedTeams
      });

      console.log("✅ Updated teams:", updatedTeams);
    });

    console.log("🎉 Registration successful!");
    return { success: true };

  } catch (error) {
    console.error("❌ Error registering for event:", error);
    return { success: false, error: error.message };
  }
};

// ===== SYNC STRAVA ACTIVITIES =====
export const syncUserActivities = async (user, startDate, endDate) => {
  try {
    // Check token
    const tokenExpiry = user.stravaIntegration.tokenExpiry;
    const now = Date.now() / 1000;

    if (tokenExpiry < now) {
      return {
        success: false,
        error: "Strava token hết hạn, vui lòng kết nối lại",
      };
    }

    // Get activities from Strava
    const afterTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const beforeTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    const activities = await getStravaActivities(
      user.stravaIntegration.accessToken,
      afterTimestamp,
      beforeTimestamp
    );

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
          total: Math.round(activity.total_elevation_gain),
          high: activity.elev_high || 0,
          low: activity.elev_low || 0,
        },
        heartRate: {
          average: activity.average_heartrate || null,
          max: activity.max_heartrate || null,
          hasHeartRateData: !!activity.average_heartrate,
        },
        speed: {
          average: activity.average_speed * 3.6, // m/s to km/h
          max: activity.max_speed * 3.6,
        },
        calories: activity.calories || null,
        type: activity.type,
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
      } else {
        await updateDoc(existingSnap.docs[0].ref, trackLog);
        updatedCount++;
      }
    }

    return {
      success: true,
      total: activities.length,
      saved: savedCount,
      updated: updatedCount,
    };
  } catch (error) {
    console.error("Error syncing activities:", error);
    return { success: false, error: error.message };
  }
};

// ===== VALIDATE ACTIVITIES AGAINST RULES =====
export const validateAndCalculatePoints = async (eventId, userId) => {
  try {
    // Get event with rules
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (!eventSnap.exists()) {
      return { success: false, error: "Event not found" };
    }

    const event = eventSnap.data();

    // Get event rules
    const eventRulesQuery = query(
      collection(db, "eventRules"),
      where("eventId", "==", eventId)
    );
    const eventRulesSnap = await getDocs(eventRulesQuery);

    const eventRules = [];
    for (const erDoc of eventRulesSnap.docs) {
      const er = erDoc.data();
      const ruleSnap = await getDoc(doc(db, "rules", er.ruleId));
      eventRules.push({
        ...er,
        ruleData: ruleSnap.data(),
      });
    }

    // Get user's track logs in event period
    const logsQuery = query(
      collection(db, "trackLogs"),
      where("userId", "==", userId),
      where("date", ">=", event.startDate),
      where("date", "<=", event.endDate)
    );
    const logsSnap = await getDocs(logsQuery);
    const logs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Calculate stats
    let totalPoints = 0;
    let validActivities = 0;
    const rulesCompliance = [];

    // Validate each activity against rules
    for (const log of logs) {
      let activityPoints = 0;
      let isValid = true;

      for (const eventRule of eventRules) {
        const rule = eventRule.ruleData;
        const customValue = eventRule.customization.customValue;

        let rulePass = false;

        // Check rule based on type
        switch (rule.config.type) {
          case "distance":
            rulePass = checkDistanceRule(
              log.distance,
              rule.config.operator,
              customValue
            );
            break;
          case "pace":
            rulePass = checkPaceRule(
              log.pace.average,
              rule.config.operator,
              customValue
            );
            break;
          case "elevation":
            rulePass = checkElevationRule(
              log.elevation.total,
              rule.config.operator,
              customValue
            );
            break;
          default:
            rulePass = true;
        }

        if (!rulePass && eventRule.customization.isRequired) {
          isValid = false;
        }

        if (rulePass) {
          activityPoints += eventRule.customization.points;
        }
      }

      if (isValid) {
        validActivities++;
        totalPoints += activityPoints;
      }
    }

    // Calculate aggregate rules (total_distance, activity_count)
    const totalDistance = logs.reduce((sum, log) => sum + log.distance, 0);
    const totalElevation = logs.reduce(
      (sum, log) => sum + log.elevation.total,
      0
    );

    for (const eventRule of eventRules) {
      const rule = eventRule.ruleData;
      const customValue = eventRule.customization.customValue;

      if (rule.config.type === "total_distance") {
        const pass = totalDistance >= customValue;
        rulesCompliance.push({
          ruleId: eventRule.ruleId,
          status: pass ? "met" : "not_met",
          currentValue: totalDistance,
          requiredValue: customValue,
          progress: totalDistance / customValue,
        });
        if (pass) totalPoints += eventRule.customization.points;
      }

      if (rule.config.type === "activity_count") {
        const pass = validActivities >= customValue;
        rulesCompliance.push({
          ruleId: eventRule.ruleId,
          status: pass ? "met" : "not_met",
          currentValue: validActivities,
          requiredValue: customValue,
          progress: validActivities / customValue,
        });
        if (pass) totalPoints += eventRule.customization.points;
      }
    }

    // Update participant progress
    const participantQuery = query(
      collection(db, "eventParticipants"),
      where("eventId", "==", eventId),
      where("userId", "==", userId)
    );
    const participantSnap = await getDocs(participantQuery);

    if (!participantSnap.empty) {
      await updateDoc(participantSnap.docs[0].ref, {
        progress: {
          totalDistance: totalDistance,
          totalActivities: logs.length,
          totalElevation: totalElevation,
          validActivities: validActivities,
          completionRate: validActivities / logs.length,
          totalPoints: totalPoints,
        },
        rulesCompliance: rulesCompliance,
        lastUpdated: Timestamp.now(),
      });
    }

    return {
      success: true,
      totalPoints,
      validActivities,
      totalActivities: logs.length,
      totalDistance,
    };
  } catch (error) {
    console.error("Error validating activities:", error);
    return { success: false, error: error.message };
  }
};

// ===== HELPER FUNCTIONS =====
const checkDistanceRule = (distance, operator, value) => {
  switch (operator) {
    case ">=":
      return distance >= value;
    case "<=":
      return distance <= value;
    case "==":
      return distance === value;
    case "between":
      return distance >= value.min && distance <= value.max;
    default:
      return true;
  }
};

const checkPaceRule = (pace, operator, value) => {
  switch (operator) {
    case ">=":
      return pace >= value;
    case "<=":
      return pace <= value;
    default:
      return true;
  }
};

const checkElevationRule = (elevation, operator, value) => {
  switch (operator) {
    case ">=":
      return elevation >= value;
    case "<=":
      return elevation <= value;
    default:
      return true;
  }
};

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

// ===== GET LEADERBOARD =====
export const getLeaderboard = async (eventId) => {
  try {
    const participantsQuery = query(
      collection(db, "eventParticipants"),
      where("eventId", "==", eventId)
    );
    const participantsSnap = await getDocs(participantsQuery);

    const leaderboard = [];
    for (const pDoc of participantsSnap.docs) {
      const participant = pDoc.data();

      // Get user info
      const userSnap = await getDoc(doc(db, "users", participant.userId));
      const user = userSnap.data();

      leaderboard.push({
        userId: participant.userId,
        userName: user?.name || "Unknown",
        avatar:
          user?.avatarUrl ||
          `https://i.pravatar.cc/150?u=${participant.userId}`,
        totalPoints: participant.progress.totalPoints || 0,
        totalDistance: participant.progress.totalDistance || 0,
        totalActivities: participant.progress.totalActivities || 0,
        validActivities: participant.progress.validActivities || 0,
        completionRate: participant.progress.completionRate || 0,
      });
    }

    // Sort by points
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add ranks
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return { success: true, data: leaderboard };
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return { success: false, error: error.message };
  }
};

// ===== GET USER ACTIVITIES FOR EVENT =====
export const getUserActivitiesForEvent = async (userId, eventId) => {
  try {
    // Get event dates
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (!eventSnap.exists()) {
      return { success: false, error: "Event not found" };
    }

    const event = eventSnap.data();

    // Get user's activities in event period
    const logsQuery = query(
      collection(db, "trackLogs"),
      where("userId", "==", userId),
      where("date", ">=", event.startDate),
      where("date", "<=", event.endDate)
    );
    const logsSnap = await getDocs(logsQuery);

    const activities = logsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return { success: true, data: activities };
  } catch (error) {
    console.error("Error getting user activities:", error);
    return { success: false, error: error.message };
  }
};

// ===== CHECK IF USER REGISTERED =====
export const isUserRegistered = async (eventId, userId) => {
  try {
    const q = query(
      collection(db, "eventParticipants"),
      where("eventId", "==", eventId),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error("Error checking registration:", error);
    return false;
  }
};