// src/core/leaderboardService.js

/**
 * Build leaderboard with ranks & ties using the dataSource.
 * dataSource.getLeaderboard(limit) must return:
 *   [{ userId, username, totalPoints }, ...]
 */
async function getLeaderboardWithRanks(limit, dataSource) {
  const rows = await dataSource.getLeaderboard(limit);

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
