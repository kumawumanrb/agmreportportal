// ====== CONFIGURE THIS ======
const LATEST_PDF_URL = "assets/KRB_2024_AGM_REPORTS.pdf"; // replace with your newest report
// ============================

function show(id, html) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  el.classList.remove("hidden");
}

function hide(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
}

function isUrl(text) {
  try { new URL(text); return true; } catch { return false; }
}

async function lookupReport(codeRaw) {
  const code = String(codeRaw || "").trim();
  if (!code) throw new Error("Please enter a valid code.");

  // If the QR holds a direct URL, use it as-is
  if (isUrl(code)) return { title: "Report", url: code };

  // Map short codes via reports.json
  const res = await fetch("reports.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load reports.json.");
  const map = await res.json();

  const entry = map[code];
  if (!entry) throw new Error(`No report found for code: ${code}`);

  return typeof entry === "string"
    ? { title: code, url: entry }
    : { title: entry.title || code, url: entry.url };
}

function renderSuccess({ title, url }) {
  hide("error");
  show("result", `
    <h2>Report Found</h2>
    <p><strong>${title}</strong></p>
    <a class="btn" href="${url}" download>Download 2025 Report</a>
    <a class="btn btn-secondary" href="${url}" target="_blank" rel="noopener">Open 2025 Report</a>
  `);
}

function renderError(message) {
  hide("result");
  show("error", `<h2>Error</h2><p>${message}</p>`);
}

let html5Qrcode = null;

async function startScanner() {
  const startBtn = document.getElementById("start-scan");
  const stopBtn = document.getElementById("stop-scan");
  const status = document.getElementById("scan-status");
  startBtn.disabled = true; stopBtn.disabled = false;
  status.textContent = "Initializing camera…";

  try {
    html5Qrcode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 280, height: 280 }, rememberLastUsedCamera: true };

    await html5Qrcode.start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        status.textContent = "QR detected. Resolving…";
        try {
          const report = await lookupReport(decodedText);
          renderSuccess(report);
        } catch (e) {
          renderError(e.message || "Failed to resolve code.");
        } finally {
          stopScanner(); // stop after first read
        }
      }
    );

    status.textContent = "Point your camera at the QR code.";
  } catch (e) {
    document.getElementById("start-scan").disabled = false;
    document.getElementById("stop-scan").disabled = true;
    renderError("Unable to start camera. Please allow permissions or use the manual code.");
    status.textContent = "Camera failed to start.";
  }
}

async function stopScanner() {
  const startBtn = document.getElementById("start-scan");
  const stopBtn = document.getElementById("stop-scan");
  const status = document.getElementById("scan-status");

  if (html5Qrcode) {
    try { await html5Qrcode.stop(); await html5Qrcode.clear(); } catch {}
    html5Qrcode = null;
  }
  startBtn.disabled = false; stopBtn.disabled = true;
  status.textContent = "Camera is idle.";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  // Latest buttons
  const latestBtn = document.getElementById("download-latest");
  const latestOpen = document.getElementById("open-latest");
  latestBtn.href = LATEST_PDF_URL;
  latestOpen.href = LATEST_PDF_URL;

  // Scanner controls
  document.getElementById("start-scan").addEventListener("click", startScanner);
  document.getElementById("stop-scan").addEventListener("click", stopScanner);

  // Manual lookup
  document.getElementById("go-manual").addEventListener("click", async () => {
    const code = document.getElementById("manual-code").value;
    try {
      const report = await lookupReport(code);
      renderSuccess(report);
    } catch (e) {
      renderError(e.message || "Failed to resolve code.");
    }
  });

  // Register SW (optional)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
});
