// api/strava/token.js - Backend để xử lý token exchange (tránh CORS)
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, client_id, client_secret, grant_type } = req.body;

    if (!code || !client_id || !client_secret) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log("🔄 Exchanging Strava token...");

    // Exchange with Strava
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
          code,
          grant_type: grant_type || "authorization_code",
        }),
      }
    );

    if (!stravaResponse.ok) {
      const errorText = await stravaResponse.text();
      console.error("❌ Strava error:", errorText);
      return res.status(stravaResponse.status).json({
        error: "Strava authentication failed",
        details: errorText,
      });
    }

    const data = await stravaResponse.json();
    console.log("✅ Token exchanged successfully");

    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Token exchange error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}