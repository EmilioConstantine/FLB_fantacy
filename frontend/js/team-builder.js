// frontend/js/team-builder.js
import * as AuthMod   from "../../backend/scr/api/authService.js";
import * as PlayerMod from "../../backend/scr/api/playerService.js";
import * as CoachMod  from "../../backend/scr/api/coachService.js";
import * as TeamMod   from "../../backend/scr/api/teamService.js";

// Service auto-fallback
const AuthService   = AuthMod.AuthService     || AuthMod.default || AuthMod;
const PlayerService = PlayerMod.PlayerService || PlayerMod.default || PlayerMod;
const CoachService  = CoachMod.CoachService   || CoachMod.default || CoachMod;
const TeamService   = TeamMod.TeamService     || TeamMod.default || TeamMod;

// ---- CONFIG ----
const CURRENT_WEEK = 1;

// ---- STATE ----
let currentUser    = null;
let existingTeamId = null; // non-null if user already has a team for this week

// Store selected players
let selected = {
  PG: null,
  SG: null,
  SF: null,
  PF: null,
  C: null,
  COACH: null,
  CAPTAIN: null
};

// ---- DOM ELEMENTS ----
const modal      = document.getElementById("playerModal");
const modalTitle = document.getElementById("modalTitle");
const modalList  = document.getElementById("modalList");
const closeModal = document.getElementById("closeModal");
const saveBtn    = document.getElementById("submitTeam");
const deleteBtn  = document.getElementById("deleteTeamBtn");

// Helper
function el(id) {
  return document.getElementById(id);
}

// ---- BUDGET + TEAM WORTH DISPLAY ----
function setBudgetDisplay(budget) {
  const node = el("budget-display");
  if (!node) return;

  const n = Number(budget);
  if (Number.isFinite(n)) {
    node.textContent = n.toFixed(1);   // shows 89.0 M, etc.
  } else {
    node.textContent = "100.0";
  }
}

function setTeamWorth(totalCost) {
  const node = el("team-worth");
  if (!node) return;

  const n = Number(totalCost);
  if (Number.isFinite(n)) {
    node.textContent = n.toFixed(1);
  } else {
    node.textContent = "0.0";
  }
}

// Recompute worth from the current `selected` object
function computeSelectedTeamWorth() {
  let total = 0;

  ["PG", "SG", "SF", "PF", "C"].forEach((pos) => {
    if (selected[pos] && selected[pos].price != null) {
      total += Number(selected[pos].price);
    }
  });

  if (selected.COACH && selected.COACH.price != null) {
    total += Number(selected.COACH.price);
  }

  setTeamWorth(total);
}

// Reset all selected positions in JS + UI
function resetSelectedUI() {
  selected = {
    PG: null,
    SG: null,
    SF: null,
    PF: null,
    C: null,
    COACH: null,
    CAPTAIN: null
  };

  const slots = ["PG", "SG", "SF", "PF", "C", "COACH"];
  slots.forEach((pos) => {
    const label = el(`pos-${pos}-name`);
    if (!label) return;

    if (pos === "COACH") {
      label.textContent = "Select Coach";
    } else {
      label.textContent = `Select ${pos}`;
    }

    label.classList.remove("cursor-pointer", "underline");
    label.onclick = null;
  });

  setTeamWorth(0);
}

// ---- INITIALIZATION ----
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = AuthService.getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  attachButtons();
  await initTeamForCurrentWeek();   // this will set budget + team worth from DB
});

// Attach events to position buttons + save/delete
function attachButtons() {
  document.querySelectorAll(".select-player-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const position = btn.dataset.position;
      openModal(position);
    });
  });

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", saveTeam);
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleDeleteTeam);
  }
}

// ---- LOAD TEAM / BUDGET FROM SERVER ----

// Fallback: get budget from user history (DB) if there is no team yet
async function syncBudgetFromHistory() {
  try {
    const hist = await TeamService.getUserHistory(currentUser.id);
    if (hist && hist.success && hist.user && hist.user.budget_remaining != null) {
      setBudgetDisplay(hist.user.budget_remaining);
      return;
    }
  } catch (err) {
    console.error("syncBudgetFromHistory error:", err);
  }

  // fallback to cached user or default
  if (currentUser && currentUser.budget_remaining != null) {
    setBudgetDisplay(currentUser.budget_remaining);
  } else {
    setBudgetDisplay(100);
  }
}

// Always try to fetch team directly from DB
async function initTeamForCurrentWeek() {
  resetSelectedUI();

  try {
    const teamRes = await TeamService.getTeam(currentUser.id, CURRENT_WEEK);

    if (teamRes && teamRes.success && teamRes.team) {
      const team = teamRes.team;

      // Mark that a team exists
      existingTeamId = team.team_id || team.id || null;
      if (saveBtn) saveBtn.textContent = "Update My Team";

      // Fill players/coach in UI
      hydrateSelectedFromTeam(team);

      // Budget from DB
      if (team.budget_remaining != null) {
        setBudgetDisplay(team.budget_remaining);
      } else {
        await syncBudgetFromHistory();
      }
    } else {
      // No team for this week
      existingTeamId = null;
      resetSelectedUI();
      if (saveBtn) saveBtn.textContent = "Buy My Team";
      await syncBudgetFromHistory();
    }
  } catch (err) {
    console.error("initTeamForCurrentWeek error:", err);
    existingTeamId = null;
    resetSelectedUI();
    if (saveBtn) saveBtn.textContent = "Buy My Team";
    await syncBudgetFromHistory();
  }
}

