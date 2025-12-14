// frontend/js/admin.js
import { AdminService } from "../../backend/scr/api/adminService.js";

let currentAdmin = null;

/* =========================
   NICE UI HELPERS
   ========================= */

function uiToastSafe(message) {
  if (window.uiToast) return window.uiToast(message);
  console.log("[toast]", message);
}

function uiAlertSafe({ type = "info", titleText = "Info", subText = "", message = "" }) {
  if (window.uiAlert) {
    return window.uiAlert({ type, titleText, subText, message });
  }
  alert(`${titleText}\n${subText ? subText + "\n" : ""}${message}`);
}

function friendlyMessage(res) {
  const msg = (res?.message || "").toString().trim();
  if (!msg) return "Something went wrong. Please try again.";

  // You can map server messages to nicer ones here
  const map = {
    "Admin access only": "You must be logged in as admin.",
    "Invalid credentials": "Wrong username or password.",
    "week_number is required": "Please select a valid week number.",
  };

  return map[msg] || msg;
}

function showResultNice(outputId, res, opts = {}) {
  const out = document.getElementById(outputId);
  if (!out) return;

  const title = opts.title || "Result";
  const ok = !!res?.success;

  const header = ok ? `✅ ${title}: Success` : `❌ ${title}: Failed`;
  const message = ok ? (opts.successText || "Done.") : friendlyMessage(res);

  // Optional extra details
  const details = res && typeof res === "object"
    ? JSON.stringify(res, null, 2)
    : String(res);

  out.textContent = `${header}\n${message}\n\n--- raw ---\n${details}`;
}

/* =========================
   EXISTING HELPERS
   ========================= */

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

function setSessionPill(isLoggedIn) {
  const pill = document.getElementById("admin-session-pill");
  if (!pill) return;

  if (isLoggedIn) {
    pill.textContent = "SESSION: OK";
    pill.className =
      "px-3 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700";
  } else {
    pill.textContent = "SESSION: OFF";
    pill.className =
      "px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700";
  }
}

function isAdminLoginPage() {
  return !!document.getElementById("admin-username");
}

function isAdminPanelPage() {
  return (
    !!document.getElementById("btnAddPlayer") ||
    !!document.getElementById("btn-run-scoring") ||
    !!document.getElementById("teams-table")
  );
}

function isSinglePageAdmin() {
  return isAdminLoginPage() && isAdminPanelPage();
}

function toggleAdminUI() {
  const loginArea = document.getElementById("admin-login-area");
  const panelArea = document.getElementById("admin-panel-area");

  if (loginArea) loginArea.style.display = currentAdmin ? "none" : "block";
  if (panelArea) panelArea.style.display = currentAdmin ? "block" : "none";

  setSessionPill(!!currentAdmin);
}

function requireAdmin() {
  if (!currentAdmin) {
    uiAlertSafe({
      type: "error",
      titleText: "Admin required",
      subText: "Not logged in",
      message: "Please login as admin first.",
    });
    return false;
  }
  return true;
}

/* =========================
   SESSION
   ========================= */

