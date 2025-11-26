// frontend/js/admin.js
import { AdminService } from "../../backend/scr/api/adminService.js";

let currentAdmin = null;

function showJson(id, data) {
  document.getElementById(id).textContent = JSON.stringify(data, null, 2);
}

function setAdminStatus(text) {
  document.getElementById("admin-status").textContent = text;
}

function requireAdmin() {
  if (!currentAdmin) {
    alert("You must be logged in as admin to do this.");
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin  = document.getElementById("btnAdminLogin");
  const btnLogout = document.getElementById("btnAdminLogout");

  // ---- ADMIN LOGIN ----
  btnLogin.addEventListener("click", async () => {
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value;

    if (!username || !password) {
      alert("Enter username and password");
      return;
    }

    const res = await AdminService.login({ username, password });
    if (res.success && res.admin) {
      currentAdmin = res.admin;
      setAdminStatus(`Logged in as ${currentAdmin.username || "admin"}`);
    } else {
      currentAdmin = null;
      setAdminStatus("Login failed.");
    }
    showJson("admin-status", { success: res.success, admin: currentAdmin });
  });

  // ---- ADMIN LOGOUT ----
  btnLogout.addEventListener("click", () => {
    currentAdmin = null;
    setAdminStatus("Not logged in.");
  });

  // ---- ADD PLAYER ----
  document.getElementById("btnAddPlayer").addEventListener("click", async () => {
    if (!requireAdmin()) return;

    const name     = document.getElementById("ap_name").value.trim();
    const team     = document.getElementById("ap_team").value.trim();
    const position = document.getElementById("ap_position").value.trim().toUpperCase();
    const price    = Number(document.getElementById("ap_price").value);

    const res = await AdminService.addPlayer({ name, team, position, price });
    showJson("outAddPlayer", res);
  });

  // ---- ADD COACH ----
  document.getElementById("btnAddCoach").addEventListener("click", async () => {
    if (!requireAdmin()) return;

    const name         = document.getElementById("ac_name").value.trim();
    const team         = document.getElementById("ac_team").value.trim();
    const price        = Number(document.getElementById("ac_price").value);
    const bonus_points = Number(document.getElementById("ac_bonus").value || 5);

    const res = await AdminService.addCoach({ name, team, price, bonus_points });
    showJson("outAddCoach", res);
  });

  // ---- ADD STATS ----
  document.getElementById("btnAddStats").addEventListener("click", async () => {
    if (!requireAdmin()) return;

    const week_number = Number(document.getElementById("s_week").value);
    const player_id   = Number(document.getElementById("s_player_id").value);

    const payload = {
      week_number,
      stats: [
        {
          player_id,
          points:    Number(document.getElementById("s_points").value || 0),
          rebounds:  Number(document.getElementById("s_rebounds").value || 0),
          assists:   Number(document.getElementById("s_assists").value || 0),
          steals:    Number(document.getElementById("s_steals").value || 0),
          blocks:    Number(document.getElementById("s_blocks").value || 0),
          turnovers: Number(document.getElementById("s_turnovers").value || 0),
          minutes:   Number(document.getElementById("s_minutes").value || 0)
        }
      ]
    };

    const res = await AdminService.addStats(payload);
    showJson("outStats", res);
  });
});
