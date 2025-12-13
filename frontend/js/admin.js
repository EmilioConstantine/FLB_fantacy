// frontend/js/admin.js
import { AdminService } from "../../backend/scr/api/adminService.js";

let currentAdmin = null;

// ---------- UI helpers ----------
function showJson(id, data) {
  const el = document.getElementById(id);
  if (el) el.textContent = JSON.stringify(data, null, 2);
}

function setAdminStatus(text) {
  const a = document.getElementById("admin-status-login");
  const b = document.getElementById("admin-status-panel");
  if (a) a.textContent = text;
  if (b) b.textContent = text;
}


function isAdminLoginPage() {
  // page has login inputs
  return !!document.getElementById("admin-username");
}

function isAdminPanelPage() {
  // page has admin tools
  return (
    !!document.getElementById("btnAddPlayer") ||
    !!document.getElementById("btn-run-scoring") ||
    !!document.getElementById("teams-table")
  );
}

// SAME-PAGE MODE = both login UI and panel UI exist together
function isSinglePageAdmin() {
  return isAdminLoginPage() && isAdminPanelPage();
}

function toggleAdminUI() {
  // Optional wrappers (recommended)
  const loginArea = document.getElementById("admin-login-area");
  const panelArea = document.getElementById("admin-panel-area");

  // If wrappers exist, toggle them. If not, do nothing (still works).
  if (loginArea) loginArea.style.display = currentAdmin ? "none" : "block";
  if (panelArea) panelArea.style.display = currentAdmin ? "block" : "none";
}

function requireAdmin() {
  if (!currentAdmin) {
    alert("You must be logged in as admin to do this.");
    return false;
  }
  return true;
}

// ---------- SESSION ----------
async function loadAdminSession() {
  try {
    // requires AdminService.me()
    const res = await AdminService.me();
    if (res?.success && res?.admin) {
      currentAdmin = res.admin;
      setAdminStatus(`Logged in as ${currentAdmin.username || "admin"}`);
      toggleAdminUI();
      return true;
    }
  } catch (e) {
    // ignore
  }

  currentAdmin = null;
  setAdminStatus("Not logged in.");
  toggleAdminUI();
  return false;
}

async function guardAdminPanel() {
  // If this page has admin panel tools and it is NOT the single-page admin,
  // then enforce redirect to separate login page.
  if (!isAdminPanelPage()) return;

  const ok = await loadAdminSession();
  if (!ok && !isSinglePageAdmin()) {
    window.location.href = "admin-login.html";
  }
}

// ---------- LOGIN / LOGOUT ----------
async function handleLoginClick(e) {
  // prevent form submission refresh (if button is inside <form>)
  if (e?.preventDefault) e.preventDefault();

  const username = document.getElementById("admin-username").value.trim();
  const password = document.getElementById("admin-password").value;

  if (!username || !password) {
    alert("Enter username and password");
    return;
  }

  setAdminStatus("Logging in...");

  const res = await AdminService.login({ username, password });

  if (res.success && res.admin) {
    currentAdmin = res.admin;
    setAdminStatus(`Logged in as ${currentAdmin.username || "admin"}`);
    showJson("admin-status-login", { success: res.success, admin: currentAdmin });

    toggleAdminUI();

    // ✅ IMPORTANT: Only redirect if login and panel are on different pages
    if (!isSinglePageAdmin()) {
      window.location.href = "admin.html";
    }
  } else {
    currentAdmin = null;
    setAdminStatus(res.message || "Login failed.");
    showJson("admin-status", res);
    toggleAdminUI();
  }
}

async function handleLogoutClick(e) {
  if (e?.preventDefault) e.preventDefault();

  try {
    await AdminService.logout();
  } catch (e2) {
    // ignore
  }

  currentAdmin = null;
  setAdminStatus("Not logged in.");
  toggleAdminUI();

  // If separate login page exists, go there.
  // If single-page admin, just stay and show login form.
  if (!isSinglePageAdmin()) {
    window.location.href = "admin-login.html";
  }
}

// ---------- ADMIN ACTIONS ----------
function attachAdminActions() {
  // ADD PLAYER
  const btnAddPlayer = document.getElementById("btnAddPlayer");
  if (btnAddPlayer) {
    btnAddPlayer.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const name = document.getElementById("ap_name").value.trim();
      const team = document.getElementById("ap_team").value.trim();
      const position = document.getElementById("ap_position").value.trim().toUpperCase();
      const price = Number(document.getElementById("ap_price").value);

      const res = await AdminService.addPlayer({ name, team, position, price });
      showJson("outAddPlayer", res);
    });
  }

  // ADD COACH
  const btnAddCoach = document.getElementById("btnAddCoach");
  if (btnAddCoach) {
    btnAddCoach.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const name = document.getElementById("ac_name").value.trim();
      const team = document.getElementById("ac_team").value.trim();
      const price = Number(document.getElementById("ac_price").value);
      const bonus_points = Number(document.getElementById("ac_bonus").value || 5);

      const res = await AdminService.addCoach({ name, team, price, bonus_points });
      showJson("outAddCoach", res);
    });
  }

  // ADD STATS
  const btnAddStats = document.getElementById("btnAddStats");
  if (btnAddStats) {
    btnAddStats.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const week_number = Number(document.getElementById("s_week").value);
      const player_id = Number(document.getElementById("s_player_id").value);

      const payload = {
        week_number,
        stats: [
          {
            player_id,
            points: Number(document.getElementById("s_points").value || 0),
            rebounds: Number(document.getElementById("s_rebounds").value || 0),
            assists: Number(document.getElementById("s_assists").value || 0),
            steals: Number(document.getElementById("s_steals").value || 0),
            blocks: Number(document.getElementById("s_blocks").value || 0),
            turnovers: Number(document.getElementById("s_turnovers").value || 0),
            minutes: Number(document.getElementById("s_minutes").value || 0),
          },
        ],
      };

      const res = await AdminService.addStats(payload);
      showJson("outStats", res);
    });
  }
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Make login button not submit forms (extra safety)
  const btnLogin = document.getElementById("btnAdminLogin");
  if (btnLogin) btnLogin.setAttribute("type", "button");

  // Guard if needed
  await guardAdminPanel();

  // Attach login/logout
  if (btnLogin) btnLogin.addEventListener("click", handleLoginClick);

  const btnLogout = document.getElementById("btnAdminLogout");
  if (btnLogout) btnLogout.addEventListener("click", handleLogoutClick);

  // Attach actions
  attachAdminActions();

  // On any page with login UI, show current status
  if (isAdminLoginPage()) {
    await loadAdminSession();
    if (currentAdmin) setAdminStatus(`Already logged in as ${currentAdmin.username || "admin"}`);
  }
});
