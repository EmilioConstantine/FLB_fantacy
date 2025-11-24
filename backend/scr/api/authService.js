// backend/scr/api/authService.js
import api from "./apiClient.js";

const USER_KEY = "fantasy_user";

export const AuthService = {
  /**
   * Register new user
   * Calls: auth/register.php
   * Body: { username, email, password }
   */
  register({ username, email, password }) {
    return api.post("auth/register.php", {
      username,
      email,
      password
    });
  },

  /**
   * Login user
   * Calls: auth/login.php
   * Body: { email, password }
   * Stores res.user in localStorage if success
   */
  async login({ email, password }) {
    const res = await api.post("auth/login.php", { email, password });
    if (res.success && res.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Logout on client side only
   */
  logout() {
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Read current user from localStorage
   */
  getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
};

export default AuthService;