// Fill the "selected" object + labels based on a team from backend
function hydrateSelectedFromTeam(team) {
  resetSelectedUI();

  if (Array.isArray(team.players)) {
    team.players.forEach((p) => {
      const pos = (p.position || "").toUpperCase(); // PG / SG / ...
      if (!pos) return;

      if (!selected[pos]) {
        selected[pos] = p;

        const label = el(`pos-${pos}-name`);
        if (label) {
          label.textContent = p.name || `Player #${p.id}`;
          label.classList.add("cursor-pointer", "underline");
          label.onclick = () => {
            selected.CAPTAIN = p.id;
            alert(`${p.name} set as Captain`);
          };
        }
      }

      if (p.is_captain == 1) {
        selected.CAPTAIN = p.id;
      }
    });
  }

  if (team.coach) {
    selected.COACH = team.coach;
    const label = el("pos-COACH-name");
    if (label) {
      label.textContent = team.coach.name || "Coach";
    }
  }

  // Compute worth from selected players + coach
  computeSelectedTeamWorth();
}

// ---- MODAL LOGIC ----
async function openModal(position) {
  modalTitle.textContent = `Select ${position}`;
  modalList.innerHTML = "Loading...";
  modal.classList.remove("hidden");

  try {
    if (position === "COACH") {
      const res = await CoachService.getAll();
      buildModalList(res.coaches || [], position);
    } else {
      const res = await PlayerService.getAllPlayers({ position });
      buildModalList(res.players || [], position);
    }
  } catch (err) {
    console.error("openModal error:", err);
    modalList.innerHTML = '<p class="text-sm text-red-500">Error loading data.</p>';
  }
}

function buildModalList(items, position) {
  modalList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-gray-500";
    empty.textContent = "No entries found.";
    modalList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "p-3 border-b hover:bg-gray-100 cursor-pointer text-sm";

    if (position === "COACH") {
      div.textContent = `${item.name} (${item.team}) - Price ${item.price}`;
    } else {
      div.textContent = `${item.name} (${item.team}) - ${item.position} - Price ${item.price}`;
    }

    div.addEventListener("click", () => {
      selectItem(position, item);
      modal.classList.add("hidden");
    });

    modalList.appendChild(div);
  });
}

// Save selected player/coach into UI and memory
function selectItem(position, item) {
  selected[position] = item;

  const label = el(`pos-${position}-name`);
  if (!label) return;

  label.textContent = item.name;

  if (position !== "COACH") {
    label.classList.add("cursor-pointer", "underline");
    label.onclick = () => {
      selected.CAPTAIN = item.id;
      alert(`${item.name} set as Captain`);
    };
  }

  // Update worth live while user is picking
  computeSelectedTeamWorth();
}

// ---- SAVE (CREATE / OVERWRITE) TEAM ----
async function saveTeam() {
  if (!currentUser) {
    alert("You must log in.");
    return;
  }

  // Validate all positions
  const required = ["PG", "SG", "SF", "PF", "C", "COACH"];
  for (const r of required) {
    if (!selected[r]) {
      alert(`Please select a ${r}.`);
      return;
    }
  }

  if (!selected.CAPTAIN) {
    alert("Select captain by clicking a player name.");
    return;
  }

  const players = [
    selected.PG.id,
    selected.SG.id,
    selected.SF.id,
    selected.PF.id,
    selected.C.id
  ];

  const payload = {
    user_id: currentUser.id,
    week_number: CURRENT_WEEK,
    team_name: `${currentUser.username} Team`,
    players: players,
    coach_id: selected.COACH.id,
    captain_id: selected.CAPTAIN
  };

  try {
    // If a team already exists, delete it first (budget refunded)
    if (existingTeamId) {
      const ok = confirm(
        "You already created a team for this week. Overwrite it with the new selection?"
      );
      if (!ok) return;

      await TeamService.deleteTeam({
        user_id: currentUser.id,
        week_number: CURRENT_WEEK
      });
      existingTeamId = null;
    }

    // Now create the new team
    const res = await TeamService.createTeam(payload);

    if (!res || !res.success) {
      alert(res?.message || "Team save failed.");
      return;
    }

    // After save, always re-sync from server to guarantee budget + team in UI
    await initTeamForCurrentWeek();

    alert("Team saved successfully!");
  } catch (err) {
    console.error("saveTeam error:", err);
    alert("Unexpected error while saving team.");
  }
}

// ---- DELETE TEAM (SELL TEAM) ----
async function handleDeleteTeam() {
  if (!currentUser) return;

  if (!existingTeamId) {
    alert("You don't have a team for this week to sell.");
    return;
  }

  const ok = confirm(
    "Are you sure you want to sell your team for this week? Your budget will be refunded."
  );
  if (!ok) return;

  try {
    const res = await TeamService.deleteTeam({
      user_id: currentUser.id,
      week_number: CURRENT_WEEK
    });

    if (!res || !res.success) {
      alert(res?.message || "Failed to sell team.");
      return;
    }

    existingTeamId = null;
    resetSelectedUI();

    // Budget from server response (delete_team.php returns budget_remaining)
    if (res.budget_remaining != null) {
      setBudgetDisplay(res.budget_remaining);
    } else {
      await syncBudgetFromHistory();
    }

    if (saveBtn) saveBtn.textContent = "Buy My Team";

    alert("Team sold. You can build a new one now.");
  } catch (err) {
    console.error("Delete team error:", err);
    alert("Unexpected error while deleting team.");
  }
}
