// backend/scr/api/teamService.js
import api from "./apiClient.js";

export const TeamService = {
  /**
   * Create a team for a user.
   * payload = {
   *   user_id: number,
   *   week_number: number,
   *   team_name: string,
   *   players: number[],      // [playerId1, playerId2, ...]
   *   coach_id: number,
   *   captain_id: number      // must be one of players[]
   * }
   */
  createTeam(payload) {
    return api.post("team/create_team.php", payload);
  },

  /**
   * Optional helpers for later:
   */
  getTeam({ user_id, week_number }) {
    return api.get(
      `team/get_team.php?user_id=${encodeURIComponent(user_id)}&week_number=${encodeURIComponent(week_number)}`
    );
  },

  checkTeamExists({ user_id, week_number }) {
    return api.get(
      `team/check_team_exits.php?user_id=${encodeURIComponent(user_id)}&week_number=${encodeURIComponent(week_number)}`
    );
  }
};
