// backend/scr/api/teamService.js
import api from "./apiClient.js";

export const TeamService = {
  /**
   * Create a team
   * Calls: team/create_team.php
   * Body:
   * {
   *   user_id,
   *   week_number,
   *   team_name,
   *   players: [ids],
   *   coach_id,
   *   captain_id
   * }
   *
   * NOTE: team-builder.js already passes the whole payload object,
   * so we just forward it as-is.
   */
  createTeam(payload) {
    return api.post("team/create_team.php", payload);
  },

  /**
   * Get team for a user + week
   * Usage in team-builder.js:
   *   TeamService.getTeam(currentUser.id, CURRENT_WEEK)
   *
   * Calls: team/get_team.php?user_id=...&week_number=...
   */
  getTeam(user_id, week_number) {
    return api.get(
      `team/get_team.php?user_id=${encodeURIComponent(
        user_id
      )}&week_number=${encodeURIComponent(week_number)}`
    );
  },

  /**
   * Check if a team exists
   * Usage in team-builder.js:
   *   TeamService.checkTeamExists(currentUser.id, CURRENT_WEEK)
   *
   * Calls: team/check_team_exits.php?user_id=...&week_number=...
   */
  checkTeamExists(user_id, week_number) {
    return api.get(
      `team/check_team_exits.php?user_id=${encodeURIComponent(
        user_id
      )}&week_number=${encodeURIComponent(week_number)}`
    );
  },

  /**
   * Delete a team for a given user/week.
   * Usage in team-builder.js:
   *   TeamService.deleteTeam({ user_id: ..., week_number: ... })
   *
   * Calls: team/delete_team.php (POST, JSON body)
   */
  deleteTeam({ user_id, week_number }) {
    return api.post("team/delete_team.php", {
      user_id,
      week_number,
    });
  },

  /**
   * Optional helper: user history
   * Calls: users/get_user_history.php?user_id=...
   */
  getUserHistory(user_id) {
    return api.get(
      `users/get_user_history.php?user_id=${encodeURIComponent(user_id)}`
    );
  },
};

export default TeamService;
