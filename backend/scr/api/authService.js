// scr/api/authService.js

import api from "./apiClient.js";

export const AuthService = {
    login: (username, password) =>
        api.post("auth/login.php", { username, password }),

    register: (username, email, password) =>
        api.post("auth/register.php", { username, email, password })
};
