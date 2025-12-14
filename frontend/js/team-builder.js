// frontend/js/team-builder.js
import * as AuthMod   from "../../backend/scr/api/authService.js";
import * as PlayerMod from "../../backend/scr/api/playerService.js";
import * as CoachMod  from "../../backend/scr/api/coachService.js";
import * as TeamMod   from "../../backend/scr/api/teamService.js";
const BASE = "/FLB_fantacy/backend/api";

// ---- TEAM COLORS (robust matching) ----
const TEAM_COLORS = {
  sagesse: "#16a34a",
  riyadi: "#cddc26ff",
  antranik: "#0b0bf5ff",
  homenetmen: "#eb5a25ff",
  maristes: "#25b6ebff",
};

function normalizeTeamName(teamName) {
  return String(teamName || "").trim().toLowerCase();
}

function teamToColor(teamName) {
  const t = normalizeTeamName(teamName);
  if (!t) return null;
  if (TEAM_COLORS[t]) return TEAM_COLORS[t];
  for (const key of Object.keys(TEAM_COLORS)) {
    if (t.includes(key)) return TEAM_COLORS[key];
  }
  return null;
}

function applyTeamColorToSlot(position, teamName) {
  const btn = document.querySelector(`.select-player-btn[data-position="${position}"]`);
  if (!btn) return;

  const color = teamToColor(teamName);
  const spans = btn.querySelectorAll("span");
  const posLabel  = spans?.[0] || null;
  const nameLabel = btn.querySelector(`#pos-${position}-name`);

  if (!color) {
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

  if (posLabel) posLabel.style.color = "rgba(255,255,255,0.9)";
  if (nameLabel) nameLabel.style.color = "white";
}

// Service auto-fallback
const AuthService   = AuthMod.AuthService     || AuthMod.default || AuthMod;
const PlayerService = PlayerMod.PlayerService || PlayerMod.default || PlayerMod;
const CoachService  = CoachMod.CoachService   || CoachMod.default || CoachMod;
const TeamService   = TeamMod.TeamService     || TeamMod.default || TeamMod;

// ---- CONFIG ----
let CURRENT_WEEK = 1; // will be overwritten from server


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
let activePosition = null;
let modalItemsRaw  = [];
let activeChipFilter = "ALL";

// ---- DOM ELEMENTS ----
const modal       = document.getElementById("playerModal");
const modalTitle  = document.getElementById("modalTitle");
const modalList   = document.getElementById("modalList");
const closeModal  = document.getElementById("closeModal");

const saveBtn     = document.getElementById("submitTeam");
const deleteBtn   = document.getElementById("deleteTeamBtn");

const myTeamList  = document.getElementById("my-team-list");
const captainPill = document.getElementById("captain-pill");

const btnChooseCaptain     = document.getElementById("btnChooseCaptain");
const btnClearCaptain      = document.getElementById("btnClearCaptain");
const captainModal         = document.getElementById("captainModal");
const closeCaptainModal    = document.getElementById("closeCaptainModal");
const captainList          = document.getElementById("captainList");
const btnConfirmCaptain    = document.getElementById("btnConfirmCaptain");

// Top toast elements (your existing toast)
const toast      = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMsg   = document.getElementById("toastMsg");
const toastClose = document.getElementById("toastClose");

// Optional modal UI
const modalSearch   = document.getElementById("modalSearch");
const modalSubtitle = document.getElementById("modalSubtitle");

// ---------- NICE UI HELPERS ----------
function uiAlertSafe({ type="info", titleText="Message", subText="", message="" }) {
  if (window.uiAlert) return window.uiAlert({ type, titleText, subText, message });
  // fallback
  alert(`${titleText}\n\n${message}`);
}

async function uiConfirmSafe({ titleText="Confirm", subText="", message="", okText="Confirm", cancelText="Cancel" }) {
  if (window.uiConfirm) {
    return await window.uiConfirm({ titleText, subText, message, okText, cancelText });
  }
  // fallback
  return confirm(message || titleText);
}

function uiToastSafe(message) {
  if (window.uiToast) window.uiToast(message);
}

// ---------- BASIC HELPERS ----------
function el(id) { return document.getElementById(id); }

function showToast(title, msg, type = "error") {
  if (!toast) {
    uiAlertSafe({ type, titleText: title, message: msg });
    return;
  }
  toastTitle.textContent = title || (type === "success" ? "Success" : "Error");
  toastMsg.textContent = msg || "";
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 3000);
}
function hideToast() { if (toast) toast.classList.add("hidden"); }
toastClose?.addEventListener("click", hideToast);

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

