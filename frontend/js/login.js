// js/login.js
import * as AuthMod from "../../backend/scr/api/authService.js";

const AuthService = AuthMod.AuthService || AuthMod.default || AuthMod;

document.addEventListener("DOMContentLoaded", () => {
  const form    = document.getElementById("login-form");
  const emailEl = document.getElementById("login-email");
  const passEl  = document.getElementById("login-password");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      alert("Please fill email and password.");
      return;
    }

    try {
      const res = await AuthService.login({ email, password });

      if (res.success && res.user) {
        // AuthService already saves user in localStorage
        // Now redirect to the team builder page
        window.location.href = "team-builder.html";
      } else {
        alert(res.message || "Invalid credentials.");
        console.log("Login error:", res);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Error during login (check console).");
    }
  });
});
