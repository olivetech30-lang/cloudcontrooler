#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ---------- User configuration ----------

// Use your hotspot or home WiFi (2.4 GHz WPA/WPA2)
const char* WIFI_SSID     = "ESPTEST";
const char* WIFI_PASSWORD = "12345678";

// Backend domain (NO https://, NO path)
const char* BACKEND_HOST  = "cloudcontrooler-backend.vercel.app";
const char* DELAY_PATH    = "/api/delay";

// Built-in NeoPixel on ESP32-S3
#define LED_PIN     48
#define NUM_PIXELS  1

// Blink color
#define LED_ON_R  0
#define LED_ON_G  0
#define LED_ON_B  255

// Delay range from frontend
const int MIN_DELAY = 5000;
const int MAX_DELAY = 20000;

// How often to poll the backend
const unsigned long POLL_INTERVAL_MS = 500;

Adafruit_NeoPixel pixels(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);

// Current blink delay in ms (larger → slower; smaller → faster).
int blinkDelay = 7000;

unsigned long lastToggleTime = 0;
bool ledOn = false;
unsigned long lastPollTime = 0;

// ---------- Helpers ----------

int clampDelay(int value) {
  if (value < MIN_DELAY) return MIN_DELAY;
  if (value > MAX_DELAY) return MAX_DELAY;
  return value;
}

void showColor(uint8_t r, uint8_t g, uint8_t b) {
  pixels.setPixelColor(0, pixels.Color(r, g, b));
  pixels.show();
}

void setLedState(bool on) {
  ledOn = on;
  if (on) {
    showColor(LED_ON_R, LED_ON_G, LED_ON_B);   // blue
  } else {
    showColor(0, 0, 0);                        // off
  }
}

// ---------- WiFi ----------

void connectToWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Red while connecting
  showColor(255, 0, 0);

  uint8_t attempt = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempt++;
    if (attempt >= 60) {  // ~30 s timeout
      Serial.println("\n[WiFi] Failed to connect, restarting...");
      for (int i = 0; i < 3; i++) {
        showColor(255, 0, 0);
        delay(150);
        showColor(0, 0, 0);
        delay(150);
      }
      ESP.restart();
    }
  }

  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());

  // Green twice on success
  for (int i = 0; i < 2; i++) {
    showColor(0, 255, 0);
    delay(200);
    showColor(0, 0, 0);
    delay(200);
  }

  // Start blinking with LED off
  setLedState(false);
}

// ---------- Backend polling ----------

void fetchDelayFromCloud() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();    // TLS without certificate check

  HTTPClient https;
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
      int newDelay = clampDelay((int)doc["delay"]);
      if (newDelay != blinkDelay) {
        blinkDelay = newDelay;
        Serial.print("[HTTP] New blinkDelay: ");
        Serial.print(blinkDelay);
        Serial.println(" s");
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
  Serial.println("\n=== ESP32-S3 Cloud Flash Controller ===");

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

  // Poll backend every POLL_INTERVAL_MS
  if (now - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = now;
    fetchDelayFromCloud();
  }

  // Blink with current delay (bigger value => slower toggle)
  if (now - lastToggleTime >= (unsigned long)blinkDelay) {
    lastToggleTime = now;
    setLedState(!ledOn);
  }
}