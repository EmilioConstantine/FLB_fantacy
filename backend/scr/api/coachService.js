// backend/scr/api/coachService.js
import api from "./apiClient.js";

export const CoachService = {
  /**
   * Get all coaches
   * Calls: coaches/get_all_coaches.php
   */
  getAll() {
    return api.get("coaches/get_all_coaches.php");
  }
};

export default CoachService;
