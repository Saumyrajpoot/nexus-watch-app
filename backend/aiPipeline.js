const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabaseUrl = process.env.SUPABASE_URL;
// Use SERVICE_KEY to bypass RLS, fallback to ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const intentSchema = {
    type: "OBJECT",
    properties: {
        is_schedule: { type: "BOOLEAN", description: "True if the user is asking to schedule a meeting, call, or reminder." },
        title: { type: "STRING", description: "Short title for the scheduled event (only if is_schedule is true)" },
        time: { type: "STRING", description: "ISO8601 formatted time for the event (only if is_schedule is true)" },
        duration_mins: { type: "NUMBER", description: "Duration in minutes" }
    },
    required: ["is_schedule"]
};

async function processAudio(filePath, context, userId) {
    if (!userId) {
        console.error("Missing userId in processAudio. Cannot save to Supabase.");
        return { success: false, message: "Unregistered Device" };
    }

    try {
        console.log(`Sending ${filePath} to Gemini API for pure transcription...`);
        const audioData = fs.readFileSync(filePath).toString("base64");
        
        // STEP 1: Pure Verbatim Transcription (No JSON Schema, No Bias)
        const transcribeResponse = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: audioData, mimeType: "audio/wav" } },
                        { text: "You are an expert transcriber. Listen to this audio and transcribe it accurately. You may fix minor audio garbling to make the sentence coherent, but do NOT change the core meaning and do NOT summarize. \n\nCONTEXT: The user will dictate tasks, reminders, meetings, presentations, or general thoughts. Transcribe accurately without bias towards any specific category, but ensure common words are captured cleanly to avoid gibberish. Just return the transcript text." }
                    ]
                }
            ]
        });
        
        let transcriptText = transcribeResponse.text.trim();
        console.log(`🗣️ Transcribed verbatim: "${transcriptText}"`);
        
        if (!transcriptText) {
             return { success: false, message: "Could not transcribe audio." };
        }

        // STEP 2: Intent Checking (Is it a schedule request for Twilio?)
        let isSchedule = false;
        let scheduleData = {};
        
        // We only check for schedule intent if it's not a continuous presentation recording
        if (context !== 'presentation') {
            const currentTimeIST = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
            const routingPrompt = `Read the following transcript. 
Current local time in India (IST): ${currentTimeIST}.

Does the user want to schedule a task, meeting, call, or reminder for a specific date or time? (e.g. "meeting at 11:45 pm", "call on 10 July at 10 am")

If YES: 
- Set is_schedule to true.
- Extract the 'title' (2-5 words max).
- Extract the EXACT 'time' mentioned. You MUST calculate the correct future date and time in strict ISO8601 format with the +05:30 offset based on the current local time provided above.

If NO (it's just a general thought, note, or lacks a specific time):
- Set is_schedule to false.

Transcript: "${transcriptText}"`;

            const intentResponse = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: routingPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: intentSchema
                }
            });
            
            scheduleData = JSON.parse(intentResponse.text);
            isSchedule = scheduleData.is_schedule;
            console.log(`🧠 Intent parsing result:`, scheduleData);
        }

        // STEP 3: Save to Supabase based on Intent
        let responseMessage = "";
        
        if (isSchedule && scheduleData.time) {
            // It IS a scheduling request (will be picked up by Twilio cron job)
            await supabase.from('events').insert([{
                user_id: userId,
                type: 'meeting',
                title: scheduleData.title || "New Task",
                time: scheduleData.time,
                duration_mins: scheduleData.duration_mins || 30,
                content: transcriptText
            }]);
            responseMessage = `Scheduled: ${scheduleData.title}`;
            
        } else if (context === 'presentation') {
             await supabase.from('events').insert([{
                user_id: userId,
                type: 'presentation',
                title: "Continuous Recording",
                content: transcriptText
            }]);
            responseMessage = `Presentation Logged`;
            
        } else {
             // DEFAULT: It's just a note. Save verbatim!
             await supabase.from('events').insert([{
                user_id: userId,
                type: 'note',
                content: transcriptText
            }]);
            responseMessage = `Note Logged`;
        }
        
        return {
            success: true,
            transcript: transcriptText,
            message: responseMessage
        };

    } catch (error) {
        console.error("AI Pipeline Error:", error);
        return { success: false, message: "AI Processing Failed" };
    }
}

// These are no longer needed for frontend polling, but kept for legacy API support if needed
function getEvents() { return []; }
function clearEvents() { }

async function generateSummaryAI(content) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI summarizer. Please provide a beautifully formatted Markdown summary of the following presentation transcript with key takeaways:\n\n${content}`
    });
    return response.text;
}

async function generatePPTStructureAI(content) {
    const slideSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                title: { type: "STRING", description: "Slide Title" },
                bullets: { type: "ARRAY", items: { type: "STRING", description: "Bullet point" }, description: "List of bullet points" }
            },
            required: ["title", "bullets"]
        }
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI presentation creator. Break down the following transcript into 3-5 PowerPoint slides. Each slide should have a title and 2-4 bullet points.\n\nTranscript: ${content}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: slideSchema
        }
    });
    return JSON.parse(response.text);
}

module.exports = { processAudio, getEvents, clearEvents, generateSummaryAI, generatePPTStructureAI, supabase };
