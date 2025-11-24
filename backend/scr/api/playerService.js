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
  }
};

export default PlayerService;
