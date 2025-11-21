// scr/core/leaderboardServices.js

async function getLeaderboardWithRanks(limit, dataSource) {
  let rows = await dataSource.getLeaderboard(limit);

  // IMPORTANT: sort by totalPoints DESC
  rows = rows.sort((a, b) => b.totalPoints - a.totalPoints);

  let prevPoints = null;
  let rank = 0;
  let position = 0;

  const leaderboard = rows.map(u => {
    position += 1;

    if (u.totalPoints !== prevPoints) {
      rank = position;
      prevPoints = u.totalPoints;
    }

    return {
      rank,
      userId: u.userId,
      username: u.username,
      totalPoints: u.totalPoints
    };
  });

  return leaderboard;
}

module.exports = { getLeaderboardWithRanks };
