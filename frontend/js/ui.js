function friendlyMessage(res, fallback = "Done.") {
  if (!res) return fallback;

  // Common patterns in your PHP responses
  if (res.success === true) {
    return res.message || fallback;
  }
  if (res.success === false) {
    return res.message || "Something went wrong.";
  }

  // Sometimes services return {error: "..."}
  if (res.error) return res.error;

  return fallback;
}

/**
 * Shows a clean message in a <pre> or div.
 * If you want details, it adds a small "Show details" toggle.
 */
function showResultNice(targetId, res, options = {}) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const title = options.title || "";
  const ok = res?.success === true;
  const msg = friendlyMessage(res, options.fallback || "Done.");

  const icon = ok ? "✅" : "❌";
  const color = ok ? "text-green-700" : "text-red-700";

  // optional details
  const details = options.details !== false ? JSON.stringify(res, null, 2) : "";

  el.innerHTML = `
    <div class="${color} text-xs font-semibold">${icon} ${title ? title + ": " : ""}${msg}</div>
    ${
      details
        ? `<button class="mt-2 text-[11px] underline text-gray-500 hover:text-gray-700"
             data-toggle-details="1">Show details</button>
           <pre class="hidden mt-2 bg-gray-50 border rounded-lg p-2 text-[11px] overflow-x-auto">${details}</pre>`
        : ""
    }
  `;

  // Toggle details
  const btn = el.querySelector('[data-toggle-details="1"]');
  if (btn) {
    btn.addEventListener("click", () => {
      const pre = btn.nextElementSibling;
      if (!pre) return;
      const hidden = pre.classList.toggle("hidden");
      btn.textContent = hidden ? "Show details" : "Hide details";
    });
  }
}
