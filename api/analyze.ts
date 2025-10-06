import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import type { VideoTranscript } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { transcripts, customPrompt } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY environment variable not set.');
        return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
    }
    if (!Array.isArray(transcripts) || transcripts.length === 0 || !customPrompt) {
        return res.status(400).json({ error: 'Invalid request body. "transcripts" array and "customPrompt" are required.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const combinedTranscripts = (transcripts as VideoTranscript[])
            .map(t => `--- Video: ${t.title} ---\n${t.transcript}`)
            .join('\n\n');
            
        const fullPrompt = `Please analyze the following collection of video transcripts from a single YouTube channel.\n\n${customPrompt}\n\nHere are the transcripts:\n\n${combinedTranscripts}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                temperature: 0.5,
                topP: 0.95,
            }
        });

        return res.status(200).json({ analysis: response.text });
    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        return res.status(500).json({ error: "An error occurred while communicating with the Gemini API.", details: error.message });
    }
}
