// backend/scr/api/authService.js
import api from "./apiClient.js"; // uses BASE_URL from apiClient.js

const USER_KEY = "fantasy_user"; // key in localStorage

export const AuthService = {
  // Register new user
  register({ username, email, password }) {
    return api.post("auth/register.php", {
      username,
      email,
      password,
    });
  },

  // Login (adjust endpoint/fields if your login.php is different)
  login({ email, password }) {
    return api.post("auth/login.php", {
      email,
      password,
    }).then(res => {
      if (res.success && res.user) {
        // Save user in localStorage so we can use id later
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      }
      return res;
    });
  },

  // Log out user
  logout() {
    localStorage.removeItem(USER_KEY);
  }

  ,
  // Get current logged-in user (or null)
  getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
};
