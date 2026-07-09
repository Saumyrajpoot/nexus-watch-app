#include <WiFi.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <WebSocketsClient.h>
#include <driver/i2s.h>
#include <OneButton.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- Non-Volatile Storage ---
Preferences preferences;
String deviceToken = "";

// --- WebSocket Server (Render Cloud) ---
const char* ws_host = "nexus-watch-backend.onrender.com";
const uint16_t ws_port = 443; 
const char* ws_path = "/audio-stream";
WebSocketsClient webSocket;

// --- OLED Display ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- Microphone Pins (I2S) ---
#define I2S_WS 25
#define I2S_SCK 26
#define I2S_SD 33
#define I2S_PORT I2S_NUM_0
#define BUFFER_LEN 1024
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

  // Initialize OLED
  Wire.begin(21, 22); // SDA=21, SCL=22
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  drawCenterText("Booting...", 12);

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

  display.clearDisplay();
  drawCenterText("Connecting WiFi...", 12);

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
  display.clearDisplay();
  drawCenterText("Syncing Time...", 12);
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_I2S),
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
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
        // Shift by 14 gives 4x volume boost.
        int32_t sample = sBuffer[i] >> 14; 
        
        // Clamp to prevent integer overflow wraparound (which destroys the audio)
        if (sample > 32767) sample = 32767;
        if (sample < -32768) sample = -32768;
        
        pcm16[i] = sample;
      }
      webSocket.sendBIN((uint8_t*)pcm16, samples * sizeof(int16_t));
    }
  }
}

void handleHoldStart() {
  if (currentState == IDLE) {
    currentState = RECORDING_PTT;
    drawHUDBackground();
    drawCenterText("Task Mode", 12);
  }
}

void handleHoldStop() {
  if (currentState == RECORDING_PTT) {
    currentState = PROCESSING;
    drawHUDBackground();
    drawCenterText("Thinking...", 12);
    webSocket.sendTXT("END_STREAM_PTT");
  }
}

void handleDoubleClick() {
  if (currentState == RECORDING_CONTINUOUS) {
    currentState = PROCESSING;
    drawHUDBackground();
    drawCenterText("Thinking...", 12);
    webSocket.sendTXT("END_STREAM_CONTINUOUS");
  } else if (currentState == IDLE) {
    currentState = RECORDING_CONTINUOUS;
    drawHUDBackground();
    drawCenterText("Lecture Mode", 12);
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
  display.clearDisplay();
  // Minimalist strip doesn't need a grid
}

void drawCenterText(String text, int yPos) {
  display.setTextSize(1);
  int xPos = (128 - (text.length() * 6)) / 2; // Default font is approx 6px wide per char
  if(xPos < 0) xPos = 0;
  display.setCursor(xPos, yPos);
  display.print(text);
  display.display();
}

void drawWatchface() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return;
  
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  char timeStr[10];
  sprintf(timeStr, "%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min);
  
  // Large clock in center
  display.setTextSize(3);
  display.setCursor(20, 5);
  display.print(timeStr);
  
  display.display();
}

void animatePulse() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(20, 8);
  
  if (pulseGrowing) {
    display.print("[ REC ]");
    pulseGrowing = false;
  } else {
    // Blank screen for flashing effect
    pulseGrowing = true;
  }
  display.display();
}

void drawFeedbackModal(String msg) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("AI STATUS:");
  display.drawLine(0, 9, 128, 9, SSD1306_WHITE);
  display.setCursor(0, 12);
  display.print(msg);
  display.display();
}
