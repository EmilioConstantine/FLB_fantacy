// src/core/weeklyEngine.js

const {
  calculatePlayerFantasyPoints,
  calculateCoachBonus
} = require('./scoring');

/**
 * Run weekly scoring for all users.
 * dataSource must implement:
 *   - getAllUserTeams()
 *   - getWeeklyStatsForPlayers(weekNumber, playerIds)
 *   - getCoachesByIds(coachIds)
 *   - saveUserWeekPoints(userId, weekNumber, fantasyPoints)
 *   - recomputeTotalsFromHistory()
 */
async function runWeeklyScoring(weekNumber, dataSource) {
  const teams = await dataSource.getAllUserTeams();

  if (!teams || teams.length === 0) {
    return { weekNumber, processedUsers: 0 };
  }

  const playerIdsSet = new Set();
  const coachIdsSet = new Set();

  // collect all players & coaches used
  for (const t of teams) {
    [t.player1, t.player2, t.player3, t.player4, t.player5].forEach(pid => {
      if (pid != null) playerIdsSet.add(pid);
    });
    if (t.coach != null) coachIdsSet.add(t.coach);
  }

  const playerIds = Array.from(playerIdsSet);
  const coachIds = Array.from(coachIdsSet);

  const playerStatsRows = await dataSource.getWeeklyStatsForPlayers(
    weekNumber,
    playerIds
  );
  const coachRows = await dataSource.getCoachesByIds(coachIds);

  const playerStatsMap = new Map();
  playerStatsRows.forEach(row => playerStatsMap.set(row.player_id, row));

  const coachMap = new Map();
  coachRows.forEach(c => coachMap.set(c.id, c));

  // calculate & save for each user
  for (const t of teams) {
    const pids = [
      t.player1,
      t.player2,
      t.player3,
      t.player4,
      t.player5
    ].filter(pid => pid != null);

    let weeklyPoints = 0;

    for (const pid of pids) {
      const stats = playerStatsMap.get(pid) || {};
      weeklyPoints += calculatePlayerFantasyPoints(stats);
    }

    const coachRow = coachMap.get(t.coach);
    weeklyPoints += calculateCoachBonus(coachRow);

    weeklyPoints = Math.round(weeklyPoints * 10) / 10;

    await dataSource.saveUserWeekPoints(t.user_id, weekNumber, weeklyPoints);
  }

  await dataSource.recomputeTotalsFromHistory();

  return { weekNumber, processedUsers: teams.length };
}

module.exports = { runWeeklyScoring };
