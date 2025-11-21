// backend/scr/api/adminService.js
import api from "./apiClient.js";

export const AdminService = {
  // Add a player via admin_add_players.php
  addPlayer({ name, team, position, price }) {
    return api.post("admin/admin_add_players.php", {
      type: "player",          // PHP requires this
      name,
      team,
      position,
      price
    });
  },

  // Add a coach via admin_add_players.php (same file, different type)
  addCoach({ name, team, price, bonus_points }) {
    return api.post("admin/admin_add_players.php", {
      type: "coach",           // PHP requires this
      name,
      team,
      price,
      bonus_points
    });
  },

  // Add weekly stats via admin_add_stats.php
  // payload = { week_number, stats: [ { player_id, points, rebounds, ... } ] }
  addStats(payload) {
    return api.post("admin/admin_add_stats.php", payload);
  },

  // Trigger price update
  updatePlayerPrices() {
    return api.get("admin/update_player_prices.php");
  }
};
