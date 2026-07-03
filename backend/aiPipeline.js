const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabaseUrl = process.env.SUPABASE_URL;
// Use SERVICE_KEY to bypass RLS, fallback to ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const schema = {
    type: "OBJECT",
    properties: {
        transcript: { type: "STRING", description: "The exact transcribed text of the user's speech" },
        intent: { type: "STRING", enum: ["schedule", "log_note", "presentation"], description: "The classified intent" },
        title: { type: "STRING", description: "Title of the meeting or presentation" },
        time: { type: "STRING", description: "ISO8601 formatted time of the meeting" },
        duration_mins: { type: "NUMBER", description: "Duration in minutes" },
        content: { type: "STRING", description: "Content of the note or summary of the presentation" }
    },
    required: ["transcript", "intent"]
};

async function processAudio(filePath, context, userId) {
    if (!userId) {
        console.error("Missing userId in processAudio. Cannot save to Supabase.");
        return { success: false, message: "Unregistered Device" };
    }

    try {
        console.log(`Sending ${filePath} to Gemini API (Context: ${context})...`);
        
        const audioData = fs.readFileSync(filePath).toString("base64");
        
        let systemPrompt = "";
        if (context === 'presentation') {
            systemPrompt = "You are an AI router. Listen to the audio. Transcribe it. Since this is a CONTINUOUS recording, classify the intent as 'presentation'. Extract a 'title' for the presentation, and put a detailed summary in the 'content' field.";
        } else {
            systemPrompt = `You are an AI router. Listen to the audio. Transcribe it. 
CRITICAL RULE: If the user says words like 'schedule', 'remind', 'book', 'call', 'meeting', or mentions a specific time/date (e.g., 'by 4 PM', 'tomorrow'), you MUST classify the intent as 'schedule'.
If it is 'schedule', extract the 'title', a precise 'time' (in ISO8601 format), and 'duration_mins'.
If the audio is just a general thought, classify as 'log_note' and extract the 'content'.`;
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                data: audioData,
                                mimeType: "audio/wav"
                            }
                        },
                        {
                            text: systemPrompt
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        
        const resultJson = JSON.parse(response.text);
        console.log(`Gemini Output:`, resultJson);
        
        const transcriptText = resultJson.transcript;
        const intent = resultJson.intent;
        
        // Execute Supabase Inserts based on intent
        let responseMessage = "";
        
        if (intent === 'schedule') {
            await supabase.from('events').insert([{
                user_id: userId,
                type: 'meeting',
                title: resultJson.title || "New Meeting",
                time: resultJson.time || new Date().toISOString(),
                duration_mins: resultJson.duration_mins || 30
            }]);
            responseMessage = `Meeting Logged: ${resultJson.title}`;
        } else if (intent === 'presentation') {
             await supabase.from('events').insert([{
                user_id: userId,
                type: 'presentation',
                title: resultJson.title || "Lecture",
                content: resultJson.content || resultJson.transcript
            }]);
            responseMessage = `Presentation Logged`;
        } else if (intent === 'log_note') {
             await supabase.from('events').insert([{
                user_id: userId,
                type: 'note',
                content: resultJson.content || resultJson.transcript
            }]);
            responseMessage = `Note Logged`;
        } else {
            responseMessage = `Transcribed: ${transcriptText}`;
        }
        
        return {
            success: true,
            transcript: transcriptText,
            action: resultJson,
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
