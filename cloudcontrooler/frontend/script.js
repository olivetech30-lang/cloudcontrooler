
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Cloud Flash Controller</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app">
    <header>
      <h1>Cloud Flash Controller</h1>
      <div id="connectionStatus" class="status status-disconnected">
        Checking...
      </div>
    </header>

    <main>
      <section class="display">
        <div class="label">Current delay</div>
        <div class="value">
          <span id="delayValue">--</span>
          <span class="unit">ms</span>
        </div>
      </section>

      <section class="controls">
        <button id="btnMinus" class="btn">−</button>

        <div class="slider-wrapper">
          <input
            id="delaySlider"
            type="range"
            min="100"
            max="2000"
            step="100"
            value="700"
          />
          <div class="slider-labels">
            <span>Faster (100&nbsp;ms)</span>
            <span>Slower (2000&nbsp;ms)</span>
          </div>
        </div>

        <button id="btnPlus" class="btn">+</button>
      </section>

      <section class="hint">
        <p>
          Use <strong>−</strong> to blink faster, <strong>+</strong> to blink slower,
          or drag the slider to set an exact delay (100–2000&nbsp;ms).
        </p>
        <p>
          This page talks to a cloud API; the ESP32 polls the same API via HTTPS.
        </p>
      </section>
    </main>
  </div>

  <script src="script.js"></script>
</body>
</html>
