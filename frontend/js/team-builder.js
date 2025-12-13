// frontend/js/team-builder.js
import * as AuthMod   from "../../backend/scr/api/authService.js";
import * as PlayerMod from "../../backend/scr/api/playerService.js";
import * as CoachMod  from "../../backend/scr/api/coachService.js";
import * as TeamMod   from "../../backend/scr/api/teamService.js";

// ---- TEAM COLORS (robust matching) ----
// Keys are lowercase; we match exact OR partial (ex: "Sagesse SC" contains "sagesse")
const TEAM_COLORS = {
  sagesse:  "#16a34a", // green
  riyadi:   "#dc2626", // red
  antranik: "#f59e0b", // amber
  byblos:   "#2563eb", // blue
  // add more teams here if needed:
  // champville: "#7c3aed",
  // mrouj: "#0ea5e9",
};

function normalizeTeamName(teamName) {
  return String(teamName || "").trim().toLowerCase();
}

function teamToColor(teamName) {
  const t = normalizeTeamName(teamName);
  if (!t) return null;

  // exact
  if (TEAM_COLORS[t]) return TEAM_COLORS[t];

  // partial
  for (const key of Object.keys(TEAM_COLORS)) {
    if (t.includes(key)) return TEAM_COLORS[key];
  }
  return null;
}

function applyTeamColorToSlot(position, teamName) {
  const btn = document.querySelector(`.select-player-btn[data-position="${position}"]`);
  if (!btn) return;

  const color = teamToColor(teamName);

  // Inner labels
  const spans = btn.querySelectorAll("span");
  const posLabel  = spans?.[0] || null; // PG/SF/etc or HC
  const nameLabel = btn.querySelector(`#pos-${position}-name`);

  if (!color) {
    // reset
    btn.style.backgroundColor = "";
    btn.style.borderColor = "";
    btn.style.color = "";
    if (posLabel) posLabel.style.color = "";
    if (nameLabel) nameLabel.style.color = "";
    return;
  }

  btn.style.backgroundColor = color;
  btn.style.borderColor = "rgba(0,0,0,0.15)";
  btn.style.color = "white";

  // force readable text (overrides Tailwind text-gray-*)
  if (posLabel) posLabel.style.color = "rgba(255,255,255,0.9)";
  if (nameLabel) nameLabel.style.color = "white";
}

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

let selected = {
  PG: null,
  SG: null,
  SF: null,
  PF: null,
  C: null,
  COACH: null,
  CAPTAIN: null
};

// Modal state
let activePosition = null;     // "PG" | ... | "COACH"
let modalItemsRaw  = [];       // raw items from API (players or coaches)
let activeChipFilter = "ALL";  // ALL | CHEAP | EXPENSIVE

// ---- DOM ELEMENTS ----
const modal       = document.getElementById("playerModal");
const modalTitle  = document.getElementById("modalTitle");
const modalList   = document.getElementById("modalList");
const closeModal  = document.getElementById("closeModal");
const saveBtn     = document.getElementById("submitTeam");
const deleteBtn   = document.getElementById("deleteTeamBtn");
const myTeamList = document.getElementById("my-team-list");
const captainPill = document.getElementById("captain-pill");

const btnChooseCaptain = document.getElementById("btnChooseCaptain");
const btnClearCaptain = document.getElementById("btnClearCaptain");

const captainModal = document.getElementById("captainModal");
const closeCaptainModal = document.getElementById("closeCaptainModal");
const captainList = document.getElementById("captainList");
const btnConfirmCaptain = document.getElementById("btnConfirmCaptain");

// toast
const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMsg = document.getElementById("toastMsg");
const toastClose = document.getElementById("toastClose");


// Optional modal UI (from updated HTML)
const modalSearch   = document.getElementById("modalSearch");
const modalSubtitle = document.getElementById("modalSubtitle");

// Helper
function el(id) { return document.getElementById(id); }
function showToast(title, msg, type = "error") {
  if (!toast) {
    alert(msg); // fallback
    return;
  }

  toastTitle.textContent = title || (type === "success" ? "Success" : "Error");
  toastMsg.textContent = msg || "";

  toast.classList.remove("hidden");

  // auto hide after 3s
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 3000);
}

function hideToast() {
  if (toast) toast.classList.add("hidden");
}

if (toastClose) toastClose.addEventListener("click", hideToast);


