// scr/api/teamService.js

import api from "./apiClient.js";

export const TeamService = {

    create: (userId, players, coach) =>
        api.post("team/create_team.php", {
            user_id: userId,
            players,
            coach
        }),

    update: (userId, players, coach) =>
        api.post("team/update_team.php", {
            user_id: userId,
            players,
            coach
        }),

    delete: (userId) =>
        api.post("team/delete_team.php", { user_id: userId }),

    get: (userId) =>
        api.get(`team/get_team.php?user_id=${userId}`),

    exists: (userId) =>
        api.get(`team/check_team_exits.php?user_id=${userId}`)
};
