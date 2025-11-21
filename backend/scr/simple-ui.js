// backend/scr/simple-ui.js
import { AdminService } from "./api/adminService.js";
import { PlayerService } from "./api/playerService.js";
import { LeaderboardAPI } from "./api/leaderboardService.js";
import { AuthService } from "./api/authService.js";
import { TeamService } from "./api/teamService.js";

function showJson(id, data) {
  document.getElementById(id).textContent = JSON.stringify(data, null, 2);
}

/* ========= 0) REGISTER ========= */
document.getElementById("btnRegister").addEventListener("click", async () => {
  const username = document.getElementById("r_username").value.trim();
  const email = document.getElementById("r_email").value.trim();
  const password = document.getElementById("r_password").value;

  const res = await AuthService.register({ username, email, password });
  showJson("outRegister", res);
});

/* ========= 0b) LOGIN / LOGOUT ========= */
document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("l_email").value.trim();
  const password = document.getElementById("l_password").value;

  const res = await AuthService.login({ email, password });
  showJson("outLogin", res);
});

document.getElementById("btnLogout").addEventListener("click", () => {
  AuthService.logout();
  showJson("outLogin", { success: true, message: "Logged out", user: null });
});

/* ========= 1) ADD PLAYER ========= */
document.getElementById("btnAddPlayer").addEventListener("click", async () => {
  const name = document.getElementById("p_name").value.trim();
  const team = document.getElementById("p_team").value.trim();
  const position = document.getElementById("p_position").value.trim().toUpperCase();
  const price = Number(document.getElementById("p_price").value);

  const res = await AdminService.addPlayer({ name, team, position, price });
  showJson("outAddPlayer", res);
});

/* ========= 2) LOAD PLAYERS ========= */
document.getElementById("btnLoadPlayers").addEventListener("click", async () => {
  const res = await PlayerService.getAll();
  showJson("outPlayers", res);
});

/* ========= 3) ADD WEEKLY STATS ========= */
document.getElementById("btnAddStats").addEventListener("click", async () => {
  const statRecord = {
    player_id: Number(document.getElementById("s_player_id").value),
    points: Number(document.getElementById("s_points").value || 0),
    rebounds: Number(document.getElementById("s_rebounds").value || 0),
    assists: Number(document.getElementById("s_assists").value || 0),
    steals: Number(document.getElementById("s_steals").value || 0),
    blocks: Number(document.getElementById("s_blocks").value || 0),
    turnovers: Number(document.getElementById("s_turnovers").value || 0),
    minutes: Number(document.getElementById("s_minutes").value || 0),
  };

  const body = {
    week_number: Number(document.getElementById("s_week").value),
    stats: [statRecord],
  };

  const res = await AdminService.addStats(body);
  showJson("outStats", res);
});

/* ========= 4) LEADERBOARD ========= */
document.getElementById("btnLeaderboard").addEventListener("click", async () => {
  const res = await LeaderboardAPI.getLeaderboard();
  showJson("outLeaderboard", res);
});

/* ========= 5) CREATE TEAM ========= */
document.getElementById("btnCreateTeam").addEventListener("click", async () => {
  // For test, either use manual user_id or get from AuthService
  const userInputId = Number(document.getElementById("t_user_id").value);
  const user = AuthService.getCurrentUser();
  const user_id = user ? user.id : userInputId;

  const week_number = Number(document.getElementById("t_week").value);
  const team_name = document.getElementById("t_team_name").value.trim();
  const players = document
    .getElementById("t_players")
    .value.split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => !Number.isNaN(x) && x > 0);

  const coach_id = Number(document.getElementById("t_coach_id").value);
  const captain_id = Number(document.getElementById("t_captain_id").value);

  const res = await TeamService.createTeam({
    user_id,
    week_number,
    team_name,
    players,
    coach_id,
    captain_id,
  });

  showJson("outCreateTeam", res);
});

/* ========= 6) GET USER TEAM ========= */
document.getElementById("btnGetTeam").addEventListener("click", async () => {
  const user_id = Number(document.getElementById("gt_user_id").value);
  const week_number = Number(document.getElementById("gt_week").value);

  const res = await TeamService.getTeam({ user_id, week_number });
  showJson("outGetTeam", res);
});

/* ========= 7) Weekly engine (optional if you have endpoint) ========= */
// document.getElementById("btnWeeklyEngine")?.addEventListener("click", async () => {
//   const week_number = Number(document.getElementById("we_week").value);
//   const res = await api.post("admin/run_weekly_points.php", { week_number });
//   showJson("outEngine", res);
// });