function formatMoney(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

function getSelectedPlayersArray() {
  const arr = [];
  ["PG","SG","SF","PF","C"].forEach(pos => {
    if (selected[pos]) arr.push({ ...selected[pos], _pos: pos });
  });
  return arr;
}

function renderCaptainPill() {
  if (!captainPill) return;

  if (!selected.CAPTAIN) {
    captainPill.textContent = "Not selected";
    captainPill.className = "text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600";
    return;
  }

  // find captain name
  const all = getSelectedPlayersArray();
  const cap = all.find(x => x.id === selected.CAPTAIN || x.player_id === selected.CAPTAIN);

  captainPill.textContent = cap ? `Captain: ${cap.name}` : "Captain selected";
  captainPill.className = "text-[11px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold";
}

function renderMyTeamList() {
  if (!myTeamList) return;

  const players = getSelectedPlayersArray();
  const coach = selected.COACH ? { ...selected.COACH, _pos: "COACH" } : null;

  if (!players.length && !coach) {
    myTeamList.innerHTML = `<p class="text-sm text-gray-500">Pick players to see your team here.</p>`;
    renderCaptainPill();
    return;
  }

  const rows = [];

  // players cards
  for (const p of players) {
    const isCap = (selected.CAPTAIN && (p.id === selected.CAPTAIN));
    rows.push(`
      <div class="bg-gray-50 border rounded-xl px-3 py-2 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs text-gray-500 font-bold">${p._pos}${isCap ? `<span class="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold">CAP</span>` : ""}</div>
          <div class="text-sm font-bold text-gray-800 truncate">${p.name || "Player"}</div>
          <div class="text-[11px] text-gray-500">${p.team || "—"} • $${formatMoney(p.price)}M</div>
        </div>
        <button type="button"
          class="text-gray-400 hover:text-red-600"
          data-remove-pos="${p._pos}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `);
  }

  // coach card
  if (coach) {
    rows.push(`
      <div class="bg-gray-50 border rounded-xl px-3 py-2 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs text-gray-500 font-bold">COACH</div>
          <div class="text-sm font-bold text-gray-800 truncate">${coach.name || "Coach"}</div>
          <div class="text-[11px] text-gray-500">${coach.team || "—"} • $${formatMoney(coach.price)}M</div>
        </div>
        <button type="button"
          class="text-gray-400 hover:text-red-600"
          data-remove-pos="COACH">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `);
  }

  myTeamList.innerHTML = rows.join("");

  // remove click
  myTeamList.querySelectorAll("[data-remove-pos]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const pos = btn.getAttribute("data-remove-pos");
      clearSlot(pos);
      renderMyTeamList();
    });
  });

  renderCaptainPill();
}
let pendingCaptainId = null;

function openCaptainModal() {
  const players = getSelectedPlayersArray();

  if (!players.length) {
    showToast("Captain", "Select at least 1 player first.");
    return;
  }

  pendingCaptainId = selected.CAPTAIN || null;

  captainList.innerHTML = players.map(p => {
    const checked = (pendingCaptainId && p.id === pendingCaptainId) ? "checked" : "";
    return `
      <label class="bg-gray-50 border rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100">
        <div>
          <div class="text-sm font-bold text-gray-800">${p.name}</div>
          <div class="text-[11px] text-gray-500">${p.team || "—"} • ${p._pos}</div>
        </div>
        <input type="radio" name="captainRadio" value="${p.id}" ${checked} />
      </label>
    `;
  }).join("");

  captainModal.classList.remove("hidden");
}

function closeCapModal() {
  captainModal.classList.add("hidden");
}

if (btnChooseCaptain) btnChooseCaptain.addEventListener("click", openCaptainModal);
if (btnClearCaptain) btnClearCaptain.addEventListener("click", () => {
  selected.CAPTAIN = null;
  renderMyTeamList();
});

if (closeCaptainModal) closeCaptainModal.addEventListener("click", closeCapModal);

if (btnConfirmCaptain) {
  btnConfirmCaptain.addEventListener("click", () => {
    const picked = captainList.querySelector('input[name="captainRadio"]:checked');
    if (!picked) {
      showToast("Captain", "Please choose a captain.");
      return;
    }
    selected.CAPTAIN = Number(picked.value);
    renderMyTeamList();
    closeCapModal();
    showToast("Captain", "Captain selected successfully!", "success");
  });
}


// ---- BUDGET + TEAM WORTH DISPLAY ----
function setBudgetDisplay(budget) {
  const node = el("budget-display");
  if (!node) return;

  const n = Number(budget);
  node.textContent = Number.isFinite(n) ? n.toFixed(1) : "100.0";
}

