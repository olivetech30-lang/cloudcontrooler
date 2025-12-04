// ---------- Configuration (SECONDS) ----------

const MIN_DELAY_SEC = 1;      // matches MIN_DELAY_SEC in main.cpp
const MAX_DELAY_SEC = 7;     // matches MAX_DELAY_SEC in main.cpp
const BUTTON_STEP_SEC = 1;    // +/- 1 second per click

// Backend URL (update if Vercel domain changes)
const BACKEND_URL = "https://cloudcontrollerbackend.vercel.app";
const DELAY_API_URL = `${BACKEND_URL}/api/delay`;

// ---------- State ----------

let currentDelaySec = 3;      // default 7s -> matches blinkDelaySec
let pollTimer = null;

// ---------- DOM elements ----------

const delayValueEl = document.getElementById("delayValue");
const delaySliderEl = document.getElementById("delaySlider");
const btnMinusEl = document.getElementById("btnMinus");
const btnPlusEl = document.getElementById("btnPlus");
const connectionStatusEl = document.getElementById("connectionStatus");

// ---------- Helpers ----------

function clampDelaySec(v) {
  return Math.min(MAX_DELAY_SEC, Math.max(MIN_DELAY_SEC, v));
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

function updateUI(delaySec) {
  delayValueEl.textContent = delaySec;     // show seconds
  if (parseInt(delaySliderEl.value, 10) !== delaySec) {
    delaySliderEl.value = delaySec;
  }
}

// ---------- Backend communication ----------

// Read current delay (in SECONDS) from backend
async function fetchCurrentDelay() {
  try {
    const res = await fetch(DELAY_API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    if (typeof data.delay === "number") {
      const sec = clampDelaySec(data.delay);  // data.delay is seconds
      currentDelaySec = sec;
      updateUI(sec);
      setStatus(true);
    }
  } catch (err) {
    console.error("[frontend] fetchCurrentDelay error:", err);
    setStatus(false);
  }
}

// Send new delay in SECONDS
async function sendDelaySec(newDelaySec) {
  const clampedSec = clampDelaySec(newDelaySec);
  currentDelaySec = clampedSec;
  updateUI(clampedSec);

  try {
    const res = await fetch(DELAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay: clampedSec }),  // seconds
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    if (typeof data.delay === "number") {
      const sec = clampDelaySec(data.delay);
      currentDelaySec = sec;
      updateUI(sec);
    }
    setStatus(true);
  } catch (err) {
    console.error("[frontend] sendDelaySec error:", err);
    setStatus(false);
  }
}

// ---------- Event handlers ----------

// – button: decrease delay -> faster blinking
btnMinusEl.addEventListener("click", () => {
  sendDelaySec(currentDelaySec - BUTTON_STEP_SEC);
});

// + button: increase delay -> slower blinking
btnPlusEl.addEventListener("click", () => {
  sendDelaySec(currentDelaySec + BUTTON_STEP_SEC);
});

// Slider: set exact delay in seconds
delaySliderEl.addEventListener("input", (e) => {
  const valueSec = parseInt(e.target.value, 10);
  sendDelaySec(valueSec);
});

// ---------- Polling (keep in sync across multiple clients) ----------

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchCurrentDelay, 2000); // every 2s
}

// ---------- Init ----------

window.addEventListener("load", () => {
  // Ensure slider matches config
  delaySliderEl.min = MIN_DELAY_SEC;
  delaySliderEl.max = MAX_DELAY_SEC;
  delaySliderEl.step = 1;
  delaySliderEl.value = currentDelaySec;

  updateUI(currentDelaySec);
  setStatus(false);

  fetchCurrentDelay();
  startPolling();
});

