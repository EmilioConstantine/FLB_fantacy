// backend/scr/api/leaderboardService.js
import api from "./apiClient.js";

/**
 * Leaderboard & stats service
 * Wraps:
 *  - leaderboard/get_leaderboard.php
 *  - users/get_user_history.php
 *  - admin/get_teams_per_week.php
 *  - admin/admin_run_weekly_scoring.php
 *  - admin/update_player_prices.php
 *  - players/get_player_stats.php (per-week player stats – you already have the PHP)
 */
export const LeaderboardService = {
  /**
   * Global leaderboard for all users.
   *   options.details = true  → add weekly_breakdown[] for each user
   */
  getLeaderboard(options = {}) {
    const details = options.details ? "1" : "0";
    const qs = details === "1" ? "?details=1" : "";
    return api.get(`leaderboard/get_leaderboard.php${qs}`);
  },

  /**
   * History for ONE user (points per week, totals, budget…)
   * Wraps backend/api/users/get_user_history.php
   */
  getUserHistory(userId) {
    return api.get(
      `users/get_user_history.php?user_id=${encodeURIComponent(userId)}`
    );
  },

  /**
   * Admin: list all teams for a given week (users + full squads)
   * Wraps backend/api/admin/get_teams_per_week.php
   */
  getTeamsForWeek(weekNumber) {
    return api.get(
      `admin/get_teams_per_week.php?week_number=${encodeURIComponent(
        weekNumber
      )}`
    );
  },

  /**
   * Admin: run weekly scoring (writes into user_points)
   * Wraps backend/api/admin/admin_run_weekly_scoring.php
   */
  runWeeklyScoring(weekNumber) {
    return api.post("admin/admin_run_weekly_scoring.php", {
      week_number: weekNumber,
    });
  },

  /**
   * Admin: recalc / insert fantasy points into user_points
   * (your update_team.php – you may use either this OR runWeeklyScoring)
   */
  recalcWeekFromTeams(weekNumber) {
    return api.post("team/update_team.php", { week_number: weekNumber });
  },

  /**
   * Admin: batch price update
   *   updates = [ { player_id, new_price }, ... ]
   * Wraps backend/api/admin/update_player_prices.php
   */
  updatePlayerPricesBatch(updates) {
    return api.post("admin/update_player_prices.php", {
      mode: "batch",
      updates,
    });
  },

  /**
   * Admin: update a single player's price.
   */
  updateSinglePlayerPrice(playerId, newPrice) {
    return api.post("admin/update_player_prices.php", {
      mode: "single",
      player_id: playerId,
      new_price: newPrice,
    });
  },

  /**
   * Player stats for ONE team / week (for “My Stats” page).
   * Assumes you have backend/api/players/get_player_stats.php
   * that accepts user_id + week_number (or adapt as needed).
   *
   * Example expected JSON:
   * { success:true, players:[{id,name,team,points}, ...] }
   */
  getPlayerStatsForUserWeek(userId, weekNumber) {
    return api.get(
      `players/get_player_stats.php?user_id=${encodeURIComponent(
        userId
      )}&week_number=${encodeURIComponent(weekNumber)}`
    );
  },
    /**
   * Weekly leaderboard (one week)
   * Wraps backend/api/leaderboard/get_week_leaderboard.php?week_number=...
   */
  getWeekLeaderboard(weekNumber) {
    return api.get(
      `leaderboard/get_week_leaderboard.php?week_number=${encodeURIComponent(weekNumber)}`
    );
  },

};

export default LeaderboardService;
