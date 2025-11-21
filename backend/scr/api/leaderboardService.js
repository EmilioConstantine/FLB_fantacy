// backend/scr/api/leaderboardService.js
import api from "./apiClient.js";

export const LeaderboardAPI = {
  getLeaderboard() {
    return api.get("leaderboard/get_leaderboard.php");
  }
};
