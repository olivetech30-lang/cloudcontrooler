const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 2000;
const BUTTON_STEP_MS = 100;

const BACKEND_URL = "https://cloudcontrollerbackend.vercel.app";
const DELAY_API_URL = `${BACKEND_URL}/api/delay`;

let currentDelayMs = 700;
let pollTimer = null;

const delayValueEl = document.getElementById("delayValue");
const delaySliderEl = document.getElementById("delaySlider");
const btnMinusEl = document.getElementById("btnMinus");
const btnPlusEl = document.getElementById("btnPlus");
const connectionStatusEl = document.getElementById("connectionStatus");

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

// – button: decrease delay → faster blink
btnMinusEl.addEventListener("click", () => {
  sendDelayMs(currentDelayMs - BUTTON_STEP_MS);
});

// + button: increase delay → slower blink
btnPlusEl.addEventListener("click", () => {
  sendDelayMs(currentDelayMs + BUTTON_STEP_MS);
});

// Slider: exact delay
delaySliderEl.addEventListener("input", (e) => {
  const valueMs = parseInt(e.target.value, 10);
  sendDelayMs(valueMs);
});

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchCurrentDelay, 2000);
}

window.addEventListener("load", () => {
  delaySliderEl.min = MIN_DELAY_MS;
  delaySliderEl.max = MAX_DELAY_MS;
  delaySliderEl.step = BUTTON_STEP_MS;
  delaySliderEl.value = currentDelayMs;

  updateUI(currentDelayMs);
  setStatus(false);

  fetchCurrentDelay();
  startPolling();
});
