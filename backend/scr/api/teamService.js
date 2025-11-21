import api from "./apiClient.js";

export const TeamService = {
  createTeam({ user_id, week_number, team_name, players, coach_id, captain_id }) {
    return api.post("team/create_team.php", {
      user_id,
      week_number,
      team_name,
      players,
      coach_id,
      captain_id
    });
  },

  getTeam({ user_id, week_number }) {
    return api.get(
      `team/get_team.php?user_id=${encodeURIComponent(user_id)}&week_number=${encodeURIComponent(week_number)}`
    );
  },

  deleteTeam({ user_team_id }) {
    return api.post("team/delete_team.php", { user_team_id });
  },

  checkTeamExists({ user_id, week_number }) {
    return api.get(
      `team/check_team_exits.php?user_id=${encodeURIComponent(user_id)}&week_number=${encodeURIComponent(week_number)}`
    );
  }
};
