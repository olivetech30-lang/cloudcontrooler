#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ---------- User configuration ----------

const char* WIFI_SSID     = "Android";
const char* WIFI_PASSWORD = "1122334455";

const char* BACKEND_HOST  = "cloudcontrollerbackend.vercel.app";  // Vercel backend
const char* DELAY_PATH    = "/api/delay";

#define LED_PIN     48
#define NUM_PIXELS  1
#define LED_ON_R    0
#define LED_ON_G    0
#define LED_ON_B    255

// Delay range in MILLISECONDS from frontend (0.5 s to 5 s)
const int MIN_DELAY_MS = 500;      // 0.5 s
const int MAX_DELAY_MS = 5000;     // 5.0 s

// How often to poll backend for new delay
const unsigned long POLL_INTERVAL_MS = 3000;  // every 3 seconds

Adafruit_NeoPixel pixels(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);

// current delay in ms (controls blink speed)
int blinkDelayMs = 700;            // default 0.7 s

unsigned long lastToggleTime = 0;
unsigned long lastPollTime   = 0;
bool ledOn = false;

// ---------- Helpers ----------

int clampDelayMs(int value) {
  if (value < MIN_DELAY_MS) return MIN_DELAY_MS;
  if (value > MAX_DELAY_MS) return MAX_DELAY_MS;
  return value;
}

void showColor(uint8_t r, uint8_t g, uint8_t b) {
  pixels.setPixelColor(0, pixels.Color(r, g, b));
  pixels.show();
}

void setLedState(bool on) {
  ledOn = on;
  if (on) {
    showColor(LED_ON_R, LED_ON_G, LED_ON_B);
  } else {
    showColor(0, 0, 0);
  }
}

// ---------- WiFi ----------

void connectToWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  showColor(255, 0, 0);  // red while connecting

  uint8_t attempt = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempt++;
    if (attempt >= 60) {
      Serial.println("\n[WiFi] Failed to connect, restarting...");
      for (int i = 0; i < 3; i++) {
        showColor(255, 0, 0); delay(150);
        showColor(0, 0, 0);   delay(150);
      }
      ESP.restart();
    }
  }

  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());

  // Green twice on success
  for (int i = 0; i < 2; i++) {
    showColor(0, 255, 0); delay(200);
    showColor(0, 0, 0);   delay(200);
  }

  setLedState(false);
}

// ---------- Backend polling ----------

void fetchDelayFromCloud() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();  // keep TLS, skip cert validation for simplicity

  HTTPClient https;
  https.setTimeout(500); // do not block more than 500 ms per request

  String url = String("https://") + BACKEND_HOST + DELAY_PATH;

  if (!https.begin(client, url)) {
    Serial.println("[HTTP] https.begin() failed");
    return;
  }

  int httpCode = https.GET();
  if (httpCode == 200) {
    String payload = https.getString();
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err && doc.containsKey("delay")) {
      int newDelayMs = clampDelayMs((int)doc["delay"]);
      if (newDelayMs != blinkDelayMs) {
        blinkDelayMs = newDelayMs;
        Serial.print("[HTTP] New blinkDelay: ");
        Serial.print(blinkDelayMs);
        Serial.println(" ms");
      }
    }
  } else {
    Serial.print("[HTTP] GET failed, code=");
    Serial.println(httpCode);
  }

  https.end();
}

// ---------- Arduino setup & loop ----------

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32-S3 Cloud Flash Controller (ms only) ===");

  pixels.begin();
  pixels.clear();
  pixels.show();
  setLedState(false);

  connectToWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  unsigned long now = millis();

  // 1) Poll backend every POLL_INTERVAL_MS to get updated delay
  if (now - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = now;
    fetchDelayFromCloud();
  }

  // 2) Blink using the current blinkDelayMs (bigger => slower)
  if (now - lastToggleTime >= (unsigned long)blinkDelayMs) {
    lastToggleTime = now;
    setLedState(!ledOn);  // toggle LED
  }
}
