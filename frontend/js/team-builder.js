// js/team-builder.js
import * as AuthMod        from "../../backend/scr/api/authService.js";
import * as PlayerMod      from "../../backend/scr/api/playerService.js";
import * as CoachMod       from "../../backend/scr/api/coachService.js";
import * as TeamMod        from "../../backend/scr/api/teamService.js";

// Service auto-fallback
const AuthService   = AuthMod.AuthService   || AuthMod.default || AuthMod;
const PlayerService = PlayerMod.PlayerService || PlayerMod.default || PlayerMod;
const CoachService  = CoachMod.CoachService  || CoachMod.default || CoachMod;
const TeamService   = TeamMod.TeamService   || TeamMod.default || TeamMod;

let currentUser = null;

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

// Modal elements
const modal = document.getElementById("playerModal");
const modalTitle = document.getElementById("modalTitle");
const modalList = document.getElementById("modalList");
const closeModal = document.getElementById("closeModal");

// Redirect if not logged in
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = AuthService.getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  loadPlayerButtons();
});

// Attach events to position buttons
function loadPlayerButtons() {
  document.querySelectorAll(".select-player-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const position = btn.dataset.position;
      openModal(position);
    });
  });

  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  document.getElementById("submitTeam").addEventListener("click", saveTeam);
}

// Open selection modal
async function openModal(position) {
  modalTitle.textContent = `Select ${position}`;
  modalList.innerHTML = "Loading...";

  modal.classList.remove("hidden");

  if (position === "COACH") {
    const res = await CoachService.getAll();
    buildModalList(res.coaches, position);
  } else {
    const res = await PlayerService.getAllPlayers({ position });
    buildModalList(res.players, position);
  }
}

// Build modal items
function buildModalList(items, position) {
  modalList.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "p-3 border-b hover:bg-gray-100 cursor-pointer";
    div.textContent =
      position === "COACH"
        ? `${item.name} (${item.team}) - Price ${item.price}`
        : `${item.name} (${item.team}) - ${item.position} - Price ${item.price}`;

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

  // Update UI
  const label = document.getElementById(`pos-${position}-name`);
  label.textContent = item.name;

  // Captain selection (only players)
  if (position !== "COACH") {
    label.classList.add("cursor-pointer", "underline");
    label.addEventListener("click", () => {
      selected.CAPTAIN = item.id;
      alert(`${item.name} set as Captain`);
    });
  }
}

// Save team to backend
async function saveTeam() {
  if (!currentUser) return alert("You must log in.");

  // Validate all positions
  const required = ["PG", "SG", "SF", "PF", "C", "COACH"];
  for (let r of required) {
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

  const body = {
    user_id: currentUser.id,
    week_number: 1,
    team_name: `${currentUser.username} Team`,
    players: players,
    coach_id: selected.COACH.id,
    captain_id: selected.CAPTAIN
  };

  const res = await TeamService.createTeam(body);

  if (res.success) {
    alert("Team Saved Successfully!");
    window.location.href = "my-team.html";
  } else {
    alert(res.message || "Team creation failed.");
  }
}
