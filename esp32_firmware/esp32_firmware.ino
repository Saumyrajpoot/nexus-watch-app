#include <WiFi.h>
#include <Preferences.h>
#include <WebSocketsClient.h>
#include <driver/i2s.h>
#include <OneButton.h>
#include <time.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- BLE Configuration ---
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_UUID_SSID         "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_UUID_PASS         "cba1d466-344c-4be3-ab3f-189f80dd7518"
#define CHAR_UUID_TOKEN        "f78ebbff-c8b7-4107-93de-889a6a06d408"
#define CHAR_UUID_CONNECT      "ca73b3ba-39f6-4ab3-91ae-186dc9577d99"

// --- Non-Volatile Storage ---
Preferences preferences;
String savedSSID = "";
String savedPass = "";
String deviceToken = "";
bool bleSetupMode = false;
bool triggerReboot = false;

// Variables to hold BLE incoming data
String ble_ssid = "";
String ble_pass = "";
String ble_token = "";

// --- WebSocket Server (Render Cloud) ---
const char* ws_host = "nexus-watch-backend.onrender.com";
const uint16_t ws_port = 443;
const char* ws_path = "/audio-stream";
WebSocketsClient webSocket;

// --- TFT Display Pins ---
#define TFT_CS     5
#define TFT_RST    17
#define TFT_DC     16
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

#define COLOR_BG      0x0821  
#define COLOR_GRID    0x10A2  
#define COLOR_TEXT    0xFFFF  
#define COLOR_ACCENT  0x07E0  
#define COLOR_RECORD  0xF800  
#define COLOR_MODAL   0x2124  

// --- Microphone Pins (I2S) ---
#define I2S_WS 25
#define I2S_SCK 26
#define I2S_SD 33
#define I2S_PORT I2S_NUM_0
#define BUFFER_LEN 64
int32_t sBuffer[BUFFER_LEN];

// --- Button Pin ---
#define BUTTON_PIN 4
OneButton button(BUTTON_PIN, true, true);

// --- State Machine ---
enum SystemState { IDLE, RECORDING_PTT, RECORDING_CONTINUOUS, PROCESSING, FEEDBACK, BLE_SETUP };
SystemState currentState = IDLE;

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 19800; // IST
const int   daylightOffset_sec = 0;
String feedbackMessage = "";
unsigned long feedbackTimer = 0;
unsigned long lastWatchfaceUpdate = 0;

int pulseRadius = 15;
bool pulseGrowing = true;
unsigned long lastPulseUpdate = 0;

// --- BLE Callbacks ---
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      Serial.println("BLE Connected!");
      tft.fillRect(10, 80, 108, 40, COLOR_BG);
      tft.setCursor(15, 100);
      tft.setTextColor(COLOR_ACCENT);
      tft.print("Phone Paired!");
    };
    void onDisconnect(BLEServer* pServer) {
      Serial.println("BLE Disconnected.");
    }
};

class CharCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string value = pCharacteristic->getValue();
      String valStr = String(value.c_str());
      String uuid = String(pCharacteristic->getUUID().toString().c_str());

      if (uuid.indexOf("beb5483e") != -1) ble_ssid = valStr;
      if (uuid.indexOf("cba1d466") != -1) ble_pass = valStr;
      if (uuid.indexOf("f78ebbff") != -1) ble_token = valStr;
      
      if (uuid.indexOf("ca73b3ba") != -1) {
        if (valStr == "1" || valStr == "CONNECT") {
          Serial.println("Received Connect Command!");
          triggerReboot = true;
        }
      }
    }
};

void startBLEServer() {
  BLEDevice::init("Nexus Watch");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pSSID = pService->createCharacteristic(CHAR_UUID_SSID, BLECharacteristic::PROPERTY_WRITE);
  BLECharacteristic *pPASS = pService->createCharacteristic(CHAR_UUID_PASS, BLECharacteristic::PROPERTY_WRITE);
  BLECharacteristic *pTOKEN = pService->createCharacteristic(CHAR_UUID_TOKEN, BLECharacteristic::PROPERTY_WRITE);
  BLECharacteristic *pCONNECT = pService->createCharacteristic(CHAR_UUID_CONNECT, BLECharacteristic::PROPERTY_WRITE);

  CharCallbacks *cb = new CharCallbacks();
  pSSID->setCallbacks(cb);
  pPASS->setCallbacks(cb);
  pTOKEN->setCallbacks(cb);
  pCONNECT->setCallbacks(cb);

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("BLE Setup Mode Started. Waiting for phone...");
}

