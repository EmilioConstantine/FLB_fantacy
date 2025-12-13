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

/* ---------- TEAM COLORS (robust matching) ---------- */
const TEAM_COLORS = {
  sagesse:  "#16a34a", // green
  riyadi:   "#dc2626", // red
  antranik: "#f59e0b", // amber
  byblos:   "#2563eb", // blue
  // add more teams if needed:
  // champville: "#7c3aed",
};

function normalizeTeamName(teamName) {
  return String(teamName || "").trim().toLowerCase();
}

function teamToColor(teamName) {
  const t = normalizeTeamName(teamName);
  if (!t) return null;

  // exact
  if (TEAM_COLORS[t]) return TEAM_COLORS[t];

  // partial (ex: "Sagesse SC")
  for (const key of Object.keys(TEAM_COLORS)) {
    if (t.includes(key)) return TEAM_COLORS[key];
  }
  return null;
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

    // --- TEAM COLORED CIRCLE ---
    const badge = document.createElement("div");
    badge.className =
      "w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold shadow";

    const teamCode = (p.team || "?").toString().slice(0, 3).toUpperCase();
    badge.textContent = teamCode;

    const color = teamToColor(p.team) || "#9ca3af"; // fallback gray
    badge.style.backgroundColor = color;

    // Optional: a subtle ring
    badge.style.border = "2px solid rgba(255,255,255,0.85)";

    const nameBlock = document.createElement("div");

    const name = document.createElement("div");
    name.className = "text-sm font-semibold";

    const isCaptain =
      p.is_captain === 1 || p.is_captain === "1" || p.is_captain === true;

    const cap = isCaptain ? " (C)" : "";
    name.textContent = (p.name || `Player #${p.player_id}`) + cap;

    const sub = document.createElement("div");
    sub.className = "text-[11px] text-gray-500";
    sub.textContent = p.team ? p.team : "";

    nameBlock.append(name, sub);
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
  const user = AuthService.getCurrentUser ? AuthService.getCurrentUser() : null;

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
      renderPlayerPerformance([]);
      return;
    }

    // Last gameweek where the user has points
    const last = history[history.length - 1];
    const weekNumber = last.week_number;

    // 2) Get player stats for that week
    await fetchPlayerStatsForLastWeek(user.id, weekNumber);
  } catch (err) {
    console.error("My stats exception", err);
    renderPlayerPerformance([]);
  }
}

document.addEventListener("DOMContentLoaded", init);
