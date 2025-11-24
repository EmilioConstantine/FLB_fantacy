// backend/scr/api/apiClient.js

// Make sure this matches your real path (watch upper/lower case)
const BASE_URL = "http://localhost/FLB_FANTACY/backend/api/";

/**
 * Low-level request helper
 * @param {string} endpoint - e.g. "admin/admin_add_players.php"
 * @param {Object} options  - fetch options: { method, body }
 */
async function request(endpoint, { method = "GET", body = null } = {}) {
  const url = BASE_URL + endpoint;

  const fetchOptions = {
    method,
    headers: {}
  };

  if (body !== null && body !== undefined) {
    fetchOptions.headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(body);

    // 🔍 DEBUG: see exactly what is being sent (including type)
    console.log(`[API ${method}]`, url, "payload:", body);
  } else {
    console.log(`[API ${method}]`, url);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    try {
      // Try to parse JSON from PHP
      return JSON.parse(text);
    } catch (e) {
      // PHP threw a warning/notice or echoed HTML
      return {
        success: false,
        error: "Response was not valid JSON",
        raw: text
      };
    }
  } catch (err) {
    // Network / CORS / fetch error
    return {
      success: false,
      error: "Fetch failed: " + err.message
    };
  }
}

const apiClient = {
  get(endpoint) {
    return request(endpoint, { method: "GET" });
  },
  post(endpoint, body) {
    return request(endpoint, { method: "POST", body });
  }
};

export default apiClient;
