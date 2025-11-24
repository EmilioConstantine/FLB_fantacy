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
   */
  createTeam({
    user_id,
    week_number,
    team_name,
    players,
    coach_id,
    captain_id
  }) {
    return api.post("team/create_team.php", {
      user_id,
      week_number,
      team_name,
      players,
      coach_id,
      captain_id
    });
  },

  /**
   * Get team for a user + week
   * Calls: team/get_team.php?user_id=...&week_number=...
   */
  getTeam({ user_id, week_number }) {
    return api.get(
      `team/get_team.php?user_id=${encodeURIComponent(
        user_id
      )}&week_number=${encodeURIComponent(week_number)}`
    );
  },

  /**
   * Check if a team exists (if you have team/check_team_exits.php)
   * Calls: team/check_team_exits.php?user_id=...&week_number=...
   */
  checkTeamExists({ user_id, week_number }) {
    return api.get(
      `team/check_team_exits.php?user_id=${encodeURIComponent(
        user_id
      )}&week_number=${encodeURIComponent(week_number)}`
    );
  },

  /**
   * Optional helper mirroring your test HTML:
   * Calls: users/get_user_history.php?user_id=...
   */
  getUserHistory(user_id) {
    return api.get(
      `users/get_user_history.php?user_id=${encodeURIComponent(user_id)}`
    );
  }
};

export default TeamService;
