// backend/scr/api/leaderboardService.js
import api from "./apiClient.js";

/**
 * Service for leaderboard/get_leaderboard.php
 */
export const LeaderboardService = {
  /**
   * Fetch the leaderboard
   * Calls: leaderboard/get_leaderboard.php
   */
  getLeaderboard() {
    return api.get("leaderboard/get_leaderboard.php");
  }
};

export default LeaderboardService;
