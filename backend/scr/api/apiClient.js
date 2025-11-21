// backend/scr/api/apiClient.js
const BASE_URL = "http://localhost/FLB_FANTACY/backend/api"; // use your real path & case

async function request(endpoint, method = "GET", body = null) {
  const options = { method, headers: {} };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, options);
    const text = await response.text();

    try {
      return JSON.parse(text); // valid JSON from PHP
    } catch (e) {
      return {
        success: false,
        error: "Response was not valid JSON",
        raw: text
      };
    }
  } catch (err) {
    // network / CORS / fetch error
    return {
      success: false,
      error: "Fetch failed: " + err.message
    };
  }
}

export default {
  get: (endpoint) => request(endpoint, "GET"),
  post: (endpoint, body) => request(endpoint, "POST", body)
};
