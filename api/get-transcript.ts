import type { VercelRequest, VercelResponse } from '@vercel/node';
import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { videoId, language } = req.query;

    if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({ error: 'El parámetro de consulta `videoId` es obligatorio.' });
    }

    try {
        const transcriptParts = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: typeof language === 'string' ? language : 'en',
        });
        
        const transcriptText = transcriptParts.map(part => part.text).join(' ');
        
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache for 24 hours
        return res.status(200).json({ transcript: transcriptText });

    } catch (error: any) {
        console.warn(`Could not get transcript for ${videoId}: ${error.message}`);
        // The library throws an error if transcript is disabled or not found for the language
        if (error.message.includes('transcript is disabled') || error.message.includes('No transcripts are available')) {
             return res.status(200).json({ transcript: '[La transcripción está deshabilitada para este video]' });
        }
        return res.status(200).json({ transcript: '[Transcripción no disponible para este video]' });
    }
}