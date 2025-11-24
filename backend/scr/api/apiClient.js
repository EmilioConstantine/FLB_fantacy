// backend/scr/api/apiClient.js

const BASE_URL = "http://localhost/FLB_FANTACY/backend/api";

/**
 * Low-level helper that all services use
 */
async function request(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: {}
  };

  if (body !== null) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`, options);
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (e) {
      return {
        success: false,
        error: "Response was not valid JSON",
        raw: text
      };
    }
  } catch (err) {
    return {
      success: false,
      error: "Fetch failed: " + err.message
    };
  }
}

const apiClient = {
  get(endpoint) {
    return request(endpoint, "GET");
  },
  post(endpoint, body) {
    return request(endpoint, "POST", body);
  }
};

export default apiClient;
export { apiClient };
