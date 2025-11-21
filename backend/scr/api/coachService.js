// backend/scr/api/coachService.js
import api from "./apiClient.js";

export const CoachService = {
  getAll() {
    return api.get("coaches/get_all_coaches.php");
  }
};
