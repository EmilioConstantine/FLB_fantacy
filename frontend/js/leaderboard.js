// frontend/js/leaderboard.js
import * as AuthMod from "../../backend/scr/api/authService.js";
import * as LbMod from "../../backend/scr/api/leaderboardService.js";

const AuthService = AuthMod.AuthService || AuthMod.default || AuthMod;
const LeaderboardService =
  LbMod.LeaderboardService || LbMod.default || LbMod;

function firstLetter(name) {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

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

async function init() {
  try {
    const currentUser = AuthService.getCurrentUser
      ? AuthService.getCurrentUser()
      : null;

    const res = await LeaderboardService.getLeaderboard({ details: false });
    if (!res.success) {
      console.error("Leaderboard error", res);
      return;
    }

    const entries = res.leaderboard || [];
    renderPodium(entries.slice(0, 3));

    renderList(entries, currentUser ? currentUser.id : null);
  } catch (err) {
    console.error("Leaderboard exception", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
