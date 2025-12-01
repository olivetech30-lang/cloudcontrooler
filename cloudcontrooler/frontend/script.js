// frontend/script.js

const MIN_DELAY = 50;
const MAX_DELAY = 2000;
const BUTTON_STEP = 50;

// Backend API base URL
const BACKEND_URL = "https://cloudcontrooler-backend.vercel.app"; // e.g. https://flash-backend-yourname.vercel.app
const DELAY_API_URL = `${BACKEND_URL}/api/delay`;

let currentDelay = 700;
let pollingTimer = null;

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

function updateUI(delay) {
  delayValueEl.textContent = delay;
  if (parseInt(delaySliderEl.value, 10) !== delay) {
    delaySliderEl.value = delay;
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
    console.error("Failed to fetch delay:", err);
    setStatus(false);
  }
}

async function sendDelay(delay) {
  const clamped = clampDelay(delay);
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
    console.error("Failed to send delay:", err);
    setStatus(false);
  }
}

// UI events
btnMinusEl.addEventListener("click", () => {
  sendDelay(currentDelay - BUTTON_STEP);
});

btnPlusEl.addEventListener("click", () => {
  sendDelay(currentDelay + BUTTON_STEP);
});

delaySliderEl.addEventListener("input", (e) => {
  sendDelay(parseInt(e.target.value, 10));
});

// Poll backend periodically to reflect changes from other users
function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(fetchCurrentDelay, 1000); // every 1s
}

window.addEventListener("load", () => {
  setStatus(false);
  fetchCurrentDelay();
  startPolling();

});


