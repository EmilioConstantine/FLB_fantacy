// frontend/js/admin-dashboard.js
import * as LbMod from "../../backend/scr/api/leaderboardService.js";
import * as ScoreMod from "../../backend/scr/api/scoringService.js";
import * as AdminMod from "../../backend/scr/api/adminService.js";

const LeaderboardService = LbMod.LeaderboardService || LbMod.default || LbMod;
const ScoringService = ScoreMod.ScoringService || ScoreMod.default || ScoreMod;
const AdminService = AdminMod.AdminService || AdminMod.default || AdminMod;

/* =========================
   NICE UI HELPERS
   ========================= */

function uiToastSafe(message) {
  if (window.uiToast) return window.uiToast(message);
  console.log("[toast]", message);
}

function uiAlertSafe({ type = "info", titleText = "Info", subText = "", message = "" }) {
  if (window.uiAlert) return window.uiAlert({ type, titleText, subText, message });
  alert(`${titleText}\n${subText ? subText + "\n" : ""}${message}`);
}

async function uiConfirmSafe({
  titleText = "Confirm",
  subText = "",
  message = "Are you sure?",
  okText = "Confirm",
  cancelText = "Cancel",
} = {}) {
  if (window.uiConfirm) return await window.uiConfirm({ titleText, subText, message, okText, cancelText });
  return confirm(message || titleText);
}

function log(msg) {
  const box = document.getElementById("admin-log");
  if (!box) return;
  box.textContent += msg + "\n";
  box.scrollTop = box.scrollHeight;
}

function getWeek() {
  const n = parseInt(document.getElementById("admin-week")?.value, 10);
  return Number.isNaN(n) ? 1 : n;
}

/* =========================
   CURRENT WEEK UI (NEW)
   ========================= */

function setCurrentWeekPillText(week) {
  const pill = document.getElementById("current-week-pill");
  if (!pill) return;
  const w = Number(week);
  pill.textContent = Number.isFinite(w) ? `Current: ${w}` : "Current: —";
}

async function refreshCurrentWeekUI() {
  try {
    // must exist in AdminService (see instructions)
    const res = await AdminService.getCurrentWeek?.();

    if (!res?.success) {
      setCurrentWeekPillText(null);
      return;
    }

    setCurrentWeekPillText(res.current_week);

    // optional: also set the input to current week for convenience
    const weekInput = document.getElementById("admin-week");
    if (weekInput && res.current_week != null) weekInput.value = res.current_week;
  } catch (err) {
    console.error("refreshCurrentWeekUI error:", err);
    setCurrentWeekPillText(null);
  }
}

async function handleSetCurrentWeek() {
  const week = getWeek();

  const ok = await uiConfirmSafe({
    titleText: "Set current week?",
    subText: `Week ${week}`,
    message: "This will change the active week used by the app (team builder & scoring).",
    okText: "Yes, Set Week",
    cancelText: "Cancel",
  });

  if (!ok) return;

  try {
    // must exist in AdminService (see instructions)
    const res = await AdminService.setCurrentWeek?.(week);

    if (!res?.success) {
      uiAlertSafe({
        type: "error",
        titleText: "Set week failed",
        subText: `Week ${week}`,
        message: res?.message || "Server refused the change.",
      });
      return;
    }

    uiToastSafe(`Current week set to ${week} ✅`);
    setCurrentWeekPillText(week);

    // refresh lock status UI because admin-week might change
    await refreshWeekLockUI();
  } catch (err) {
    console.error(err);
    uiAlertSafe({
      type: "error",
      titleText: "Network error",
      subText: "Set current week",
      message: err?.message || "Failed to set current week.",
    });
  }
}

/* =========================
   TEAMS TABLE
   ========================= */