void setup() {
  Serial.begin(115200);

  tft.initR(INITR_144GREENTAB);
  tft.setRotation(1); 
  tft.fillScreen(COLOR_BG);
  tft.setFont(&FreeSans9pt7b);

  // Load preferences
  preferences.begin("nexus_config", false);
  savedSSID = preferences.getString("ssid", "");
  savedPass = preferences.getString("pass", "");
  deviceToken = preferences.getString("token", "");

  Serial.println("Loaded SSID: " + savedSSID);
  Serial.println("Loaded Token: " + deviceToken);

  if (savedSSID == "" || deviceToken == "") {
    bleSetupMode = true;
  } else {
    drawCenterText("Connecting...", COLOR_ACCENT, 64);
    WiFi.begin(savedSSID.c_str(), savedPass.c_str());
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nFailed to connect. Entering BLE Setup...");
      bleSetupMode = true;
    } else {
      Serial.println("\nWiFi Connected!");
    }
  }

  if (bleSetupMode) {
    currentState = BLE_SETUP;
    drawHUDBackground();
    drawCenterText("Open Dashboard", COLOR_TEXT, 50);
    drawCenterText("to Pair via BLE", COLOR_TEXT, 70);
    startBLEServer();
    return; // Don't initialize I2S or WebSockets yet
  }

  // --- Normal Boot (Connected) ---
  drawCenterText("Syncing Time...", COLOR_ACCENT, 64);
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_I2S),
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = BUFFER_LEN,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);

  webSocket.beginSSL(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);

  button.attachLongPressStart(handleHoldStart);
  button.attachLongPressStop(handleHoldStop);
  button.attachDoubleClick(handleDoubleClick);

  currentState = IDLE;
  drawHUDBackground();
}

void loop() {
  if (bleSetupMode) {
    if (triggerReboot) {
      drawHUDBackground();
      drawCenterText("Saving Data...", COLOR_ACCENT, 64);
      
      preferences.putString("ssid", ble_ssid);
      preferences.putString("pass", ble_pass);
      preferences.putString("token", ble_token);
      
      delay(1000);
      drawCenterText("Rebooting!", COLOR_TEXT, 64);
      delay(1000);
      ESP.restart(); // The only safe way to switch from BLE to Wi-Fi
    }
    return; // Don't run rest of loop
  }

  // --- Normal Operation ---
  webSocket.loop();
  button.tick();

  if (currentState == IDLE) {
    if (millis() - lastWatchfaceUpdate > 1000) {
      drawWatchface();
      lastWatchfaceUpdate = millis();
    }
  } 
  else if (currentState == RECORDING_PTT || currentState == RECORDING_CONTINUOUS) {
    if (millis() - lastPulseUpdate > 30) {
      animatePulse();
      lastPulseUpdate = millis();
    }
  }
  else if (currentState == FEEDBACK) {
    if (millis() - feedbackTimer > 6000) {
      currentState = IDLE;
      drawHUDBackground();
    }
  }

  if (currentState == RECORDING_PTT || currentState == RECORDING_CONTINUOUS) {
    size_t bytesIn = 0;
    esp_err_t result = i2s_read(I2S_PORT, &sBuffer, BUFFER_LEN * sizeof(int32_t), &bytesIn, portMAX_DELAY);
    if (result == ESP_OK && bytesIn > 0) {
      int samples = bytesIn / sizeof(int32_t);
      int16_t pcm16[BUFFER_LEN];
      for (int i = 0; i < samples; i++) {
        pcm16[i] = sBuffer[i] >> 16; 
      }
      webSocket.sendBIN((uint8_t*)pcm16, samples * sizeof(int16_t));
    }
  }
}

void handleHoldStart() {
  if (currentState == IDLE) {
    currentState = RECORDING_PTT;
    drawHUDBackground();
    drawCenterText("Task Mode", COLOR_TEXT, 100);
  }
}

