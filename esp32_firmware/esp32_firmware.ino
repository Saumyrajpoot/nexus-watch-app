#include <WiFi.h>
#include <WiFiManager.h>
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

// --- Non-Volatile Storage ---
Preferences preferences;
String deviceToken = "";

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
enum SystemState { IDLE, RECORDING_PTT, RECORDING_CONTINUOUS, PROCESSING, FEEDBACK };
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

// Flag for saving config
bool shouldSaveConfig = false;

void saveConfigCallback() {
  Serial.println("Should save config");
  shouldSaveConfig = true;
}

void setup() {
  Serial.begin(115200);

  // Initialize TFT
  tft.initR(INITR_144GREENTAB);
  tft.setRotation(1); 
  tft.fillScreen(COLOR_BG);
  tft.setFont(&FreeSans9pt7b);
  drawCenterText("Booting Nexus...", COLOR_TEXT, 64);

  // Load saved token from Memory
  preferences.begin("nexus_config", false);
  deviceToken = preferences.getString("deviceToken", "");
  Serial.println("Loaded Token: " + deviceToken);

  // --- WiFi Manager Setup ---
  WiFiManager wifiManager;
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  // Add custom parameter for Device Token
  WiFiManagerParameter custom_token("token", "Paste Device Token from Dashboard", deviceToken.c_str(), 50);
  wifiManager.addParameter(&custom_token);

  tft.fillScreen(COLOR_BG);
  drawCenterText("Connecting to Wi-Fi...", COLOR_ACCENT, 64);

  // Connect or create "Nexus Watch Setup"
  if (!wifiManager.autoConnect("Nexus Watch Setup")) {
    Serial.println("Failed to connect and hit timeout");
    delay(3000);
    ESP.restart(); // Reset and try again
  }

  Serial.println("\nWiFi Connected");

  // Save the custom token if coming from the portal
  if (shouldSaveConfig) {
    deviceToken = custom_token.getValue();
    preferences.putString("deviceToken", deviceToken);
    Serial.println("Saved new Token: " + deviceToken);
  }

  // --- Normal Boot ---
  tft.fillScreen(COLOR_BG);
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