async function loadAdminSession() {
  try {
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
  if (!isAdminPanelPage()) return;

  const ok = await loadAdminSession();
  if (!ok && !isSinglePageAdmin()) {
    window.location.href = "admin-login.html";
  }
}

/* =========================
   LOGIN / LOGOUT
   ========================= */

async function handleLoginClick(e) {
  if (e?.preventDefault) e.preventDefault();

  const username = document.getElementById("admin-username")?.value.trim();
  const password = document.getElementById("admin-password")?.value;

  if (!username || !password) {
    uiAlertSafe({
      type: "warn",
      titleText: "Missing fields",
      subText: "Username / password",
      message: "Please enter both username and password.",
    });
    return;
  }

  setAdminStatus("Logging in...");

  let resLogin;
  try {
    resLogin = await AdminService.login({ username, password });
  } catch (err) {
    setAdminStatus("Login error.");
    uiAlertSafe({
      type: "error",
      titleText: "Login failed",
      subText: "Network / Server error",
      message: err?.message || "Unexpected error during login.",
    });
    return;
  }

  if (resLogin?.success && resLogin?.admin) {
    currentAdmin = resLogin.admin;
    setAdminStatus(`Logged in as ${currentAdmin.username || "admin"}`);
    showJson("admin-status-login", { success: resLogin.success, admin: currentAdmin });

    toggleAdminUI();
    uiToastSafe("Logged in ✅");

    if (!isSinglePageAdmin()) window.location.href = "admin.html";
  } else {
    currentAdmin = null;
    setAdminStatus(resLogin?.message || "Login failed.");
    toggleAdminUI();

    uiAlertSafe({
      type: "error",
      titleText: "Invalid credentials",
      subText: "Try again",
      message: friendlyMessage(resLogin),
    });
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
  uiToastSafe("Logged out");

  if (!isSinglePageAdmin()) window.location.href = "admin-login.html";
}

/* =========================
   ADMIN ACTIONS
   ========================= */

function attachAdminActions() {
  // ADD PLAYER
  const btnAddPlayer = document.getElementById("btnAddPlayer");
  if (btnAddPlayer) {
    btnAddPlayer.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const name = document.getElementById("ap_name")?.value.trim();
      const team = document.getElementById("ap_team")?.value.trim();
      const position = document.getElementById("ap_position")?.value.trim().toUpperCase();
      const price = Number(document.getElementById("ap_price")?.value);

      if (!name || !team || !position || !Number.isFinite(price)) {
        uiAlertSafe({
          type: "warn",
          titleText: "Missing data",
          subText: "Add Player",
          message: "Fill: name, team, position, price.",
        });
        return;
      }

      let resPlayer;
      try {
        resPlayer = await AdminService.addPlayer({ name, team, position, price });
      } catch (err) {
        uiAlertSafe({
          type: "error",
          titleText: "Add Player Failed",
          subText: "Network error",
          message: err?.message || "Server error.",
        });
        return;
      }

      showResultNice("outAddPlayer", resPlayer, { title: "Add Player" });

      if (resPlayer?.success) uiToastSafe("Player added ✅");
      else uiAlertSafe({ type: "error", titleText: "Add Player Failed", subText: "", message: friendlyMessage(resPlayer) });
    });
  }

  // ADD COACH
  const btnAddCoach = document.getElementById("btnAddCoach");
  if (btnAddCoach) {
    btnAddCoach.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const name = document.getElementById("ac_name")?.value.trim();
      const team = document.getElementById("ac_team")?.value.trim();
      const price = Number(document.getElementById("ac_price")?.value);
      const bonus_points = Number(document.getElementById("ac_bonus")?.value || 5);

      if (!name || !team || !Number.isFinite(price) || !Number.isFinite(bonus_points)) {
        uiAlertSafe({
          type: "warn",
          titleText: "Missing data",
          subText: "Add Coach",
          message: "Fill: name, team, price, bonus points.",
        });
        return;
      }

      let resCoach;
      try {
        resCoach = await AdminService.addCoach({ name, team, price, bonus_points });
      } catch (err) {
        uiAlertSafe({
          type: "error",
          titleText: "Add Coach Failed",
          subText: "Network error",
          message: err?.message || "Server error.",
        });
        return;
      }

      showResultNice("outAddCoach", resCoach, { title: "Add Coach" });

      if (resCoach?.success) uiToastSafe("Coach added ✅");
      else uiAlertSafe({ type: "error", titleText: "Add Coach Failed", subText: "", message: friendlyMessage(resCoach) });
    });
  }

  // ADD STATS
  const btnAddStats = document.getElementById("btnAddStats");
  if (btnAddStats) {
    btnAddStats.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const week_number = Number(document.getElementById("s_week")?.value);
      const player_id = Number(document.getElementById("s_player_id")?.value);

      if (!week_number || !player_id) {
        uiAlertSafe({
          type: "warn",
          titleText: "Missing data",
          subText: "Weekly Stats",
          message: "Please enter week number and player id.",
        });
        return;
      }

      const payload = {
        week_number,
        stats: [
          {
            player_id,
            points: Number(document.getElementById("s_points")?.value || 0),
            rebounds: Number(document.getElementById("s_rebounds")?.value || 0),
            assists: Number(document.getElementById("s_assists")?.value || 0),
            steals: Number(document.getElementById("s_steals")?.value || 0),
            blocks: Number(document.getElementById("s_blocks")?.value || 0),
            turnovers: Number(document.getElementById("s_turnovers")?.value || 0),
            minutes: Number(document.getElementById("s_minutes")?.value || 0),
          },
        ],
      };

      let resStats;
      try {
        resStats = await AdminService.addStats(payload);
      } catch (err) {
        uiAlertSafe({
          type: "error",
          titleText: "Save Stats Failed",
          subText: "Network error",
          message: err?.message || "Server error.",
        });
        return;
      }

      showResultNice("outStats", resStats, { title: "Weekly Stats" });

      if (resStats?.success) uiToastSafe("Stats saved ✅");
      else uiAlertSafe({ type: "error", titleText: "Save Stats Failed", subText: "", message: friendlyMessage(resStats) });
    });
  }
}

/* =========================
   INIT
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {
  const btnLogin = document.getElementById("btnAdminLogin");
  if (btnLogin) btnLogin.setAttribute("type", "button");

  await guardAdminPanel();

  if (btnLogin) btnLogin.addEventListener("click", handleLoginClick);

  const btnLogout = document.getElementById("btnAdminLogout");
  if (btnLogout) btnLogout.addEventListener("click", handleLogoutClick);

  attachAdminActions();

  if (isAdminLoginPage()) {
    await loadAdminSession();
    if (currentAdmin) setAdminStatus(`Already logged in as ${currentAdmin.username || "admin"}`);
  }
});
