// api/strava/refresh.js - Backend để refresh token
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { refresh_token, client_id, client_secret, grant_type } = req.body;

    if (!refresh_token || !client_id || !client_secret) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log("🔄 Refreshing Strava token...");

    // Refresh with Strava
    const stravaResponse = await fetch(
      "https://www.strava.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id,
          client_secret,
          refresh_token,
          grant_type: grant_type || "refresh_token",
        }),
      }
    );

    if (!stravaResponse.ok) {
      const errorText = await stravaResponse.text();
      console.error("❌ Strava refresh error:", errorText);
      return res.status(stravaResponse.status).json({
        error: "Token refresh failed",
        details: errorText,
      });
    }

    const data = await stravaResponse.json();
    console.log("✅ Token refreshed successfully");

    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Token refresh error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}