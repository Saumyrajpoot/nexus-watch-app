# AI Watch Companion

This project serves as the backend and frontend for an ESP32-based "AI Watch Companion". It receives raw PCM audio streamed over WebSockets, converts it to WAV, transcribes it using OpenAI Whisper, routes the intent using GPT-4o, and displays the events on a React Dashboard.

## Project Structure

- `/backend` - Node.js Express Server + WebSocket endpoint + AI Pipeline
- `/frontend` - React Dashboard with Tailwind CSS

## Prerequisites

- Node.js (v18+ recommended)
- OpenAI API Key

## Setup Instructions

### 1. Backend Setup

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies (already initialized, but good to run if moving to a new machine):
   ```bash
   npm install
   ```
3. Environment Variables:
   - Copy `.env.example` to `.env`
   - Fill in your `OPENAI_API_KEY`:
     ```
     PORT=3000
     OPENAI_API_KEY=sk-your-real-key-here
     ```
4. Start the server:
   ```bash
   node server.js
   ```
   *The server will run on `http://localhost:3000` and the WebSocket endpoint is at `ws://localhost:3000/audio-stream`.*

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   *The dashboard will typically run on `http://localhost:5173`. Open this URL in your browser.*

## How to Test

1. Start both the backend and frontend servers.
2. The frontend dashboard will display "Backend Connected" if the server is running.
3. You can stream raw PCM audio to the WebSocket endpoint from your ESP32.
   - Connect to `ws://[your-computer-ip]:3000/audio-stream`
   - Send raw PCM binary chunks (16kHz, 16-bit, Mono).
   - Once finished speaking, either close the connection from the ESP32, or send a text message containing `"END_STREAM"` over the WebSocket.
   - The backend will attach a WAV header, process the audio via Whisper and GPT-4o, and save the event (Meeting or Note).
   - The React dashboard will auto-refresh and display your new event.
