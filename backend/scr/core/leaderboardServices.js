// src/core/leaderboardServices.js

/**
 * Given an array of users with totalPoints, sort them DESC and assign ranks
 * (ties share the same rank, like real sports standings).
 *
 * rows: [
 *   { userId, username, totalPoints },
 *   ...
 * ]
 */
async function getLeaderboardWithRanks(limit, dataSource) {
  let rows = await dataSource.getLeaderboard(limit);

  // Force numeric
  rows = (rows || []).map(r => ({
    userId: r.userId,
    username: r.username,
    totalPoints: Number(r.totalPoints || 0)
  }));

  // Sort DESC by points
  rows.sort((a, b) => b.totalPoints - a.totalPoints);

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