void handleHoldStop() {
  if (currentState == RECORDING_PTT) {
    currentState = PROCESSING;
    drawHUDBackground();
    drawCenterText("AI Thinking...", ST77XX_YELLOW, 64);
    webSocket.sendTXT("END_STREAM_PTT");
  }
}

void handleDoubleClick() {
  if (currentState == RECORDING_CONTINUOUS) {
    currentState = PROCESSING;
    drawHUDBackground();
    drawCenterText("AI Thinking...", ST77XX_YELLOW, 64);
    webSocket.sendTXT("END_STREAM_CONTINUOUS");
  } else if (currentState == IDLE) {
    currentState = RECORDING_CONTINUOUS;
    drawHUDBackground();
    drawCenterText("Lecture Mode", COLOR_TEXT, 100);
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.println("[WS] Connected to Cloud Server!");
    String authMsg = String("TOKEN:") + deviceToken;
    webSocket.sendTXT(authMsg);
  }
  else if (type == WStype_TEXT) {
    feedbackMessage = String((char*)payload);
    Serial.printf("[WS] Feedback: %s\n", feedbackMessage.c_str());
    currentState = FEEDBACK;
    feedbackTimer = millis();
    drawFeedbackModal(feedbackMessage);
  }
}

void drawHUDBackground() {
  tft.fillScreen(COLOR_BG);
  for (int i = 0; i < 128; i += 16) {
    tft.drawFastVLine(i, 0, 128, COLOR_GRID);
    tft.drawFastHLine(0, i, 128, COLOR_GRID);
  }
  tft.drawLine(0, 0, 15, 0, COLOR_ACCENT);
  tft.drawLine(0, 0, 0, 15, COLOR_ACCENT);
  tft.drawLine(127, 127, 112, 127, COLOR_ACCENT);
  tft.drawLine(127, 127, 127, 112, COLOR_ACCENT);
}

void drawCenterText(String text, uint16_t color, int yPos) {
  tft.setTextColor(color);
  int xPos = (128 - (text.length() * 10)) / 2;
  if(xPos < 0) xPos = 0;
  tft.setCursor(xPos, yPos);
  tft.print(text);
}

void drawWatchface() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return;
  tft.fillRect(10, 20, 108, 60, COLOR_BG);
  tft.setFont(&FreeSansBold12pt7b);
  tft.setTextColor(COLOR_TEXT);
  char timeStr[10];
  sprintf(timeStr, "%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min);
  tft.setCursor(28, 50);
  tft.print(timeStr);
  tft.setFont(&FreeSans9pt7b);
  tft.setTextColor(COLOR_ACCENT);
  char dateStr[15];
  sprintf(dateStr, "%02d/%02d/%04d", timeinfo.tm_mday, timeinfo.tm_mon + 1, timeinfo.tm_year + 1900);
  tft.setCursor(20, 75);
  tft.print(dateStr);
}

void animatePulse() {
  tft.drawCircle(64, 50, pulseRadius, COLOR_BG);
  if (pulseGrowing) pulseRadius++;
  else pulseRadius--;
  if (pulseRadius > 25) pulseGrowing = false;
  if (pulseRadius < 15) pulseGrowing = true;
  tft.drawCircle(64, 50, pulseRadius, COLOR_RECORD);
  tft.fillCircle(64, 50, 10, COLOR_RECORD); 
}

void drawFeedbackModal(String msg) {
  tft.fillRect(8, 28, 112, 72, 0x0000); 
  tft.fillRoundRect(5, 25, 118, 78, 8, COLOR_MODAL);
  tft.drawRoundRect(5, 25, 118, 78, 8, COLOR_ACCENT); 
  tft.setFont(); 
  tft.setTextColor(COLOR_ACCENT);
  tft.setCursor(15, 30);
  tft.print("NEXUS UPDATE");
  tft.drawLine(5, 40, 123, 40, COLOR_ACCENT);
  tft.setTextColor(COLOR_TEXT);
  tft.setCursor(10, 45);
  tft.setTextWrap(true);
  tft.print(msg);
  tft.setFont(&FreeSans9pt7b);
}
