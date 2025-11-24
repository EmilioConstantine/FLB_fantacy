// src/core/weeklyEngine.js

const {
  calculatePlayerFantasyPoints,
  calculateCoachBonus
} = require('./scoring');

/**
 * Run weekly scoring for all users.
 *
 * dataSource must implement:
 *   - getAllUserTeams(weekNumber?)  // may ignore weekNumber if not needed
 *       returns array of team rows. For tests we usually use:
 *       { user_id, player1, player2, player3, player4, player5, coach }
 *
 *   - getWeeklyStatsForPlayers(weekNumber, playerIds)
 *       returns array of weekly_stats rows:
 *       {
 *         player_id,
 *         points,
 *         rebounds,
 *         assists,
 *         steals,
 *         blocks,
 *         turnovers,
 *         fantasy_points?   // optional; if present we use it directly (PHP-style)
 *       }
 *
 *   - getCoachesByIds(coachIds)
 *       returns array of:
 *       { id, name, team, price, bonus_points }
 *
 *   - saveUserWeekPoints(userId, weekNumber, fantasyPoints)
 *       persists weekly total for that user
 *
 *   - recomputeTotalsFromHistory()
 *       recomputes totalPoints per user from all weeks (for leaderboard)
 */
async function runWeeklyScoring(weekNumber, dataSource) {
  // Allow DS to optionally use weekNumber when fetching teams
  let teams = await dataSource.getAllUserTeams(weekNumber);
  if (!teams || teams.length === 0) {
    return { weekNumber, processedUsers: 0 };
  }

  // Collect all player & coach IDs in use
  const playerIdsSet = new Set();
  const coachIdsSet = new Set();

  for (const t of teams) {
    // For now we still assume player1..player5 like the old structure.
    // Your DB adapter can map user_team_members into this shape.
    [
      t.player1,
      t.player2,
      t.player3,
      t.player4,
      t.player5
    ].forEach(pid => {
      if (pid != null) playerIdsSet.add(pid);
    });

    if (t.coach != null) coachIdsSet.add(t.coach);
  }

  const playerIds = Array.from(playerIdsSet);
  const coachIds = Array.from(coachIdsSet);

  // Pull weekly stats for all involved players
  const statsRows = await dataSource.getWeeklyStatsForPlayers(
    weekNumber,
    playerIds
  );

  // Map by player_id for quick lookup
  const statsMap = new Map();
  (statsRows || []).forEach(row => {
    statsMap.set(row.player_id, row);
  });

  // Pull coach rows
  const coachRows = await dataSource.getCoachesByIds(coachIds);
  const coachMap = new Map();
  (coachRows || []).forEach(c => {
    coachMap.set(c.id, c);
  });

  // Calculate scores per team / user
  for (const t of teams) {
    const pids = [
      t.player1,
      t.player2,
      t.player3,
      t.player4,
      t.player5
    ].filter(pid => pid != null);

    let weeklyPoints = 0;

    // Sum fantasy points for each player
    for (const pid of pids) {
      const row = statsMap.get(pid) || {};

      let fp;

      // If DB row already has fantasy_points (like PHP admin_add_stats.php),
      // use it directly so JS == PHP behavior.
      if (typeof row.fantasy_points === 'number') {
        fp = row.fantasy_points;
      } else {
        // Otherwise compute from raw stats (useful for tests / fake data)
        fp = calculatePlayerFantasyPoints(row);
      }

      weeklyPoints += fp;
    }

    // Add coach bonus
    const coachRow = coachMap.get(t.coach);
    weeklyPoints += calculateCoachBonus(coachRow);

    // Just ensure it's an integer (PHP stores int in user_points)
    weeklyPoints = Math.round(weeklyPoints);

    await dataSource.saveUserWeekPoints(t.user_id, weekNumber, weeklyPoints);
  }

  // Recompute totalPoints per user from user_points history
  await dataSource.recomputeTotalsFromHistory();

  return { weekNumber, processedUsers: teams.length };
}

module.exports = { runWeeklyScoring };