function setTeamWorth(totalCost) {
  const node = el("team-worth");
  if (!node) return;

  const n = Number(totalCost);
  node.textContent = Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

function computeSelectedTeamWorth() {
  let total = 0;

  ["PG", "SG", "SF", "PF", "C"].forEach((pos) => {
    if (selected[pos] && selected[pos].price != null) total += Number(selected[pos].price);
  });

  if (selected.COACH && selected.COACH.price != null) total += Number(selected.COACH.price);

  setTeamWorth(total);
  return total;
}

// ---- RESET + CLEAR SLOT ----
function resetSelectedUI() {
  selected = { PG:null, SG:null, SF:null, PF:null, C:null, COACH:null, CAPTAIN:null };

  const slots = ["PG", "SG", "SF", "PF", "C", "COACH"];
  slots.forEach((pos) => {
    const label = el(`pos-${pos}-name`);
    if (!label) return;

    if (pos === "COACH") label.textContent = "Select Coach";
    else label.textContent = `Select ${pos}`;

    label.classList.remove("cursor-pointer", "underline");
    label.onclick = null;

    // reset circle color
    applyTeamColorToSlot(pos, null);
  });

  setTeamWorth(0);
  renderMyTeamList();
}

function clearSlot(pos) {
  if (!pos) return;

  // If removing a captain player, reset captain
  if (pos !== "COACH" && selected[pos] && selected.CAPTAIN === selected[pos].id) {
    selected.CAPTAIN = null;
  }

  selected[pos] = null;

  const label = el(`pos-${pos}-name`);
  if (label) {
    if (pos === "COACH") label.textContent = "Select Coach";
    else label.textContent = `Select ${pos}`;
    label.classList.remove("cursor-pointer", "underline");
    label.onclick = null;
  }

  // reset circle color
  applyTeamColorToSlot(pos, null);

  computeSelectedTeamWorth();
  renderMyTeamList();

}

// ---- INITIALIZATION ----
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = AuthService.getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  attachButtons();
  await initTeamForCurrentWeek();
});

// Attach events to position buttons + save/delete + remove-slot + filters
function attachButtons() {
  // open modal when clicking circle
  document.querySelectorAll(".select-player-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const position = btn.dataset.position;
      openModal(position);
    });
  });

  // close modal
  if (closeModal) {
    closeModal.addEventListener("click", () => modal.classList.add("hidden"));
  }

  // save
  if (saveBtn) saveBtn.addEventListener("click", saveTeam);

  // delete team
  if (deleteBtn) deleteBtn.addEventListener("click", handleDeleteTeam);

  // remove single slot (×)
  document.addEventListener("click", (e) => {
    const x = e.target.closest(".remove-slot-btn");
    if (!x) return;
    e.preventDefault();
    e.stopPropagation(); // prevent opening modal
    const pos = x.dataset.slot;
    clearSlot(pos);
  });

  // modal search
  if (modalSearch) {
    modalSearch.addEventListener("input", () => renderModalShop());
  }

  // modal chips filter (optional)
  document.querySelectorAll(".modal-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeChipFilter = chip.dataset.filter || "ALL";

      // UI highlight
      document.querySelectorAll(".modal-filter-chip").forEach((c) => {
        c.classList.remove("bg-gray-900", "text-white");
        c.classList.add("bg-gray-100");
      });
      chip.classList.remove("bg-gray-100");
      chip.classList.add("bg-gray-900", "text-white");

      renderModalShop();
    });
  });
}

// ---- LOAD TEAM / BUDGET FROM SERVER ----
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

  if (currentUser && currentUser.budget_remaining != null) setBudgetDisplay(currentUser.budget_remaining);
  else setBudgetDisplay(100);
}

