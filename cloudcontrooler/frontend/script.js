// ---------- Configuration (milliseconds) ----------

const MIN_DELAY_MS = 500;    // 0.5 s
const MAX_DELAY_MS = 5000;   // 5.0 s
const BUTTON_STEP_MS = 500;  // +/- 0.5 s per click

const BACKEND_URL = "https://cloudcontrollerbackend.vercel.app";
const DELAY_API_URL = `${BACKEND_URL}/api/delay`;

// ---------- State ----------

let currentDelayMs = 700;    // default 0.7 s

// ---------- DOM elements ----------

const delayValueEl      = document.getElementById("delayValue");
const delaySliderEl     = document.getElementById("delaySlider");
const btnMinusEl        = document.getElementById("btnMinus");
const btnPlusEl         = document.getElementById("btnPlus");
const connectionStatusEl = document.getElementById("connectionStatus");

// ---------- Helpers ----------

function clampDelayMs(v) {
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, v));
}

function setStatus(online) {
  if (online) {
    connectionStatusEl.textContent = "Online";
    connectionStatusEl.classList.remove("status-disconnected");
    connectionStatusEl.classList.add("status-connected");
  } else {
    connectionStatusEl.textContent = "Offline";
    connectionStatusEl.classList.remove("status-connected");
    connectionStatusEl.classList.add("status-disconnected");
  }
}

function updateUI(delayMs) {
  delayValueEl.textContent = delayMs;
  if (parseInt(delaySliderEl.value, 10) !== delayMs) {
    delaySliderEl.value = delayMs;
  }
}

// ---------- Backend calls ----------

// GET /api/delay once on page load
async function fetchCurrentDelay() {
  try {
    const res = await fetch(DELAY_API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (typeof data.delay === "number") {
      currentDelayMs = clampDelayMs(data.delay);
      updateUI(currentDelayMs);
      setStatus(true);
    }
  } catch (err) {
    console.error("[frontend] fetchCurrentDelay error:", err);
    setStatus(false);
  }
}

// POST /api/delay whenever user changes delay
async function sendDelayMs(newDelayMs) {
  const clampedMs = clampDelayMs(newDelayMs);
  currentDelayMs = clampedMs;
  updateUI(clampedMs);

  try {
    const res = await fetch(DELAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay: clampedMs })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (typeof data.delay === "number") {
      currentDelayMs = clampDelayMs(data.delay);
      updateUI(currentDelayMs);
    }
    setStatus(true);
  } catch (err) {
    console.error("[frontend] sendDelayMs error:", err);
    setStatus(false);
  }
}

// ---------- UI events ----------

// – button: smaller delay => faster blink
btnMinusEl.addEventListener("click", () => {
  sendDelayMs(currentDelayMs - BUTTON_STEP_MS);
});

// + button: larger delay => slower blink
btnPlusEl.addEventListener("click", () => {
  sendDelayMs(currentDelayMs + BUTTON_STEP_MS);
});

// Slider: exact delay in ms
delaySliderEl.addEventListener("input", (e) => {
  const valueMs = parseInt(e.target.value, 10);
  sendDelayMs(valueMs);
});

// ---------- Init (no browser polling) ----------

window.addEventListener("load", () => {
  delaySliderEl.min = MIN_DELAY_MS;
  delaySliderEl.max = MAX_DELAY_MS;
  delaySliderEl.step = BUTTON_STEP_MS;
  delaySliderEl.value = currentDelayMs;

  updateUI(currentDelayMs);
  setStatus(false);

  // Fetch initial delay from backend ONCE
  fetchCurrentDelay();
});
