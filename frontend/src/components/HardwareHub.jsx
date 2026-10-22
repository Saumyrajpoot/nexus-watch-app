import React, { useState } from 'react';

export default function HardwareHub({
  deviceToken,
  onGenerateToken,
  onCopyToken,
  copiedToken,
  backendUrl = 'http://localhost:3000'
}) {
  const [wifiSSID, setWifiSSID] = useState('Nexus_Station_5G');
  const [wifiPassword, setWifiPassword] = useState('nexusPasscode99');
  const [copiedCode, setCopiedCode] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);

  const wsUrl = backendUrl.replace(/^http/, 'ws') + '/audio-stream';

  const testWebSocket = () => {
    setPingStatus('Testing connection to ' + wsUrl + '...');
    try {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setPingStatus('❌ Timeout connecting to ' + wsUrl);
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(`TOKEN:${deviceToken || 'TEST_DEVICE_TOKEN'}`);
        setPingStatus('✅ WebSocket Online! Sent handshake token.');
        setTimeout(() => ws.close(), 1500);
      };

      ws.onerror = (e) => {
        clearTimeout(timeout);
        setPingStatus('❌ WebSocket connection failed. Ensure backend node server is running on port 3000.');
      };
    } catch (e) {
      setPingStatus('❌ Error initializing WebSocket client.');
    }
  };

  const firmwareCode = `// ==========================================
// 🚨 NEXUS WEARABLE COMPANION FIRMWARE
// Auto-Configured for: ${deviceToken ? deviceToken.substring(0, 16) : 'NEXUS_TOKEN'}
// ==========================================
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <driver/i2s.h>

const char* ssid = "${wifiSSID}"; 
const char* password = "${wifiPassword}"; 

#define DEVICE_TOKEN "${deviceToken || 'PASTE_YOUR_DEVICE_TOKEN_HERE'}"
const char* ws_host = "localhost"; // Or your LAN IP e.g. 192.168.1.100
const uint16_t ws_port = 3000;
const char* ws_path = "/audio-stream";

// INMP441 Microphone (I2S Pins)
#define I2S_WS   25
#define I2S_SD   33
#define I2S_SCK  26
#define I2S_PORT I2S_NUM_0

// Push to Talk Button Pin
#define BUTTON_PIN 0 // Onboard BOOT Button
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(firmwareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Hardware Bridge & ESP32 Terminal
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Connect your physical ESP32 wrist wearable unit or calibrate the INMP441 MEMS microphone stream.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={testWebSocket}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono-tech transition-colors"
            >
              Ping WebSocket Server
            </button>
            <button
              onClick={onGenerateToken}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              Generate Fresh Token
            </button>
          </div>
        </div>

        {pingStatus && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/90 border border-white/10 text-xs font-mono-tech text-emerald-400">
            {pingStatus}
          </div>
        )}
      </div>

      {/* Grid: Pinout Matrix & Token Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Token Card */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono-tech uppercase font-bold text-emerald-400 tracking-wider">
              HARDWARE AUTHENTICATION
            </span>
            <h3 className="text-lg font-bold text-white mt-1 mb-2">
              Assigned Wearable Token
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              This cryptographic token is embedded in the ESP32 firmware loop. Upon connecting to WebSocket, the wearable sends <code className="text-rose-400 bg-slate-900 px-1 py-0.5 rounded">TOKEN:&lt;token&gt;</code> to authenticate before streaming raw audio.
            </p>

            <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 font-mono-tech text-xs text-slate-200 mb-4 flex items-center justify-between">
              <span className="truncate pr-3 font-semibold text-emerald-400">
                {deviceToken || 'token-nexus-core-99'}
              </span>
              <button
                onClick={onCopyToken}
                className="px-3 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold hover:bg-emerald-600/30 transition-all flex-shrink-0"
              >
                {copiedToken ? '✓ COPIED' : 'COPY'}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-[11px] font-mono-tech text-slate-500">
            Status: Token Active & Ready for Arduino IDE / PlatformIO
          </div>
        </div>

        {/* Pinout Wiring Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10">
          <span className="text-[10px] font-mono-tech uppercase font-bold text-cyan-400 tracking-wider">
            SCHEMATICS & PINOUT
          </span>
          <h3 className="text-lg font-bold text-white mt-1 mb-3">
            INMP441 Microphone Pinout
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-tech text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[10px]">
                  <th className="pb-2">INMP441 PIN</th>
                  <th className="pb-2">ESP32 GPIO</th>
                  <th className="pb-2">DESCRIPTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="py-2 text-rose-400 font-bold">WS</td>
                  <td className="py-2 text-white">GPIO 25</td>
                  <td className="py-2 text-slate-500">Word Select (LRCLK)</td>
                </tr>
                <tr>
                  <td className="py-2 text-rose-400 font-bold">SD</td>
                  <td className="py-2 text-white">GPIO 33</td>
                  <td className="py-2 text-slate-500">Serial Data (DIN)</td>
                </tr>
                <tr>
                  <td className="py-2 text-rose-400 font-bold">SCK</td>
                  <td className="py-2 text-white">GPIO 26</td>
                  <td className="py-2 text-slate-500">Bit Clock (BCLK)</td>
                </tr>
                <tr>
                  <td className="py-2 text-cyan-400 font-bold">L/R</td>
                  <td className="py-2 text-white">GND</td>
                  <td className="py-2 text-slate-500">Left Channel Selected</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400 font-bold">VDD / GND</td>
                  <td className="py-2 text-white">3.3V / GND</td>
                  <td className="py-2 text-slate-500">Clean 3.3V Power Rail</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Code Generator & Flash Helper */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-mono-tech uppercase font-bold text-rose-400 tracking-wider">
              FLASH READY SOURCE CODE
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Arduino C++ Configuration Boilerplate
            </h3>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono-tech transition-colors flex items-center gap-2"
          >
            <span>{copiedCode ? '✓ Copied Source' : 'Copy Header Snippet'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-mono-tech text-slate-400 mb-1">
              WI-FI SSID (Hotspot)
            </label>
            <input
              type="text"
              value={wifiSSID}
              onChange={(e) => setWifiSSID(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono-tech text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono-tech text-slate-400 mb-1">
              WI-FI PASSWORD
            </label>
            <input
              type="text"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono-tech text-white"
            />
          </div>
        </div>

        <pre className="bg-slate-950 p-4 rounded-2xl border border-white/5 font-mono-tech text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-56">
          {firmwareCode}
        </pre>
      </div>

    </div>
  );
}
