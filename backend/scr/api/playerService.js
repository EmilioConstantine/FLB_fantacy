// backend/scr/api/playerService.js
import api from "./apiClient.js";

/**
 * PlayerService
 *
 * Matches backend/api/players/get_all_players.php
 * Optional filters:
 *   team       : string
 *   position   : string
 *   max_price  : number
 *   sort       : "price" | "name"
 *   order      : "ASC" | "DESC"
 */
export const PlayerService = {
  /**
   * Main function: get all players with optional filters.
   *
   * Example:
   *   PlayerService.getAllPlayers({ position: "PG", max_price: 10 });
   */
  getAllPlayers(filters = {}) {
    const params = new URLSearchParams();

    if (filters.team) {
      params.append("team", filters.team);
    }
    if (filters.position) {
      params.append("position", filters.position);
    }
    if (filters.max_price != null && filters.max_price !== "") {
      params.append("max_price", filters.max_price);
    }
    if (filters.sort) {
      params.append("sort", filters.sort); // PHP validates allowed values
    }
    if (filters.order) {
      params.append("order", filters.order); // ASC / DESC
    }

    const query = params.toString();
    const endpoint = query
      ? `players/get_all_players.php?${query}`
      : "players/get_all_players.php";

    return api.get(endpoint);
  },

  /**
   * Simple alias so you can call PlayerService.getAll()
   */
  getAll(filters = {}) {
    return this.getAllPlayers(filters);
  },

  /**
   * NEW:
   * Get stats for ALL players in a user's team for a given week.
   * Wraps backend/api/players/get_user_team_week_stats.php
   *
   * Returns something like:
   * {
   *   success: true,
   *   user_id: 8,
   *   week_number: 1,
   *   team: { id: 3, name: "jimmy Team" },
   *   players: [
   *     { player_id, name, team, position, is_captain, fantasy_points, ... },
   *     ...
   *   ]
   * }
   */
  getUserTeamWeekStats(userId, weekNumber) {
    return api.get(
      `players/get_user_team_week_stats.php?user_id=${encodeURIComponent(
        userId
      )}&week_number=${encodeURIComponent(weekNumber)}`
    );
  }
};

export default PlayerService;
