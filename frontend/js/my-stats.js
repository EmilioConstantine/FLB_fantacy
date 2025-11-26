// frontend/js/my-stats.js

import * as AuthMod from "../../backend/scr/api/authService.js";
import * as LbMod from "../../backend/scr/api/leaderboardService.js";
import * as PlayerMod from "../../backend/scr/api/playerService.js";

const AuthService =
  AuthMod.AuthService || AuthMod.default || AuthMod.authService || AuthMod;

const LeaderboardService =
  LbMod.LeaderboardService || LbMod.default || LbMod.leaderboardService || LbMod;

const PlayerService =
  PlayerMod.PlayerService || PlayerMod.default || PlayerMod.playerService || PlayerMod;

function el(id) {
  return document.getElementById(id);
}

/* ---------- TOP CARD RENDERING (already fine) ---------- */

function renderUserOverview(historyRes) {
  const totals = historyRes.totals || {};
  const history = historyRes.history || [];

  const last = history.length ? history[history.length - 1] : null;

  el("stat-gameweek").textContent = last ? last.week_number : "-";
  el("stat-week-points").textContent = last ? last.fantasy_points : 0;
  el("stat-total-points").textContent = totals.total_points ?? 0;
  el("stat-avg-points").textContent = totals.average_points ?? 0;
}

/* ---------- PLAYER PERFORMANCE LIST ---------- */

function renderPlayerPerformance(list) {
  const container = el("player-performance");
  container.innerHTML = "";

  if (!list || !list.length) {
    const p = document.createElement("p");
    p.className = "text-sm text-gray-500";
    p.textContent = "No player stats for this gameweek yet.";
    container.appendChild(p);
    return;
  }

  list.forEach((p) => {
    const row = document.createElement("div");
    row.className =
      "bg-white rounded-2xl shadow flex items-center justify-between px-4 py-3";

    const left = document.createElement("div");
    left.className = "flex items-center gap-3";

    const badge = document.createElement("div");
    badge.className =
      "w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold";
    // use first 3 letters of team name as badge
    const teamCode = (p.team || "?").toString().slice(0, 3).toUpperCase();
    badge.textContent = teamCode;

    const nameBlock = document.createElement("div");

    const name = document.createElement("div");
    name.className = "text-sm font-semibold";
    const cap = p.is_captain ? " (C)" : "";
    name.textContent = (p.name || `Player #${p.player_id}`) + cap;

    const vs = document.createElement("div");
    vs.className = "text-[11px] text-gray-500";
    // if later you store opponent, you can show it here
    vs.textContent = ""; 

    nameBlock.append(name, vs);
    left.append(badge, nameBlock);

    const pts = document.createElement("div");
    pts.className = "text-sm font-bold text-flb-green";
    pts.textContent = (p.fantasy_points ?? 0) + " pts";

    row.append(left, pts);
    container.appendChild(row);
  });
}

/* ---------- FETCH PLAYER STATS FOR LAST GAMEWEEK ---------- */

async function fetchPlayerStatsForLastWeek(userId, lastWeekNumber) {
  try {
    const res = await PlayerService.getUserTeamWeekStats(userId, lastWeekNumber);

    if (!res.success) {
      console.warn("No player stats:", res);
      renderPlayerPerformance([]);
      return;
    }

    const players = res.players || [];
    renderPlayerPerformance(players);
  } catch (err) {
    console.error("Error loading player stats", err);
    renderPlayerPerformance([]);
  }
}

/* ---------- MAIN INIT ---------- */

async function init() {
  const user = AuthService.getCurrentUser
    ? AuthService.getCurrentUser()
    : null;

  if (!user) {
    alert("Please login to view your stats.");
    window.location.href = "login.html";
    return;
  }

  try {
    // 1) Get user history / totals from user_points
    const histRes = await LeaderboardService.getUserHistory(user.id);
    if (!histRes.success) {
      console.error("History error", histRes);
      return;
    }

    renderUserOverview(histRes);

    const history = histRes.history || [];
    if (!history.length) {
      // user has never scored, so no per-player stats
      renderPlayerPerformance([]);
      return;
    }

    // Last gameweek where the user has points
    const last = history[history.length - 1];
    const weekNumber = last.week_number;

    // 2) Get player stats for that week (using new PHP)
    await fetchPlayerStatsForLastWeek(user.id, weekNumber);
  } catch (err) {
    console.error("My stats exception", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
