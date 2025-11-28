#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ---------- User configuration ----------

const char* WIFI_SSID     = "FFC-BYOD";
const char* WIFI_PASSWORD = "6214";

// Vercel backend domain (NO https://, NO path)
const char* BACKEND_HOST = "cloudcontrooler.vercel.app";
const char* DELAY_PATH   = "/api/delay";

#define LED_PIN     48
#define NUM_PIXELS  1

#define LED_ON_R  0
#define LED_ON_G  0
#define LED_ON_B  255

const int MIN_DELAY = 50;
const int MAX_DELAY = 2000;
const unsigned long POLL_INTERVAL_MS = 300;

Adafruit_NeoPixel pixels(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);

int blinkDelay = 700;
unsigned long lastToggleTime = 0;
bool ledOn = false;
unsigned long lastPollTime = 0;

int clampDelay(int value) {
  if (value < MIN_DELAY) return MIN_DELAY;
  if (value > MAX_DELAY) return MAX_DELAY;
  return value;
}

void setLedState(bool on) {
  ledOn = on;
  if (on) {
    uint32_t color = pixels.Color(LED_ON_R, LED_ON_G, LED_ON_B);
    pixels.setPixelColor(0, color);
  } else {
    pixels.setPixelColor(0, 0);
  }
  pixels.show();
}

void connectToWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint8_t attempt = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempt++;
    if (attempt >= 60) {
      Serial.println("\n[WiFi] Failed to connect, restarting...");
      ESP.restart();
    }
  }
  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
}

void fetchDelayFromCloud() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  String url = String("https://") + BACKEND_HOST + DELAY_PATH;

  if (!https.begin(client, url)) return;

  int httpCode = https.GET();
  if (httpCode == 200) {
    String payload = https.getString();
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err && doc.containsKey("delay")) {
      int newDelay = clampDelay((int)doc["delay"]);
      if (newDelay != blinkDelay) {
        blinkDelay = newDelay;
        Serial.print("[HTTP] Updated blinkDelay to ");
        Serial.print(blinkDelay);
        Serial.println(" ms");
      }
    }
  }
  https.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

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

  if (now - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = now;
    fetchDelayFromCloud();
  }

  if (now - lastToggleTime >= (unsigned long)blinkDelay) {
    lastToggleTime = now;
    setLedState(!ledOn);
  }

}
