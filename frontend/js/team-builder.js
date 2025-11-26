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

// ---- BUDGET DISPLAY ----
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
}

// ---- INITIALIZATION ----
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = AuthService.getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  // baseline budget from user, if available
  if (currentUser.budget_remaining != null) {
    setBudgetDisplay(currentUser.budget_remaining);
  } else {
    setBudgetDisplay(100);
  }

  attachButtons();
  await initTeamForCurrentWeek();
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

// Load (if exists) the team of this user for CURRENT_WEEK
async function initTeamForCurrentWeek() {
  try {
    // 1) Check if team exists
    const checkRes = await TeamService.checkTeamExists(
      currentUser.id,
      CURRENT_WEEK
    );

    if (!checkRes || !checkRes.success) {
      console.warn("checkTeamExists failed:", checkRes);
      resetSelectedUI();
      if (saveBtn) saveBtn.textContent = "Save My Team";
      return;
    }

    if (!checkRes.exists) {
      // no team yet → normal create
      existingTeamId = null;
      resetSelectedUI();
      if (saveBtn) saveBtn.textContent = "Save My Team";
      return;
    }

    // Team exists
    existingTeamId = checkRes.team_id;
    if (saveBtn) saveBtn.textContent = "Update My Team";

    // 2) Fetch full team details
    const teamRes = await TeamService.getTeam(currentUser.id, CURRENT_WEEK);
    if (!teamRes || !teamRes.success || !teamRes.team) {
      console.warn("getTeam returned no team:", teamRes);
      resetSelectedUI();
      return;
    }

    const team = teamRes.team;
    hydrateSelectedFromTeam(team);

    if (team.budget_remaining != null) {
      setBudgetDisplay(team.budget_remaining);
    }
  } catch (err) {
    console.error("initTeamForCurrentWeek error:", err);
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

    if (res.budget_remaining != null) {
      setBudgetDisplay(res.budget_remaining);
    }

    existingTeamId = res.team_id || existingTeamId;

    alert("Team saved successfully!");
    // Optional: stay on page so user can see updated court,
    // or redirect to stats if you prefer:
    // window.location.href = "my-stats.html";
    await initTeamForCurrentWeek(); // re-hydrate from DB to be 100% in sync
  } catch (err) {
    console.error("saveTeam error:", err);
    alert("Unexpected error while saving team.");
  }
}

// ---- DELETE TEAM (then user can rebuild) ----
async function handleDeleteTeam() {
  if (!currentUser) return;

  if (!existingTeamId) {
    alert("You don't have a team for this week to delete.");
    return;
  }

  const ok = confirm(
    "Are you sure you want to delete your team for this week? Your budget will be refunded."
  );
  if (!ok) return;

  try {
    const res = await TeamService.deleteTeam({
      user_id: currentUser.id,
      week_number: CURRENT_WEEK
    });

    if (!res || !res.success) {
      alert(res?.message || "Failed to delete team.");
      return;
    }

    existingTeamId = null;
    resetSelectedUI();

    if (res.budget_remaining != null) {
      setBudgetDisplay(res.budget_remaining);
    }

    if (saveBtn) saveBtn.textContent = "Save My Team";

    alert("Team deleted. You can build a new one now.");
  } catch (err) {
    console.error("Delete team error:", err);
    alert("Unexpected error while deleting team.");
  }
}
