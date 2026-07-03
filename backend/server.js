require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pptxgen = require('pptxgenjs');
const { createWavFile } = require('./pcmToWav');
const { processAudio, getEvents, clearEvents, generateSummaryAI, generatePPTStructureAI, supabase } = require('./aiPipeline');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/audio-stream' });

const TEMP_DIR = path.join(__dirname, 'temp_audio');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// REST API for dashboard to fetch events (Legacy/Fallback)
app.get('/api/events', (req, res) => {
    res.json(getEvents());
});

app.delete('/api/events', (req, res) => {
    clearEvents();
    res.json({ success: true });
});

app.post('/api/generate-summary', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: "No content provided" });
        const summary = await generateSummaryAI(content);
        res.json({ summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

app.post('/api/generate-ppt', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: "No content provided" });
        
        const slidesData = await generatePPTStructureAI(content);
        
        let pres = new pptxgen();
        pres.layout = 'LAYOUT_16x9';
        
        pres.defineSlideMaster({
          title: 'MASTER_SLIDE',
          background: { color: '1e293b' },
          objects: [
            { text: { text: 'Nexus Companion AI', options: { x: 0.5, y: 0.2, w: 9, h: 0.5, color: 'ef4444', fontSize: 14, fontFace: 'Arial' } } }
          ]
        });

        slidesData.forEach(slideInfo => {
            let slide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
            slide.addText(slideInfo.title, {
                x: 0.5, y: 0.8, w: '90%', h: 1,
                fontSize: 36, color: 'ffffff', bold: true
            });
            let bulletString = slideInfo.bullets.map(b => b).join('\n');
            slide.addText(bulletString, {
                x: 0.5, y: 2.0, w: '90%', h: 4,
                fontSize: 24, color: 'cbd5e1', bullet: { type: 'bullet' }, lineSpacing: 36
            });
        });

        const stream = await pres.stream();
        res.writeHead(200, {
            'Content-Disposition': 'attachment; filename="Nexus_Presentation.pptx"',
            'Content-Length': stream.length,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });
        res.end(stream);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate PPT" });
    }
});

async function handleAudioStream(ws, audioChunks, context = 'task', userId) {
    if (audioChunks.length === 0) return;

    const rawPcmBuffer = Buffer.concat(audioChunks);
    const wavBuffer = createWavFile(rawPcmBuffer, 16000, 1, 16);
    const timestamp = Date.now();
    const filePath = path.join(TEMP_DIR, `audio_${timestamp}.wav`);
    
    fs.writeFileSync(filePath, wavBuffer);
    console.log(`Saved WAV file to ${filePath}`);

    // Trigger AI Pipeline with context and USER ID
    const result = await processAudio(filePath, context, userId);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(result.message || "Processed");
    } else {
        console.log("WebSocket is closed. Could not send confirmation to ESP32: ", result.message);
    }
}

wss.on('connection', (ws) => {
    console.log('Client connected to /audio-stream');
    let audioChunks = [];
    ws.userId = null; // Store the user ID for this connection

    ws.on('message', async (message, isBinary) => {
        if (isBinary) {
            audioChunks.push(message);
        } else {
            const textMsg = message.toString();
            
            // 1. Check if the message is a Device Token for authentication
            if (textMsg.startsWith('TOKEN:')) {
                const token = textMsg.split(':')[1];
                console.log(`Received Device Token: ${token}`);
                
                // Lookup User ID from Supabase
                const { data, error } = await supabase
                    .from('devices')
                    .select('user_id')
                    .eq('token', token)
                    .single();
                
                if (data && data.user_id) {
                    ws.userId = data.user_id;
                    console.log(`Device Authenticated! User ID: ${ws.userId}`);
                    ws.send("AUTH_SUCCESS");
                } else {
                    console.error("Invalid Device Token");
                    ws.send("AUTH_FAILED");
                }
                return;
            }

            // 2. Handle End Stream markers
            if (textMsg.startsWith('END_STREAM')) {
                const context = textMsg.includes('CONTINUOUS') ? 'presentation' : 'task';
                console.log(`Received ${textMsg}. Processing audio as ${context}...`);
                await handleAudioStream(ws, audioChunks, context, ws.userId);
                audioChunks = []; 
            }
        }
    });

    ws.on('close', async () => {
        console.log('Client disconnected. Processing any remaining audio...');
        if (audioChunks.length > 0) {
            await handleAudioStream(null, audioChunks, 'task', ws.userId);
            audioChunks = [];
        }
    });
});

const cron = require('node-cron');
const twilio = require('twilio');

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

// Cron Job for AI Calling (Runs every minute)
cron.schedule('* * * * *', async () => {
    console.log("Checking for upcoming meetings...");
    const now = new Date();
    const oneMinLater = new Date(now.getTime() + 60000);
    
    // Find meetings happening between now and 1 min from now
    const { data: meetings, error } = await supabase
        .from('events')
        .select('*')
        .eq('type', 'meeting')
        .gte('time', now.toISOString())
        .lt('time', oneMinLater.toISOString());

    if (error) {
        console.error("Cron fetch error:", error);
        return;
    }

    if (meetings && meetings.length > 0) {
        for (const meeting of meetings) {
            console.log(`Triggering Call for meeting: ${meeting.title}`);
            
            // Dynamically fetch the user's phone number from their profile
            let userPhone = null;
            const { data: deviceData } = await supabase
                .from('devices')
                .select('phone_number')
                .eq('user_id', meeting.user_id)
                .limit(1)
                .single();
                
            if (deviceData && deviceData.phone_number) {
                userPhone = deviceData.phone_number;
            }

            if (twilioClient && process.env.TWILIO_PHONE_NUMBER && userPhone) {
                try {
                    const twiml = new twilio.twiml.VoiceResponse();
                    twiml.say({ voice: 'Polly.Matthew-Neural' }, `Hello. This is your Nexus Assistant. You have a scheduled task starting now: ${meeting.title}. Good luck!`);
                    
                    await twilioClient.calls.create({
                        twiml: twiml.toString(),
                        to: userPhone,
                        from: process.env.TWILIO_PHONE_NUMBER
                    });
                    console.log(`Call successfully initiated to ${userPhone}!`);
                } catch(e) {
                    console.error("Twilio Call failed:", e);
                }
            } else {
                console.log(`Twilio credentials or user phone missing for user ${meeting.user_id}. Cannot place call.`);
            }
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
});
