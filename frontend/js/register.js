// js/register.js
import * as AuthMod from "../../backend/scr/api/authService.js";

// same trick you used in js-test
const AuthService = AuthMod.AuthService || AuthMod.default || AuthMod;

document.addEventListener("DOMContentLoaded", () => {
  const form       = document.getElementById("register-form");
  const teamNameEl = document.getElementById("reg-team-name");
  const emailEl    = document.getElementById("reg-email");
  const passEl     = document.getElementById("reg-password");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = teamNameEl.value.trim();
    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!username || !email || !password) {
      alert("Please fill team name, email, and password.");
      return;
    }

    try {
      const res = await AuthService.register({ username, email, password });

      if (res.success) {
        alert("Account created successfully. You can now log in.");
        window.location.href = "login.html";
      } else {
        alert(res.message || "Registration failed.");
        console.log("Registration error:", res);
      }
    } catch (err) {
      console.error("Register error:", err);
      alert("Error during registration (check console).");
    }
  });
});
