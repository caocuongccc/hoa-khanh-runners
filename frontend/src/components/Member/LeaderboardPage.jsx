import React, { useState, useEffect } from "react";
import { Award, TrendingUp } from "lucide-react";
import { getLeaderboard } from "../../services/member-service";
import { onSnapshot, query, collection, where } from "firebase/firestore";

const LeaderboardPage = ({ eventId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const participantsQuery = query(
      collection(db, "eventParticipants"),
      where("eventId", "==", eventId)
    );

    const unsubscribe = onSnapshot(participantsQuery, async (snapshot) => {
      // Reload leaderboard khi có thay đổi
      await loadLeaderboard();
    });

    return () => unsubscribe();
  }, [eventId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const result = await getLeaderboard(eventId);
    if (result.success) {
      setLeaderboard(result.data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Podium Top 3 */}
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="flex items-end justify-center gap-4">
          {/* Rank 2 */}
          {leaderboard[1] && (
            <div className="flex flex-col items-center">
              <img
                src={leaderboard[1].avatar}
                className="w-20 h-20 rounded-full border-4 border-gray-400 mb-2"
              />
              <Award className="w-8 h-8 text-gray-400 mb-2" />
              <p className="font-bold">{leaderboard[1].userName}</p>
              <p className="text-2xl font-bold text-gray-400">
                {leaderboard[1].totalPoints}
              </p>
              <div className="w-24 h-32 bg-gray-200 mt-4 rounded-t-lg flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-500">2</span>
              </div>
            </div>
          )}

          {/* Rank 1 */}
          {leaderboard[0] && (
            <div className="flex flex-col items-center">
              <img
                src={leaderboard[0].avatar}
                className="w-24 h-24 rounded-full border-4 border-yellow-500 mb-2"
              />
              <Award className="w-10 h-10 text-yellow-500 mb-2" />
              <p className="font-bold">{leaderboard[0].userName}</p>
              <p className="text-3xl font-bold text-yellow-500">
                {leaderboard[0].totalPoints}
              </p>
              <div className="w-24 h-40 bg-yellow-200 mt-4 rounded-t-lg flex items-center justify-center">
                <span className="text-5xl font-bold text-yellow-600">1</span>
              </div>
            </div>
          )}

          {/* Rank 3 */}
          {leaderboard[2] && (
            <div className="flex flex-col items-center">
              <img
                src={leaderboard[2].avatar}
                className="w-20 h-20 rounded-full border-4 border-orange-600 mb-2"
              />
              <Award className="w-8 h-8 text-orange-600 mb-2" />
              <p className="font-bold">{leaderboard[2].userName}</p>
              <p className="text-2xl font-bold text-orange-600">
                {leaderboard[2].totalPoints}
              </p>
              <div className="w-24 h-28 bg-orange-200 mt-4 rounded-t-lg flex items-center justify-center">
                <span className="text-4xl font-bold text-orange-600">3</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hạng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Người chơi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Khoảng cách
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hoạt động
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Điểm
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaderboard.map((item) => (
              <tr key={item.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {item.rank <= 3 ? (
                      <Award
                        className={`w-6 h-6 ${
                          item.rank === 1
                            ? "text-yellow-500"
                            : item.rank === 2
                            ? "text-gray-400"
                            : "text-orange-600"
                        }`}
                      />
                    ) : (
                      <span className="font-bold text-gray-600">
                        {item.rank}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={item.avatar} className="w-10 h-10 rounded-full" />
                    <span className="font-semibold">{item.userName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-bold">
                  {item.totalDistance.toFixed(1)} km
                </td>
                <td className="px-6 py-4">
                  {item.validActivities}/{item.totalActivities}
                </td>
                <td className="px-6 py-4 font-bold text-blue-600">
                  {item.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardPage;
