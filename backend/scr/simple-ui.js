// backend/scr/simple-ui.js
import { AdminService } from "./api/adminService.js";
import { PlayerService } from "./api/playerService.js";
import { LeaderboardAPI } from "./api/leaderboardService.js";

function showJson(id, data) {
  const el = document.getElementById(id);
  el.textContent = JSON.stringify(data, null, 2);
}

/* -------- 1) ADD PLAYER (unchanged) -------- */
document.getElementById("btnAddPlayer")?.addEventListener("click", async () => {
  const name = document.getElementById("p_name").value.trim();
  const team = document.getElementById("p_team").value.trim();
  const position = document.getElementById("p_position").value.trim().toUpperCase();
  const price = Number(document.getElementById("p_price").value);

  const res = await AdminService.addPlayer({ name, team, position, price });
  showJson("outAddPlayer", res);
});

/* -------- 2) LOAD PLAYERS (optional) -------- */
document.getElementById("btnLoadPlayers")?.addEventListener("click", async () => {
  const res = await PlayerService.getAll();
  showJson("outPlayers", res);
});

/* -------- 3) ADD WEEKLY STATS -------- */
document.getElementById("btnAddStats")?.addEventListener("click", async () => {
  const player_id   = Number(document.getElementById("s_player_id").value);
  const week_number = Number(document.getElementById("s_week").value);

  const statRecord = {
    player_id,
    points:    Number(document.getElementById("s_points").value    || 0),
    rebounds:  Number(document.getElementById("s_rebounds").value  || 0),
    assists:   Number(document.getElementById("s_assists").value   || 0),
    steals:    Number(document.getElementById("s_steals").value    || 0),
    blocks:    Number(document.getElementById("s_blocks").value    || 0),
    turnovers: Number(document.getElementById("s_turnovers").value || 0),
    minutes:   Number(document.getElementById("s_minutes").value   || 0)
    // If you add a Match ID field later:
    // match_id: Number(document.getElementById("s_match_id").value || 0)
  };

  const payload = {
    week_number,
    stats: [statRecord]
  };

  const res = await AdminService.addStats(payload);
  showJson("outStats", res);
});

/* -------- 4) LEADERBOARD (optional) -------- */
document.getElementById("btnLeaderboard")?.addEventListener("click", async () => {
  const res = await LeaderboardAPI.getLeaderboard();
  showJson("outLeaderboard", res);
});
