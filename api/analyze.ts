import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import type { VideoTranscript } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método no permitido' });
    }
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { transcripts, customPrompt } = req.body;

    if (!process.env.API_KEY) {
        console.error('API_KEY environment variable not set.');
        return res.status(500).send('Error de configuración del servidor: Falta la clave de API.');
    }
    if (!Array.isArray(transcripts) || transcripts.length === 0 || !customPrompt) {
        return res.status(400).send('Cuerpo de la solicitud no válido. Se requieren el array "transcripts" y "customPrompt".');
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const combinedTranscripts = (transcripts as VideoTranscript[])
            .map(t => `--- Video: ${t.title} ---\n${t.transcript}`)
            .join('\n\n');
            
        const userContent = `${customPrompt}\n\nAquí están las transcripciones para analizar:\n\n${combinedTranscripts}`;

        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction: "Eres un experto analista de contenido de YouTube. Tu tarea es analizar las transcripciones de video proporcionadas para identificar patrones, temas y responder a la solicitud del usuario de manera clara, estructurada y perspicaz. Proporciona tu análisis en formato de texto plano y bien formateado.",
                temperature: 0.5,
                topP: 0.95,
            }
        });

        for await (const chunk of stream) {
            res.write(chunk.text);
        }
        
        res.end();

    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        if (!res.writableEnded) {
            res.status(500).send(`Ocurrió un error al comunicarse con la API de Gemini: ${error.message}`);
        }
    }
}