// ---------- CAPTAIN UI ----------
function renderCaptainPill() {
  if (!captainPill) return;

  if (!selected.CAPTAIN) {
    captainPill.textContent = "Not selected";
    captainPill.className = "text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600";
    return;
  }

  const all = getSelectedPlayersArray();
  const cap = all.find(x => x.id === selected.CAPTAIN || x.player_id === selected.CAPTAIN);

  captainPill.textContent = cap ? `Captain: ${cap.name}` : "Captain selected";
  captainPill.className = "text-[11px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold";
}
async function loadCurrentWeek() {
  try {
    const res = await fetch(`${BASE}/team/get_current_week.php`, {
      headers: { Accept: "application/json" },
    });

    const data = await res.json();

    if (data?.success && Number(data.current_week) > 0) {
      CURRENT_WEEK = Number(data.current_week);
    } else {
      CURRENT_WEEK = 1;
    }

    document.getElementById("ui-week").textContent = CURRENT_WEEK;
    return CURRENT_WEEK;
  } catch (e) {
    console.error("loadCurrentWeek error:", e);
    CURRENT_WEEK = 1;
    return CURRENT_WEEK;
  }
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

  for (const p of players) {
    const isCap = (selected.CAPTAIN && (p.id === selected.CAPTAIN));
    rows.push(`
      <div class="bg-gray-50 border rounded-xl px-3 py-2 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs text-gray-500 font-bold">
            ${p._pos}
            ${isCap ? `<span class="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold">CAP</span>` : ""}
          </div>
          <div class="text-sm font-bold text-gray-800 truncate">${p.name || "Player"}</div>
          <div class="text-[11px] text-gray-500">${p.team || "—"} • $${formatMoney(p.price)}M</div>
        </div>
        <button type="button" class="text-gray-400 hover:text-red-600" data-remove-pos="${p._pos}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `);
  }

  if (coach) {
    rows.push(`
      <div class="bg-gray-50 border rounded-xl px-3 py-2 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs text-gray-500 font-bold">COACH</div>
          <div class="text-sm font-bold text-gray-800 truncate">${coach.name || "Coach"}</div>
          <div class="text-[11px] text-gray-500">${coach.team || "—"} • $${formatMoney(coach.price)}M</div>
        </div>
        <button type="button" class="text-gray-400 hover:text-red-600" data-remove-pos="COACH">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `);
  }

  myTeamList.innerHTML = rows.join("");

  myTeamList.querySelectorAll("[data-remove-pos]").forEach(btn => {
    btn.addEventListener("click", () => {
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

function closeCapModal() { captainModal.classList.add("hidden"); }

btnChooseCaptain?.addEventListener("click", openCaptainModal);
btnClearCaptain?.addEventListener("click", () => {
  selected.CAPTAIN = null;
  renderMyTeamList();
});

closeCaptainModal?.addEventListener("click", closeCapModal);

btnConfirmCaptain?.addEventListener("click", () => {
  const picked = captainList.querySelector('input[name="captainRadio"]:checked');
  if (!picked) {
    showToast("Captain", "Please choose a captain.");
    return;
  }
  selected.CAPTAIN = Number(picked.value);
  renderMyTeamList();
  closeCapModal();
  uiToastSafe("Captain saved ✅");
});

// ---------- BUDGET + TEAM WORTH ----------
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

// ---------- RESET + CLEAR SLOT ----------
function resetSelectedUI() {
  selected = { PG:null, SG:null, SF:null, PF:null, C:null, COACH:null, CAPTAIN:null };

  ["PG", "SG", "SF", "PF", "C", "COACH"].forEach((pos) => {
    const label = el(`pos-${pos}-name`);
    if (!label) return;

    if (pos === "COACH") label.textContent = "Select Coach";
    else label.textContent = `Select ${pos}`;

    label.classList.remove("cursor-pointer", "underline");
    label.onclick = null;

    applyTeamColorToSlot(pos, null);
  });

  setTeamWorth(0);
  renderMyTeamList();
}

function clearSlot(pos) {
  if (!pos) return;

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

  applyTeamColorToSlot(pos, null);

  computeSelectedTeamWorth();
  renderMyTeamList();
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = AuthService.getCurrentUser();

  if (!currentUser) {
    uiAlertSafe({
      type: "warn",
      titleText: "Login required",
      subText: "Session expired",
      message: "Please login again to build your team."
    });
    window.location.href = "login.html";
    return;
  }

  attachButtons();
await loadCurrentWeek();
await initTeamForCurrentWeek();

});

function attachButtons() {
  document.querySelectorAll(".select-player-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const position = btn.dataset.position;
      openModal(position);
    });
  });

  closeModal?.addEventListener("click", () => modal.classList.add("hidden"));

  saveBtn?.addEventListener("click", saveTeam);
  deleteBtn?.addEventListener("click", handleDeleteTeam);

  // remove single slot (×)
  document.addEventListener("click", (e) => {
    const x = e.target.closest(".remove-slot-btn");
    if (!x) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = x.dataset.slot;
    clearSlot(pos);
  });

  // modal search
  modalSearch?.addEventListener("input", () => renderModalShop());

  // modal chips filter
  document.querySelectorAll(".modal-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeChipFilter = chip.dataset.filter || "ALL";

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

// ---------- LOAD TEAM / BUDGET ----------
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

        applyTeamColorToSlot(pos, p.team);

        const label = el(`pos-${pos}-name`);
        if (label) {
          label.textContent = p.name || `Player #${p.id}`;
          label.classList.remove("cursor-pointer", "underline");
          label.onclick = null; // captain via modal only
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

// ---------- MODAL SHOP ----------
async function openModal(position) {
  activePosition = position;
  activeChipFilter = "ALL";

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
    modalList.innerHTML = `<div class="p-3 text-sm text-red-600 bg-white border rounded-xl">Error loading data.</div>`;
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

  if (q) {
    out = out.filter((it) => {
      const name = (it.name || "").toLowerCase();
      const team = (it.team || "").toLowerCase();
      const pos  = (it.position || "").toLowerCase();
      return name.includes(q) || team.includes(q) || pos.includes(q);
    });
  }

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

  out.sort((a, b) => Number(a.price) - Number(b.price));
  return out;
}

function renderModalShop() {
  const items = applyFilters(modalItemsRaw);
  modalList.innerHTML = "";

  if (!items.length) {
    modalList.innerHTML = `<div class="bg-white border rounded-xl p-4 text-sm text-gray-600">No results. Try another search.</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "bg-white border rounded-xl p-3 flex items-center justify-between hover:shadow-sm transition";

    const left = document.createElement("div");
    left.className = "min-w-0";

    const title = document.createElement("div");
    title.className = "font-bold text-sm text-gray-900 truncate";
    title.textContent = item.name || "Unknown";

    const meta = document.createElement("div");
    meta.className = "text-[11px] text-gray-500";
    meta.textContent = activePosition === "COACH"
      ? `${item.team || "—"} • Coach`
      : `${item.team || "—"} • ${(item.position || activePosition || "—").toUpperCase()}`;

    const pillColor = teamToColor(item.team);
    const pill = document.createElement("span");
    pill.className = "inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full";
    pill.textContent = item.team || "—";
    pill.style.backgroundColor = pillColor ? pillColor : "#f3f4f6";
    pill.style.color = pillColor ? "white" : "#374151";

    left.appendChild(title);
    left.appendChild(meta);
    left.appendChild(pill);

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
      uiToastSafe("Selected ✅");
    });

    right.appendChild(price);
    right.appendChild(btn);

    card.appendChild(left);
    card.appendChild(right);
    modalList.appendChild(card);
  });
}

function selectItem(position, item) {
  selected[position] = item;

  const label = el(`pos-${position}-name`);
  if (!label) return;

  label.textContent = item.name;

  // captain via modal only
  label.classList.remove("cursor-pointer", "underline");
  label.onclick = null;

  applyTeamColorToSlot(position, item.team);

  computeSelectedTeamWorth();
  renderMyTeamList();
}

// ---------- SAVE TEAM ----------
async function saveTeam() {
  if (!currentUser) {
    uiAlertSafe({
      type: "warn",
      titleText: "Login required",
      subText: "Session expired",
      message: "Please log in again."
    });
    window.location.href = "login.html";
    return;
  }

  // validate all positions
  const required = ["PG", "SG", "SF", "PF", "C", "COACH"];
  for (const r of required) {
    if (!selected[r]) {
      uiAlertSafe({
        type: "warn",
        titleText: "Missing selection",
        subText: "Team incomplete",
        message: `Please select a ${r}.`
      });
      return;
    }
  }

  // captain required
  if (!selected.CAPTAIN) {
    uiAlertSafe({
      type: "warn",
      titleText: "Captain required",
      subText: "One more step",
      message: "Please choose a captain using the Captain button."
    });
    return;
  }

  // budget check
  const totalCost = computeSelectedTeamWorth();
  const budgetText = document.getElementById("budget-display")?.textContent ?? "100";
  const currentBudget = Number(budgetText);

  if (Number.isFinite(currentBudget) && totalCost > currentBudget) {
    uiAlertSafe({
      type: "error",
      titleText: "Not enough budget",
      subText: "Budget limit",
      message: `Your team costs $${totalCost.toFixed(1)}M but your budget is $${currentBudget.toFixed(1)}M.`
    });
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
    players,
    coach_id: selected.COACH.id,
    captain_id: selected.CAPTAIN
  };

  try {
    // If team exists: ask confirmation to overwrite (NOT sell wording)
    if (existingTeamId) {
      const ok = await uiConfirmSafe({
        titleText: "Update this week’s team?",
        subText: `Week ${CURRENT_WEEK}`,
        message: "This will replace your current team for this week with the new selection.",
        okText: "Yes, Update",
        cancelText: "Cancel"
      });

      if (!ok) return;

      const del = await TeamService.deleteTeam({
        user_id: currentUser.id,
        week_number: CURRENT_WEEK
      });

      if (del && del.success === false) {
        uiAlertSafe({
          type: "error",
          titleText: "Update failed",
          subText: "Could not replace team",
          message: del.message || "Failed to delete existing team."
        });
        return;
      }

      existingTeamId = null;
    }

    const res = await TeamService.createTeam(payload);

    if (!res || !res.success) {
      const msg = (res?.message || "").toLowerCase();
      uiAlertSafe({
        type: "error",
        titleText: msg.includes("budget") ? "Budget error" : "Team save failed",
        subText: "Server response",
        message: res?.message || "Please try again."
      });
      return;
    }

    await initTeamForCurrentWeek();
    uiToastSafe("Team saved ✅");
    showToast("Saved", "Team saved successfully!", "success");
  } catch (err) {
    console.error("saveTeam error:", err);
    uiAlertSafe({
      type: "error",
      titleText: "Unexpected error",
      subText: "Save team",
      message: err?.message || "Unexpected error while saving team."
    });
  }
}

// ---------- SELL TEAM ----------
async function handleDeleteTeam() {
  if (!currentUser) return;

  if (!existingTeamId) {
    uiAlertSafe({
      type: "warn",
      titleText: "No team to sell",
      subText: `Week ${CURRENT_WEEK}`,
      message: "You don’t have a team for this week."
    });
    return;
  }

  const ok = await uiConfirmSafe({
    titleText: "Sell your team?",
    subText: `Week ${CURRENT_WEEK}`,
    message: "Are you sure you want to sell your team for this week? Your budget will be refunded.",
    okText: "Yes, Sell",
    cancelText: "Cancel"
  });

  if (!ok) return;

  try {
    const res = await TeamService.deleteTeam({ user_id: currentUser.id, week_number: CURRENT_WEEK });

    if (!res || !res.success) {
      uiAlertSafe({
        type: "error",
        titleText: "Sell failed",
        subText: "Server response",
        message: res?.message || "Failed to sell team."
      });
      return;
    }

    existingTeamId = null;
    resetSelectedUI();

    if (res.budget_remaining != null) setBudgetDisplay(res.budget_remaining);
    else await syncBudgetFromHistory();

    if (saveBtn) saveBtn.textContent = "Buy My Team";

    uiToastSafe("Team sold 💸");
    uiAlertSafe({
      type: "success",
      titleText: "Team sold",
      subText: `Week ${CURRENT_WEEK}`,
      message: "Your team was sold successfully. You can build a new one now."
    });
  } catch (err) {
    console.error("Delete team error:", err);
    uiAlertSafe({
      type: "error",
      titleText: "Unexpected error",
      subText: "Sell team",
      message: err?.message || "Unexpected error while deleting team."
    });
  }
}
