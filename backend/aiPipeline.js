const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || 'MISSING_KEY').trim() });

const supabaseUrl = process.env.SUPABASE_URL;
// Use SERVICE_KEY to bypass RLS, fallback to ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function processAudio(filePath, context, userId) {
    if (!userId) {
        console.error("Missing userId in processAudio. Cannot save to Supabase.");
        return { success: false, message: "Unregistered Device" };
    }

    try {
        console.log(`Sending ${filePath} to Groq Whisper API for transcription...`);
        
        // STEP 1: Pure Verbatim Transcription (Whisper)
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3-turbo",
            response_format: "json"
        });
        
        let transcriptText = transcription.text.trim();
        console.log(`🗣️ Transcribed verbatim: "${transcriptText}"`);
        
        if (!transcriptText) {
             return { success: false, message: "Could not transcribe audio." };
        }

        // STEP 2: Intent Checking (Llama 3 JSON Mode)
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

            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a JSON parsing router. You must ONLY output a JSON object containing the properties: is_schedule (boolean), title (string), time (string, ISO8601), duration_mins (number, default 30). Output exactly what is requested, no preamble."
                    },
                    {
                        role: "user",
                        content: routingPrompt
                    }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0,
                response_format: { type: "json_object" }
            });
            
            scheduleData = JSON.parse(chatCompletion.choices[0].message.content);
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
    const chatCompletion = await groq.chat.completions.create({
        messages: [{
            role: 'user',
            content: `You are an AI summarizer. Please provide a beautifully formatted Markdown summary of the following presentation transcript with key takeaways:\n\n${content}`
        }],
        model: "llama-3.3-70b-versatile"
    });
    return chatCompletion.choices[0].message.content;
}

async function generatePPTStructureAI(content) {
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are an AI presentation creator. You must output ONLY a JSON object containing a 'slides' property, which is an array of objects. Each slide object must have a 'title' (string) and 'bullets' (array of strings)."
            },
            {
                role: 'user',
                content: `Break down the following transcript into 3-5 PowerPoint slides. Each slide should have a title and 2-4 bullet points.\n\nTranscript: ${content}`
            }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(chatCompletion.choices[0].message.content);
    return result.slides;
}

module.exports = { processAudio, getEvents, clearEvents, generateSummaryAI, generatePPTStructureAI, supabase };
