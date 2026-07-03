#include <WiFi.h>
#include <WebSocketsClient.h>
#include <driver/i2s.h>
#include <OneButton.h>
#include <time.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>

// Include nice fonts from Adafruit library
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>

// --- WiFi Credentials ---
const char* ssid = "your_ssid"; // PUT YOUR HOTSPOT NAME HERE
const char* password = "your_password"; // PUT YOUR HOTSPOT PASSWORD HERE

// --- WebSocket Server ---
const char* ws_host = "192.168.137.1";
const uint16_t ws_port = 3000;
const char* ws_path = "/audio-stream";
WebSocketsClient webSocket;

// --- TFT Display Pins ---
#define TFT_CS     5
#define TFT_RST    17
#define TFT_DC     16
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

// Colors (16-bit 565 format)
#define COLOR_BG      0x0821  // Very dark blue/slate
#define COLOR_GRID    0x10A2  // Faint blue for HUD grid
#define COLOR_TEXT    0xFFFF  // White
#define COLOR_ACCENT  0x07E0  // Bright Green
#define COLOR_RECORD  0xF800  // Red
#define COLOR_MODAL   0x2124  // Dark gray/blue for popup

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

// --- Time and UI Variables ---
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 19800; // IST is UTC+5:30
const int   daylightOffset_sec = 0;
String feedbackMessage = "";
unsigned long feedbackTimer = 0;
unsigned long lastWatchfaceUpdate = 0;

// Animation Variables
int pulseRadius = 15;
bool pulseGrowing = true;
unsigned long lastPulseUpdate = 0;

void setup() {
  Serial.begin(115200);

  // Initialize TFT
  tft.initR(INITR_144GREENTAB);
  tft.setRotation(1); 
  tft.fillScreen(COLOR_BG);
  
  tft.setFont(&FreeSans9pt7b);
  drawCenterText("Booting Nexus...", COLOR_TEXT, 64);

  // Initialize WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // Sync Time
  drawCenterText("Syncing Time...", COLOR_ACCENT, 64);
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Initialize I2S
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

  // Initialize WebSockets
  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);

  // Initialize Button
  button.attachLongPressStart(handleHoldStart);
  button.attachLongPressStop(handleHoldStop);
  button.attachDoubleClick(handleDoubleClick);

  currentState = IDLE;
  drawHUDBackground();
}

void loop() {
  webSocket.loop();
  button.tick();

  // --- UI State Handling ---
  if (currentState == IDLE) {
    if (millis() - lastWatchfaceUpdate > 1000) {
      drawWatchface();
      lastWatchfaceUpdate = millis();
    }
  } 
  else if (currentState == RECORDING_PTT || currentState == RECORDING_CONTINUOUS) {
    // Pulse animation logic
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

  // --- Audio Streaming ---
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

// --- Button Handlers ---
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

// --- WebSocket Handler ---
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_TEXT) {
    feedbackMessage = String((char*)payload);
    Serial.printf("[WS] Feedback: %s\n", feedbackMessage.c_str());
    currentState = FEEDBACK;
    feedbackTimer = millis();
    drawFeedbackModal(feedbackMessage);
  }
}

// --- High-Tech UI Drawing Functions ---

// Draws a sleek, futuristic grid wallpaper
void drawHUDBackground() {
  tft.fillScreen(COLOR_BG);
  // Draw grid lines
  for (int i = 0; i < 128; i += 16) {
    tft.drawFastVLine(i, 0, 128, COLOR_GRID);
    tft.drawFastHLine(0, i, 128, COLOR_GRID);
  }
  // Draw corner accents
  tft.drawLine(0, 0, 15, 0, COLOR_ACCENT);
  tft.drawLine(0, 0, 0, 15, COLOR_ACCENT);
  tft.drawLine(127, 127, 112, 127, COLOR_ACCENT);
  tft.drawLine(127, 127, 127, 112, COLOR_ACCENT);
}

void drawCenterText(String text, uint16_t color, int yPos) {
  tft.setTextColor(color);
  // Center roughly based on font
  int xPos = (128 - (text.length() * 10)) / 2;
  if(xPos < 0) xPos = 0;
  
  tft.setCursor(xPos, yPos);
  tft.print(text);
}

void drawWatchface() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    return;
  }
  
  // Clear only the text area inside the grid
  tft.fillRect(10, 20, 108, 60, COLOR_BG);

  // Time (Large Custom Font)
  tft.setFont(&FreeSansBold12pt7b);
  tft.setTextColor(COLOR_TEXT);
  char timeStr[10];
  sprintf(timeStr, "%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min);
  tft.setCursor(28, 50);
  tft.print(timeStr);

  // Date (Smaller Custom Font)
  tft.setFont(&FreeSans9pt7b);
  tft.setTextColor(COLOR_ACCENT);
  char dateStr[15];
  sprintf(dateStr, "%02d/%02d/%04d", timeinfo.tm_mday, timeinfo.tm_mon + 1, timeinfo.tm_year + 1900);
  tft.setCursor(20, 75);
  tft.print(dateStr);
}

void animatePulse() {
  // Clear previous circle by drawing it in background color
  tft.drawCircle(64, 50, pulseRadius, COLOR_BG);
  
  // Update radius
  if (pulseGrowing) pulseRadius++;
  else pulseRadius--;
  
  if (pulseRadius > 25) pulseGrowing = false;
  if (pulseRadius < 15) pulseGrowing = true;
  
  // Draw new circle
  tft.drawCircle(64, 50, pulseRadius, COLOR_RECORD);
  tft.fillCircle(64, 50, 10, COLOR_RECORD); // Inner solid core
}

void drawFeedbackModal(String msg) {
  // Draw semi-transparent shadow (fake it with a dark rect)
  tft.fillRect(8, 28, 112, 72, 0x0000); 
  
  // Draw rounded modal
  tft.fillRoundRect(5, 25, 118, 78, 8, COLOR_MODAL);
  tft.drawRoundRect(5, 25, 118, 78, 8, COLOR_ACCENT); // Border
  
  // Modal Title
  tft.setFont(); // Default tiny font for title
  tft.setTextColor(COLOR_ACCENT);
  tft.setCursor(15, 30);
  tft.print("NEXUS UPDATE");
  
  tft.drawLine(5, 40, 123, 40, COLOR_ACCENT);
  
  // Message Text
  tft.setTextColor(COLOR_TEXT);
  tft.setCursor(10, 45);
  tft.setTextWrap(true);
  tft.print(msg);
  
  // Reset font for next use
  tft.setFont(&FreeSans9pt7b);
}