function renderTeamsTable(res) {
  const container = document.getElementById("teams-table");
  if (!container) return;

  container.innerHTML = "";

  if (!res?.success || !res.teams || !res.teams.length) {
    container.innerHTML = `<div class="p-3 text-sm text-gray-600">No teams found.</div>`;
    return;
  }

  const table = document.createElement("table");
  table.className = "w-full text-left border-collapse";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr class="bg-gray-50">
      <th class="px-2 py-2 border text-[11px]">User</th>
      <th class="px-2 py-2 border text-[11px]">Team</th>
      <th class="px-2 py-2 border text-[11px]">Week</th>
      <th class="px-2 py-2 border text-[11px]">Players</th>
      <th class="px-2 py-2 border text-[11px]">Coach</th>
      <th class="px-2 py-2 border text-[11px]">Cost</th>
      <th class="px-2 py-2 border text-[11px]">Budget left</th>
    </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  res.teams.forEach((t) => {
    const tr = document.createElement("tr");
    tr.className = "border-t";

    const playersNames = (t.players || [])
      .map((p) => (p.is_captain ? `${p.name} (C)` : p.name))
      .join(", ");

    const coachName = t.coach ? t.coach.name : "-";

    tr.innerHTML = `
      <td class="px-2 py-2 border">${t.user.username} (#${t.user.id})</td>
      <td class="px-2 py-2 border">${t.team_name}</td>
      <td class="px-2 py-2 border">${t.week_number}</td>
      <td class="px-2 py-2 border">${playersNames}</td>
      <td class="px-2 py-2 border">${coachName}</td>
      <td class="px-2 py-2 border">${t.total_cost}</td>
      <td class="px-2 py-2 border">${t.user.budget_remaining}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/* =========================
   WEEK LOCK UI
   ========================= */

async function refreshWeekLockUI() {
  const week = getWeek();

  const badge = document.getElementById("week-lock-badge");
  const btn = document.getElementById("btn-week-lock-toggle");
  if (!badge || !btn) return;

  badge.textContent = "Checking...";
  badge.className = "px-2 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600";

  try {
    const res = await AdminService.getWeekLock(week);

    if (!res?.success) {
      badge.textContent = "Unknown";
      badge.className = "px-2 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600";
      return;
    }

    const locked = Number(res.is_locked) === 1;

    if (locked) {
      badge.textContent = "LOCKED";
      badge.className = "px-2 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700";
      btn.textContent = "Unlock Week";
      btn.className = "btn-secondary text-xs px-3 py-2";
    } else {
      badge.textContent = "OPEN";
      badge.className = "px-2 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700";
      btn.textContent = "Lock Week";
      btn.className = "btn-primary text-xs px-3 py-2";
    }
  } catch (err) {
    console.error(err);
    badge.textContent = "Error";
    badge.className = "px-2 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600";
  }
}

async function toggleWeekLock() {
  const week = getWeek();
  const badge = document.getElementById("week-lock-badge");
  if (!badge) return;

  const isLocked = badge.textContent.trim().toUpperCase() === "LOCKED";
  const next = isLocked ? 0 : 1;

  const ok = await uiConfirmSafe({
    titleText: next === 1 ? `Lock week ${week}?` : `Unlock week ${week}?`,
    subText: "Confirmation",
    message:
      next === 1
        ? "Users will NOT be able to create/update teams for this week."
        : "Users WILL be able to change teams again.",
    okText: next === 1 ? "Lock" : "Unlock",
    cancelText: "Cancel",
  });

  if (!ok) return;

  try {
    const res = await AdminService.setWeekLock(week, next);
    log("Week lock updated: " + JSON.stringify(res));

    if (res?.success) {
      uiToastSafe(next === 1 ? `Week ${week} locked 🔒` : `Week ${week} unlocked 🔓`);
    } else {
      uiAlertSafe({
        type: "error",
        titleText: "Week lock failed",
        subText: `Week ${week}`,
        message: res?.message || "Server refused the change.",
      });
    }

    await refreshWeekLockUI();
  } catch (err) {
    log("Error: " + err.message);
    uiAlertSafe({
      type: "error",
      titleText: "Network error",
      subText: "Week lock",
      message: err?.message || "Failed to toggle week lock.",
    });
  }
}

/* =========================
   HANDLERS
   ========================= */

function attachHandlers() {
  document.getElementById("btn-run-scoring")?.addEventListener("click", async () => {
    const week = getWeek();
    log(`Running scoring for week ${week}...`);
    try {
      const res = await ScoringService.runWeeklyScoring(week);
      log(JSON.stringify(res));
      if (res?.success) uiToastSafe("Weekly scoring done ✅");
      else uiAlertSafe({ type: "error", titleText: "Scoring failed", subText: `Week ${week}`, message: res?.message || "Failed." });
    } catch (err) {
      log("Error: " + err.message);
      uiAlertSafe({ type: "error", titleText: "Scoring error", subText: "Network", message: err?.message || "Failed to run scoring." });
    }
  });

  document.getElementById("btn-recalc")?.addEventListener("click", async () => {
    const week = getWeek();
    log(`Recalculating from teams for week ${week}...`);
    try {
      const res = await ScoringService.recalcWeekFromTeams(week);
      log(JSON.stringify(res));
      if (res?.success) uiToastSafe("Recalculation done ✅");
      else uiAlertSafe({ type: "error", titleText: "Recalculate failed", subText: `Week ${week}`, message: res?.message || "Failed." });
    } catch (err) {
      log("Error: " + err.message);
      uiAlertSafe({ type: "error", titleText: "Recalculate error", subText: "Network", message: err?.message || "Failed to recalc week." });
    }
  });

  document.getElementById("btn-load-teams")?.addEventListener("click", async () => {
    const week = getWeek();
    log(`Loading teams for week ${week}...`);
    try {
      const res = await LeaderboardService.getTeamsForWeek(week);
      renderTeamsTable(res);
      uiToastSafe("Teams loaded ✅");
    } catch (err) {
      log("Error: " + err.message);
      uiAlertSafe({ type: "error", titleText: "Load teams error", subText: "Network", message: err?.message || "Failed to load teams." });
    }
  });

  document.getElementById("btn-price-single")?.addEventListener("click", async () => {
    const id = parseInt(document.getElementById("price-player-id")?.value, 10);
    const newPrice = parseInt(document.getElementById("price-new")?.value, 10);

    if (!id || !newPrice) {
      uiAlertSafe({ type: "warn", titleText: "Missing input", subText: "Price update", message: "Enter player id and new price." });
      return;
    }

    log(`Updating price of player #${id} → ${newPrice}`);
    try {
      const res = await ScoringService.updateSinglePlayerPrice(id, newPrice);
      log(JSON.stringify(res));
      if (res?.success) uiToastSafe("Price updated ✅");
      else uiAlertSafe({ type: "error", titleText: "Price update failed", subText: `Player #${id}`, message: res?.message || "Failed." });
    } catch (err) {
      log("Error: " + err.message);
      uiAlertSafe({ type: "error", titleText: "Network error", subText: "Price update", message: err?.message || "Failed to update price." });
    }
  });

  document.getElementById("btn-week-lock-toggle")?.addEventListener("click", toggleWeekLock);

  document.getElementById("admin-week")?.addEventListener("change", async () => {
    await refreshWeekLockUI();
  });

  // NEW: set current week button
  document.getElementById("btn-set-current-week")?.addEventListener("click", handleSetCurrentWeek);
}

document.addEventListener("DOMContentLoaded", async () => {
  attachHandlers();
  await refreshCurrentWeekUI();  // NEW
  await refreshWeekLockUI();
});
