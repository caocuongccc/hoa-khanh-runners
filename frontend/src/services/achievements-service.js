const ACHIEVEMENTS = [
  {
    id: "first_100km",
    name: "100km đầu tiên",
    description: "Chạy tổng 100km",
    icon: "🏆",
    condition: (stats) => stats.totalDistance >= 100,
  },
  {
    id: "consistent_runner",
    name: "Chạy đều đặn",
    description: "Hoàn thành 10 hoạt động hợp lệ",
    icon: "⭐",
    condition: (stats) => stats.validActivities >= 10,
  },
  {
    id: "speed_demon",
    name: "Tốc độ quỷ",
    description: "Pace trung bình dưới 5:00/km",
    icon: "⚡",
    condition: (stats) => stats.avgPace < 300,
  },
  {
    id: "mountain_climber",
    name: "Leo núi",
    description: "Tổng độ cao >= 1000m",
    icon: "⛰️",
    condition: (stats) => stats.totalElevation >= 1000,
  },
];

export const checkAndAwardAchievements = async (userId, stats) => {
  const newAchievements = [];

  for (const achievement of ACHIEVEMENTS) {
    if (achievement.condition(stats)) {
      newAchievements.push(achievement);
    }
  }

  if (newAchievements.length > 0) {
    await updateDoc(doc(db, "users", userId), {
      achievements: arrayUnion(...newAchievements.map((a) => a.id)),
      lastAchievementAt: Timestamp.now(),
    });
  }

  return newAchievements;
};
