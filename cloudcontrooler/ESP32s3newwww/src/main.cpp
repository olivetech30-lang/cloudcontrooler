

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

const char* WIFI_SSID     = "Android";
const char* WIFI_PASSWORD = "1122334455";

const char* BACKEND_HOST  = "cloudcontrollerbackend.vercel.app";  // check spelling
const char* DELAY_PATH    = "/api/delay";

#define LED_PIN     48
#define NUM_PIXELS  1
#define LED_ON_R    0
#define LED_ON_G    0
#define LED_ON_B    255

// Delay range in SECONDS from frontend
const int MIN_DELAY_SEC = 5;
const int MAX_DELAY_SEC = 20;

// How often to poll backend
const unsigned long POLL_INTERVAL_MS = 1000;

Adafruit_NeoPixel pixels(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);

// current delay in seconds and milliseconds
int blinkDelaySec = 7;
unsigned long blinkDelayMs = 7000;

unsigned long lastToggleTime = 0;
bool ledOn = false;
unsigned long lastPollTime = 0;

// ---- helpers ----

int clampDelaySec(int value) {
  if (value < MIN_DELAY_SEC) return MIN_DELAY_SEC;
  if (value > MAX_DELAY_SEC) return MAX_DELAY_SEC;
  return value;
}

void showColor(uint8_t r, uint8_t g, uint8_t b) {
  pixels.setPixelColor(0, pixels.Color(r, g, b));
  pixels.show();
}

void setLedState(bool on) {
  ledOn = on;
  if (on) showColor(LED_ON_R, LED_ON_G, LED_ON_B);
  else    showColor(0, 0, 0);
}

// ---- WiFi ----

void connectToWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  showColor(255, 0, 0);

  uint8_t attempt = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempt++;
    if (attempt >= 60) {
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

  for (int i = 0; i < 2; i++) {
    showColor(0, 255, 0);
    delay(200);
    showColor(0, 0, 0);
    delay(200);
  }

  setLedState(false);
}

// ---- backend polling ----

void fetchDelayFromCloud() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

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
      int newSec = clampDelaySec((int)doc["delay"]);  // seconds
      if (newSec != blinkDelaySec) {
        blinkDelaySec = newSec;
        blinkDelayMs  = (unsigned long)blinkDelaySec * 1000UL;
        Serial.print("[HTTP] New blinkDelay: ");
        Serial.print(blinkDelaySec);
        Serial.println(" s");
      }
    }
  } else {
    Serial.print("[HTTP] GET failed, code=");
    Serial.println(httpCode);
  }

  https.end();
}

// ---- Arduino setup & loop ----

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32-S3 Cloud Flash Controller (seconds) ===");

  pixels.begin();
  pixels.clear();
  pixels.show();
  setLedState(false);

  blinkDelayMs = (unsigned long)blinkDelaySec * 1000UL;
  connectToWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  unsigned long now = millis();

  if (now - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = now;
    fetchDelayFromCloud();
  }

  if (now - lastToggleTime >= blinkDelayMs) {
    lastToggleTime = now;
    setLedState(!ledOn);
  }
}
