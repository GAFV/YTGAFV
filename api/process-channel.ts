
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getChannelVideos } from 'yt-channel-info';
import { YoutubeTranscript } from 'youtube-transcript';
import type { VideoInfo, VideoTranscript } from '../types';

// Helper to extract channel ID or username from a YouTube URL
const getChannelIdFromUrl = (url: string): string | null => {
    try {
        const urlObject = new URL(url);
        const path = urlObject.pathname.split('/').filter(p => p);

        if (path[0] === 'c' || path[0].startsWith('@')) {
            return path[0] + '/' + path[1];
        }
        if (path[0] === 'channel') {
            return path[1];
        }
        if (path[0] === 'user') {
             return path[1];
        }
        return null;
    } catch (e) {
        // Fallback for cases where a raw ID/username is passed
        return url;
    }
};

const parsePublishedTextToDate = (publishedText: string): Date | null => {
    if (!publishedText) return null;

    const now = new Date();
    const text = publishedText.toLowerCase();
    const match = text.match(/(\d+)\s+(year|month|week|day|hour|minute)s?\s+ago/);

    if (match) {
        const [, value, unit] = match;
        const quantity = parseInt(value, 10);
        if (isNaN(quantity)) return null;

        switch (unit) {
            case 'year':
                now.setFullYear(now.getFullYear() - quantity);
                break;
            case 'month':
                now.setMonth(now.getMonth() - quantity);
                break;
            case 'week':
                now.setDate(now.getDate() - quantity * 7);
                break;
            case 'day':
                now.setDate(now.getDate() - quantity);
                break;
            case 'hour':
                now.setHours(now.getHours() - quantity);
                break;
            case 'minute':
                now.setMinutes(now.getMinutes() - quantity);
                break;
            default:
                return null;
        }
        return now;
    }
    return null;
};


const writeEvent = (res: VercelResponse, event: object) => {
    res.write(JSON.stringify(event) + '\n');
};

// Function to process a single video, designed for parallel execution.
async function processVideo(video: VideoInfo, lang: string): Promise<VideoTranscript> {
    let transcriptText: string;
    try {
        const transcriptParts = await YoutubeTranscript.fetchTranscript(video.id, { lang });
        transcriptText = transcriptParts.map(part => part.text).join(' ');
    } catch (transcriptError: any) {
        if (transcriptError.message.includes('transcript is disabled')) {
            transcriptText = '[La transcripción está deshabilitada para este video]';
        } else {
            console.warn(`Could not get transcript for ${video.id}: ${transcriptError.message}`);
            transcriptText = '[Error al obtener la transcripción]';
        }
    }
    return { ...video, transcript: transcriptText };
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const { signal } = req;

    try {
        const { channelUrl, language, dateFilter } = req.query;

        if (!channelUrl || typeof channelUrl !== 'string') {
            throw new Error('El parámetro de consulta `channelUrl` es obligatorio.');
        }
        
        const lang = typeof language === 'string' ? language : 'es';

        const channelId = getChannelIdFromUrl(channelUrl);
        if (!channelId) {
            throw new Error('No se pudo determinar un identificador de canal válido desde la URL.');
        }

        // Fetch all videos with pagination
        let allVideoItems: any[] = [];
        let continuation = null;
        let pagesLoaded = 0;
        const MAX_PAGES = 50; // Safety limit

        const initialResponse = await getChannelVideos({ channelId, sortBy: 'newest' });
        allVideoItems.push(...initialResponse.items);
        continuation = initialResponse.continuation;
        pagesLoaded++;

        while (continuation && pagesLoaded < MAX_PAGES) {
            if (signal.aborted) throw new Error('Request aborted by user.');
            const nextResponse = await getChannelVideos({ channelId, sortBy: 'newest', continuation });
            allVideoItems.push(...nextResponse.items);
            continuation = nextResponse.continuation;
            pagesLoaded++;
        }

        let filteredVideoItems = allVideoItems;
        if (dateFilter && dateFilter !== 'all') {
            let cutoffDate = new Date();
            if (dateFilter === 'last_month') {
                cutoffDate.setMonth(cutoffDate.getMonth() - 1);
            } else if (dateFilter === 'last_year') {
                cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
            }

            filteredVideoItems = allVideoItems.filter(video => {
                if (!video.publishedText) return false;
                const publishedDate = parsePublishedTextToDate(video.publishedText);
                return publishedDate ? publishedDate >= cutoffDate : false;
            });
        }

        const formattedVideos: VideoInfo[] = filteredVideoItems
            .filter(video => video && video.videoId)
            .map((video: any) => ({
                id: video.videoId,
                title: video.title,
                url: `https://www.youtube.com/watch?v=${video.videoId}`,
            }));

        if (formattedVideos.length === 0) {
            throw new Error('No se encontraron videos para este canal que coincidan con el filtro de fecha.');
        }

        writeEvent(res, { type: 'total', count: formattedVideos.length });

        // --- Performance Refactor: Parallel Processing ---
        // Launch all transcript requests concurrently for a massive speed boost.
        const transcriptPromises = formattedVideos.map(video => processVideo(video, lang));
        
        // Use Promise.allSettled to wait for all promises to complete,
        // regardless of whether they succeed or fail. This is more robust.
        const results = await Promise.allSettled(transcriptPromises);
        
        if (signal.aborted) throw new Error('Request aborted by user.');

        let processedCount = 0;
        for (const result of results) {
            processedCount++;
            if (result.status === 'fulfilled') {
                const transcriptData = result.value;
                 writeEvent(res, { 
                    type: 'progress', 
                    count: processedCount, 
                    total: formattedVideos.length, 
                    message: `Procesando (${processedCount}/${formattedVideos.length}): "${transcriptData.title}"` 
                });
                writeEvent(res, { type: 'transcript', data: transcriptData });
            } else {
                 // Even if a promise was rejected, we log it and update progress.
                 // We don't have video info here, so a generic message is used.
                 console.error('Failed to process a video transcript:', result.reason);
                 writeEvent(res, { 
                    type: 'progress', 
                    count: processedCount, 
                    total: formattedVideos.length, 
                    message: `Error en video ${processedCount}/${formattedVideos.length}`
                });
            }
        }

        writeEvent(res, { type: 'done', message: '¡Extracción completada!' });

    } catch (error: any) {
        console.error('Error in processing channel:', error);
        if (!res.writableEnded) {
            // Avoid writing to a closed stream
            if (error.name !== 'AbortError') {
                writeEvent(res, { type: 'error', message: error.message });
            }
        }
    } finally {
        if (!res.writableEnded) {
            res.end();
        }
    }
}