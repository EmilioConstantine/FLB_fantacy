// frontend/js/leaderboard.js
import * as AuthMod from "../../backend/scr/api/authService.js";
import * as LbMod from "../../backend/scr/api/leaderboardService.js";
let leaderboardMode = "all"; // "all" | "week"


const AuthService = AuthMod.AuthService || AuthMod.default || AuthMod;
const LeaderboardService =
  LbMod.LeaderboardService || LbMod.default || LbMod;

function firstLetter(name) {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}
document.getElementById("btn-mode-all")?.addEventListener("click", () => {
  leaderboardMode = "all";
  setModeUI();
  loadLeaderboard();
});

document.getElementById("btn-mode-week")?.addEventListener("click", () => {
  leaderboardMode = "week";
  setModeUI();
  loadLeaderboard();
});
function setModeUI() {
  const btnAll = document.getElementById("btn-mode-all");
  const btnWeek = document.getElementById("btn-mode-week");
  const picker = document.getElementById("week-picker");

  if (leaderboardMode === "all") {
    btnAll.className = "px-4 py-2 text-xs rounded-xl font-bold bg-gray-900 text-white";
    btnWeek.className = "px-4 py-2 text-xs rounded-xl font-bold bg-gray-100 text-gray-700";
    picker.classList.add("hidden");
  } else {
    btnWeek.className = "px-4 py-2 text-xs rounded-xl font-bold bg-gray-900 text-white";
    btnAll.className = "px-4 py-2 text-xs rounded-xl font-bold bg-gray-100 text-gray-700";
    picker.classList.remove("hidden");
  }
}


document.getElementById("lb-week")?.addEventListener("change", loadLeaderboard);


function renderPodium(entries) {
  const slots = [
    { idx: 0, base: "podium-1", big: true },
    { idx: 1, base: "podium-2", big: false },
    { idx: 2, base: "podium-3", big: false },
  ];

  slots.forEach((slot) => {
    const e = entries[slot.idx];
    const base = slot.base;
    const el = {
      initial: document.getElementById(`${base}-initial`),
      name: document.getElementById(`${base}-name`),
      points: document.getElementById(`${base}-points`),
    };

    if (!el.initial || !el.name || !el.points) return;

    if (!e) {
      // hide podium step if rank missing
      document.getElementById(base)?.classList.add("opacity-30");
      el.name.textContent = "-";
      el.points.textContent = "";
      return;
    }

    document.getElementById(base)?.classList.remove("opacity-30");
    el.initial.textContent = firstLetter(e.username);
    el.name.textContent = e.username;
    el.points.textContent = e.total_points + " pts";
  });
}

function renderList(entries, currentUserId) {
  const list = document.getElementById("lb-list");
  const currentRow = document.getElementById("lb-current-row");
  if (!list || !currentRow) return;

  list.innerHTML = "";

  let currentRank = null;
  let currentPoints = 0;
  let currentName = "You";

  entries.forEach((row, index) => {
    const rank = index + 1;
    const isCurrent = currentUserId && row.user_id == currentUserId;

    if (isCurrent) {
      currentRank = rank;
      currentPoints = row.total_points;
      currentName = row.username;
    }

    const div = document.createElement("div");
    div.className =
      "flex justify-between items-center px-5 py-3 text-sm bg-white";

    const left = document.createElement("div");
    left.className = "flex items-center gap-3";

    const rankSpan = document.createElement("span");
    rankSpan.className = "text-xs text-gray-500 min-w-[2rem]";
    rankSpan.textContent = "#" + rank;

    const nameSpan = document.createElement("span");
    nameSpan.className =
      "font-medium" + (isCurrent ? " text-flb-red" : " text-gray-800");
    nameSpan.textContent = row.username;

    left.append(rankSpan, nameSpan);

    const ptsSpan = document.createElement("span");
    ptsSpan.className = "font-mono text-gray-700";
    ptsSpan.textContent = row.total_points + " pts";

    div.append(left, ptsSpan);
    list.appendChild(div);
  });

  // if current user was found
  const rankSpan = document.getElementById("lb-current-rank");
  const nameSpan = document.getElementById("lb-current-name");
  const ptsSpan = document.getElementById("lb-current-points");

  if (currentRank != null) {
    rankSpan.textContent = "#" + currentRank;
    nameSpan.textContent = currentName;
    ptsSpan.textContent = currentPoints + " pts";
  } else {
    // not ranked / not logged – just hide bar
    currentRow.classList.add("hidden");
  }
}

async function loadLeaderboard() {
  try {
    const currentUser = AuthService.getCurrentUser?.() || null;
    let entries = [];

    if (leaderboardMode === "week") {
      const week = parseInt(document.getElementById("lb-week")?.value || "1", 10);
      const res = await LeaderboardService.getWeekLeaderboard(week);

      if (!res?.success) return;

      entries = (res.leaderboard || []).map(r => ({
        user_id: r.user_id,
        username: r.username,
        total_points: r.week_points
      }));
    } else {
      const res = await LeaderboardService.getLeaderboard();
      if (!res?.success) return;
      entries = res.leaderboard || [];
    }

    renderPodium(entries.slice(0, 3));
    renderList(entries, currentUser ? currentUser.id : null);
  } catch (err) {
    console.error("Leaderboard load error", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setModeUI();
  loadLeaderboard();
});

