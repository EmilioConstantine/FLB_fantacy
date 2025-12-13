// backend/scr/api/adminService.js
import api from "./apiClient.js";

export const AdminService = {
    /**
   * Check current admin session
   * Calls: admin/me.php
   * Returns: { success: true, admin: {...} } or { success:false }
   */
  me() {
    return api.get("admin/me.php");
  },

  /**
   * Logout admin (destroy session)
   * Calls: admin/logout.php
   */
  logout() {
    return api.post("admin/logout.php", {});
  },

  /**
   * Admin login
   * Calls: admin/login.php
   * Body: { username, password }
   */
  login({ username, password }) {
    return api.post("admin/login.php", { username, password });
  },

  /**
   * Add Player
   * Calls: admin/admin_add_players.php
   * Body: { type: "player", name, team, position, price }
   */
  addPlayer({ name, team, position, price }) {
    return api.post("admin/admin_add_players.php", {
      type: "player",
      name,
      team,
      position,
      price
    });
  },

  /**
   * Add Coach
   * Calls: admin/admin_add_players.php
   * Body: { type: "coach", name, team, price, bonus_points }
   */
  addCoach({ name, team, price, bonus_points }) {
    return api.post("admin/admin_add_players.php", {
      type: "coach",
      name,
      team,
      price,
      bonus_points
    });
  },

  /**
   * Add / Update weekly stats
   * Calls: admin/admin_add_stats.php
   * Body: { week_number, stats: [ { player_id, points, rebounds, ... } ] }
   */
  addStats(payload) {
    // payload is already in the correct format (same as test HTML)
    return api.post("admin/admin_add_stats.php", payload);
  },

  /**
   * Get all teams for a week
   * Calls: admin/get_teams_per_week.php?week_number=...
   */
  getTeamsForWeek(week_number) {
    return api.get(
      `admin/get_teams_per_week.php?week_number=${encodeURIComponent(
        week_number
      )}`
    );
  },

  /**
   * Optional, if you later create this PHP:
   * Calls: admin/update_player_prices.php
   */
  updatePlayerPrices() {
    return api.get("admin/update_player_prices.php");
  }
};

export default AdminService;
