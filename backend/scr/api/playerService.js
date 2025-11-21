// backend/scr/api/playerService.js
import api from "./apiClient.js";

export const PlayerService = {
  getAll() {
    return api.get("players/get_all_players.php");
  },

  getStats(playerId) {
    return api.get(`players/get_player_stats.php?player_id=${encodeURIComponent(playerId)}`);
  },

  search(name) {
    return api.get(`players/search_players.php?name=${encodeURIComponent(name)}`);
  }
};
