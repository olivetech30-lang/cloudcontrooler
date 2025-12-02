const MIN_DELAY = 1;      // 1 second
const MAX_DELAY = 20;     // 20 seconds
const BUTTON_STEP = 1;    // 1 second step

const BACKEND_URL = "https://cloudcontrooler-backend.vercel.app";
const DELAY_API_URL = `${BACKEND_URL}/api/delay`;

let currentDelay = 2;     // 2 seconds default
let pollTimer = null;

const delayValueEl = document.getElementById("delayValue");
const delaySliderEl = document.getElementById("delaySlider");
const btnMinusEl = document.getElementById("btnMinus");
const btnPlusEl = document.getElementById("btnPlus");
const connectionStatusEl = document.getElementById("connectionStatus");

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

function updateUI(delaySec) {
  delayValueEl.textContent = delaySec; // show seconds
  if (parseInt(delaySliderEl.value, 10) !== delaySec) {
    delaySliderEl.value = delaySec;
  }
}

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

async function sendDelay(newDelaySec) {
  const clamped = clampDelay(newDelaySec);
  currentDelay = clamped;
  updateUI(clamped);

  try {
    const res = await fetch(DELAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay: clamped }),  // seconds
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

// – button: decrease delay (faster blink)
btnMinusEl.addEventListener("click", () => {
  sendDelay(currentDelay - BUTTON_STEP);
});

// + button: increase delay (slower blink)
btnPlusEl.addEventListener("click", () => {
  sendDelay(currentDelay + BUTTON_STEP);
});

// Slider: set exact delay (seconds)
delaySliderEl.addEventListener("input", (e) => {
  sendDelay(parseInt(e.target.value, 10));
});

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchCurrentDelay, 1000); // every 1 s
}

window.addEventListener("load", () => {
  delaySliderEl.min = MIN_DELAY;
  delaySliderEl.max = MAX_DELAY;
  delaySliderEl.step = 1;
  delaySliderEl.value = currentDelay;

  updateUI(currentDelay);
  setStatus(false);

  fetchCurrentDelay();
  startPolling();
});