async function initTeamForCurrentWeek() {
  resetSelectedUI();

  try {
    const teamRes = await TeamService.getTeam(currentUser.id, CURRENT_WEEK);

    if (teamRes && teamRes.success && teamRes.team) {
      const team = teamRes.team;

      existingTeamId = team.team_id || team.id || null;
      if (saveBtn) saveBtn.textContent = "Update My Team";

      hydrateSelectedFromTeam(team);

      if (team.budget_remaining != null) setBudgetDisplay(team.budget_remaining);
      else await syncBudgetFromHistory();
    } else {
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

function hydrateSelectedFromTeam(team) {
  resetSelectedUI();

  if (Array.isArray(team.players)) {
    team.players.forEach((p) => {
      const pos = (p.position || "").toUpperCase();
      if (!pos) return;

      if (!selected[pos]) {
        selected[pos] = p;

        // apply color from DB team name
        applyTeamColorToSlot(pos, p.team);

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

      if (p.is_captain == 1) selected.CAPTAIN = p.id;
    });
  }

  if (team.coach) {
    selected.COACH = team.coach;
    const label = el("pos-COACH-name");
    if (label) label.textContent = team.coach.name || "Coach";

    applyTeamColorToSlot("COACH", team.coach.team);
  }

  computeSelectedTeamWorth();
  renderMyTeamList();

}

// ---- MODAL SHOP LOGIC ----
async function openModal(position) {
  activePosition = position;
  activeChipFilter = "ALL";

  // reset chips highlight
  document.querySelectorAll(".modal-filter-chip").forEach((c) => {
    c.classList.remove("bg-gray-900", "text-white");
    c.classList.add("bg-gray-100");
  });
  const firstChip = document.querySelector('.modal-filter-chip[data-filter="ALL"]');
  if (firstChip) {
    firstChip.classList.remove("bg-gray-100");
    firstChip.classList.add("bg-gray-900", "text-white");
  }

  if (modalTitle) modalTitle.textContent = position === "COACH" ? "Select Coach" : `Select ${position}`;
  if (modalSubtitle) modalSubtitle.textContent = "Browse & pick your player";
  if (modalSearch) modalSearch.value = "";

  modalList.innerHTML = shopSkeleton();
  modal.classList.remove("hidden");

  try {
    if (position === "COACH") {
      const res = await CoachService.getAll();
      modalItemsRaw = res.coaches || [];
    } else {
      const res = await PlayerService.getAllPlayers({ position });
      modalItemsRaw = res.players || [];
    }
    renderModalShop();
  } catch (err) {
    console.error("openModal error:", err);
    modalList.innerHTML = `<div class="p-3 text-sm text-red-600 bg-white border rounded-xl">
      Error loading data.
    </div>`;
  }
}

function shopSkeleton() {
  return `
    <div class="bg-white border rounded-xl p-3 animate-pulse h-16"></div>
    <div class="bg-white border rounded-xl p-3 animate-pulse h-16"></div>
    <div class="bg-white border rounded-xl p-3 animate-pulse h-16"></div>
  `;
}

function getSearchText() {
  return (modalSearch?.value || "").trim().toLowerCase();
}

function applyFilters(items) {
  const q = getSearchText();
  let out = items.slice();

  // Search filter
  if (q) {
    out = out.filter((it) => {
      const name = (it.name || "").toLowerCase();
      const team = (it.team || "").toLowerCase();
      const pos  = (it.position || "").toLowerCase();
      return name.includes(q) || team.includes(q) || pos.includes(q);
    });
  }

  // Chip filter by price
  if (activeChipFilter !== "ALL") {
    const prices = out
      .map((x) => Number(x.price))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    if (prices.length) {
      const idx40 = Math.floor(prices.length * 0.4);
      const idx60 = Math.floor(prices.length * 0.6);
      const p40 = prices[idx40] ?? prices[0];
      const p60 = prices[idx60] ?? prices[prices.length - 1];

      if (activeChipFilter === "CHEAP") out = out.filter((x) => Number(x.price) <= p40);
      if (activeChipFilter === "EXPENSIVE") out = out.filter((x) => Number(x.price) >= p60);
    }
  }

  // sort by price asc
  out.sort((a, b) => Number(a.price) - Number(b.price));
  return out;
}

function renderModalShop() {
  const items = applyFilters(modalItemsRaw);
  modalList.innerHTML = "";

  if (!items.length) {
    modalList.innerHTML = `
      <div class="bg-white border rounded-xl p-4 text-sm text-gray-600">
        No results. Try another search.
      </div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className =
      "bg-white border rounded-xl p-3 flex items-center justify-between hover:shadow-sm transition";

    // left
    const left = document.createElement("div");
    left.className = "min-w-0";

    const title = document.createElement("div");
    title.className = "font-bold text-sm text-gray-900 truncate";
    title.textContent = item.name || "Unknown";

    const meta = document.createElement("div");
    meta.className = "text-[11px] text-gray-500";

    if (activePosition === "COACH") {
      meta.textContent = `${item.team || "—"} • Coach`;
    } else {
      meta.textContent = `${item.team || "—"} • ${(item.position || activePosition || "—").toUpperCase()}`;
    }

    // optional team color pill
    const pillColor = teamToColor(item.team);
    const pill = document.createElement("span");
    pill.className = "inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full";
    pill.textContent = item.team || "—";
    pill.style.backgroundColor = pillColor ? pillColor : "#f3f4f6";
    pill.style.color = pillColor ? "white" : "#374151";

    left.appendChild(title);
    left.appendChild(meta);
    left.appendChild(pill);

    // right
    const right = document.createElement("div");
    right.className = "flex items-center gap-3";

    const price = document.createElement("div");
    price.className = "font-mono text-sm font-bold text-gray-900";
    price.textContent = `$${Number(item.price || 0).toFixed(1)}M`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-primary text-xs px-3 py-2";
    btn.textContent = "Select";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectItem(activePosition, item);
      modal.classList.add("hidden");
    });

    right.appendChild(price);
    right.appendChild(btn);

    card.appendChild(left);
    card.appendChild(right);

    modalList.appendChild(card);
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
  } else {
    label.classList.remove("cursor-pointer", "underline");
    label.onclick = null;
  }

  // apply circle color
  applyTeamColorToSlot(position, item.team);

  computeSelectedTeamWorth();
  renderMyTeamList();

}

// ---- SAVE (CREATE / OVERWRITE) TEAM ----
async function saveTeam() {
  if (!currentUser) {
    showToast("Login required", "You must log in to save a team.");
    window.location.href = "login.html";
    return;
  }

  // 1) Validate all positions
  const required = ["PG", "SG", "SF", "PF", "C", "COACH"];
  for (const r of required) {
    if (!selected[r]) {
      showToast("Missing selection", `Please select a ${r}.`);
      return;
    }
  }

  // 2) Captain must be selected using the captain UI
  if (!selected.CAPTAIN) {
    showToast("Captain required", "Please choose a captain using the Captain button.");
    return;
  }

  // 3) Budget check (client-side)
  const totalCost = computeSelectedTeamWorth(); // returns number
  const budgetText = document.getElementById("budget-display")?.textContent ?? "100";
  const currentBudget = Number(budgetText);

  if (Number.isFinite(currentBudget) && totalCost > currentBudget) {
    showToast(
      "Not enough budget",
      `Your team costs $${totalCost.toFixed(1)}M but your budget is $${currentBudget.toFixed(1)}M.`
    );
    return;
  }

  // 4) Build payload
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
    players,
    coach_id: selected.COACH.id,
    captain_id: selected.CAPTAIN
  };

  try {
    // 5) Overwrite if exists
    if (existingTeamId) {
      const ok = confirm(
        "You already created a team for this week. Overwrite it with the new selection?"
      );
      if (!ok) return;

      const del = await TeamService.deleteTeam({
        user_id: currentUser.id,
        week_number: CURRENT_WEEK
      });

      if (del && del.success === false) {
        showToast("Could not overwrite", del.message || "Failed to delete existing team.");
        return;
      }

      existingTeamId = null;
    }

    // 6) Create team
    const res = await TeamService.createTeam(payload);

    if (!res || !res.success) {
      // Common budget-related backend messages
      const msg = (res?.message || "").toLowerCase();
      if (msg.includes("budget") || msg.includes("not enough") || msg.includes("negative")) {
        showToast("Budget error", res.message || "Not enough budget to buy this team.");
      } else {
        showToast("Team save failed", res?.message || "Please try again.");
      }
      return;
    }

    // 7) Refresh UI from server (budget, team, etc.)
    await initTeamForCurrentWeek();
    renderMyTeamList?.(); // if you added it; safe optional

    showToast("Saved", "Team saved successfully!", "success");
  } catch (err) {
    console.error("saveTeam error:", err);
    showToast("Unexpected error", err?.message || "Unexpected error while saving team.");
  }
}

// ---- DELETE TEAM (SELL TEAM) ----
async function handleDeleteTeam() {
  if (!currentUser) return;

  if (!existingTeamId) {
    alert("You don't have a team for this week to sell.");
    return;
  }

  const ok = confirm("Are you sure you want to sell your team for this week? Your budget will be refunded.");
  if (!ok) return;

  try {
    const res = await TeamService.deleteTeam({ user_id: currentUser.id, week_number: CURRENT_WEEK });

    if (!res || !res.success) {
      alert(res?.message || "Failed to sell team.");
      return;
    }

    existingTeamId = null;
    resetSelectedUI();

    if (res.budget_remaining != null) setBudgetDisplay(res.budget_remaining);
    else await syncBudgetFromHistory();

    if (saveBtn) saveBtn.textContent = "Buy My Team";

    alert("Team sold. You can build a new one now.");
  } catch (err) {
    console.error("Delete team error:", err);
    alert("Unexpected error while deleting team.");
  }
}
