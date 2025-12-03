// ---------- Configuration ----------

const MIN_DELAY = 5000;
const MAX_DELAY = 20000;
const BUTTON_STEP = 50;

// Your deployed backend URL (change if needed)
const BACKEND_URL = "https://cloudcontrooler-backend.vercel.app";
const DELAY_API_URL = `${BACKEND_URL}/api/delay`;

// ---------- State ----------

let currentDelay = 7000;
let pollTimer = null;

// ---------- DOM elements ----------

const delayValueEl = document.getElementById("delayValue");
const delaySliderEl = document.getElementById("delaySlider");
const btnMinusEl = document.getElementById("btnMinus");
const btnPlusEl = document.getElementById("btnPlus");
const connectionStatusEl = document.getElementById("connectionStatus");

// ---------- Helper functions ----------

function clampDelay(v) {
  return Math.min(MAX_DELAY, Math.max(MIN_DELAY, v));
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

function updateUI(delay) {
  delayValueEl.textContent = delay;
  if (parseInt(delaySliderEl.value, 10) !== delay) {
    delaySliderEl.value = delay;
  }
}

// ---------- Backend communication ----------

async function fetchCurrentDelay() {
  try {
    const res = await fetch(DELAY_API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (typeof data.delay === "number") {
      currentDelay = clampDelay(data.delay);
      updateUI(currentDelay);
      setStatus(true);
    }
  } catch (err) {
    console.error("[frontend] fetchCurrentDelay error:", err);
    setStatus(false);
  }
}

async function sendDelay(newDelay) {
  const clamped = clampDelay(newDelay);
  currentDelay = clamped;
  updateUI(clamped);

  try {
    const res = await fetch(DELAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay: clamped }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (typeof data.delay === "number") {
      currentDelay = clampDelay(data.delay);
      updateUI(currentDelay);
    }
    setStatus(true);
  } catch (err) {
    console.error("[frontend] sendDelay error:", err);
    setStatus(false);
  }
}

// ---------- Event handlers ----------

// – button: decrease delay → faster blinking
btnMinusEl.addEventListener("click", () => {
  sendDelay(currentDelay - BUTTON_STEP);
});


// + button: increase delay → slower blinking
btnPlusEl.addEventListener("click", () => {
  sendDelay(currentDelay + BUTTON_STEP);
});


delaySliderEl.addEventListener("input", (e) => {
  sendDelay(parseInt(e.target.value, 10));
});

// ---------- Polling to stay in sync with other clients ----------

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchCurrentDelay, 1000); // every 1s
}

// ---------- Init ----------

window.addEventListener("load", () => {
  // Initialise UI with default
  delaySliderEl.min = MIN_DELAY;
  delaySliderEl.max = MAX_DELAY;
  delaySliderEl.value = currentDelay;
  updateUI(currentDelay);
  setStatus(false);

  // Get initial value from backend and start polling
  fetchCurrentDelay();
  startPolling();
});