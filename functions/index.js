// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// Webhook endpoint
exports.stravaWebhook = functions.https.onRequest(async (req, res) => {
  console.log('📥 Webhook received:', req.method, req.query, req.body);

  // GET: Strava verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = 'hoa_khanh_runners_2025'; // ← Đặt token tùy ý

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      return res.json({ 'hub.challenge': challenge });
    }
    
    console.log('❌ Verification failed');
    return res.status(403).send('Forbidden');
  }

  // POST: Handle events
  if (req.method === 'POST') {
    const event = req.body;
    
    console.log('🎯 Event type:', event.object_type, event.aspect_type);

    // Only process new activities
    if (event.object_type === 'activity' && event.aspect_type === 'create') {
      const athleteId = event.owner_id;
      const activityId = event.object_id;

      try {
        // Find user by Strava athlete ID
        const usersSnapshot = await admin
          .firestore()
          .collection('users')
          .where('stravaIntegration.athleteId', '==', athleteId.toString())
          .limit(1)
          .get();

        if (usersSnapshot.empty) {
          console.log('⚠️ User not found for athlete:', athleteId);
          return res.status(200).send('User not found');
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const accessToken = userData.stravaIntegration?.accessToken;

        if (!accessToken) {
          console.log('❌ No access token for user');
          return res.status(200).send('No access token');
        }

        // Fetch activity details
        console.log('🔍 Fetching activity:', activityId);
        const activityResponse = await fetch(
          `https://www.strava.com/api/v3/activities/${activityId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        if (!activityResponse.ok) {
          console.log('❌ Failed to fetch activity:', activityResponse.status);
          return res.status(200).send('Failed to fetch activity');
        }

        const activity = await activityResponse.json();
        console.log('✅ Activity fetched:', activity.name);

        // Helper functions
        const formatDuration = (seconds) => {
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          const s = seconds % 60;
          return `${h}h ${m}m ${s}s`;
        };

        const formatPace = (seconds) => {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}/km`;
        };

        // Prepare trackLog
        const trackLog = {
          userId: userDoc.id,
          stravaActivityId: activity.id.toString(),
          name: activity.name,
          date: activity.start_date.split('T')[0],
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
          type: activity.type || 'Run',
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
          syncMethod: 'webhook',
        };

        // Check if exists
        const existingQuery = await admin
          .firestore()
          .collection('trackLogs')
          .where('stravaActivityId', '==', activity.id.toString())
          .limit(1)
          .get();

        if (!existingQuery.empty) {
          console.log('⚠️ Activity already exists');
          return res.status(200).send('Activity exists');
        }

        // Save to Firestore
        await admin.firestore().collection('trackLogs').add(trackLog);
        console.log('✅ Activity saved to Firestore');

        return res.status(200).send('SUCCESS');
      } catch (error) {
        console.error('❌ Error processing webhook:', error);
        return res.status(200).send('Error: ' + error.message);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method not allowed');
});