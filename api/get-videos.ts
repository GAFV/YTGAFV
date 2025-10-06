import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getChannelVideos } from 'yt-channel-info';
import type { VideoInfo } from '../types';

// Helper to extract channel ID or username from a YouTube URL
const getChannelIdFromUrl = (url: string): string | null => {
    try {
        const urlObject = new URL(url);
        const path = urlObject.pathname.split('/').filter(p => p);

        if (path[0] === 'c' || path[0].startsWith('@')) {
            // Format: /c/ChannelName or /@ChannelName
            return path[0] + '/' + path[1];
        }
        if (path[0] === 'channel') {
            // Format: /channel/UC...
            return path[1];
        }
        if (path[0] === 'user') {
            // Format: /user/UserName
             return path[1];
        }
        return null; // Unexpected format
    } catch (e) {
        // If it's not a full URL, maybe it's just the ID/name
        return url;
    }
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { channelUrl } = req.query;

    if (!channelUrl || typeof channelUrl !== 'string') {
        return res.status(400).json({ error: 'El parámetro de consulta `channelUrl` es obligatorio.' });
    }

    try {
        const channelId = getChannelIdFromUrl(channelUrl);
        if (!channelId) {
            return res.status(400).json({ error: 'No se pudo determinar un identificador de canal válido desde la URL.' });
        }
        
        let allVideos: any[] = [];
        let continuation = null;
        let pagesLoaded = 0;

        const initialResponse = await getChannelVideos({ channelId, sortBy: 'newest' });
        allVideos.push(...initialResponse.items);
        continuation = initialResponse.continuation;
        pagesLoaded++;
        
        // Loop to fetch all pages of videos
        while (continuation && pagesLoaded < 50) { // Safety limit of 50 pages (~2500 videos)
            const nextResponse = await getChannelVideos({ channelId, sortBy: 'newest', continuation });
            allVideos.push(...nextResponse.items);
            continuation = nextResponse.continuation;
            pagesLoaded++;
        }

        if (allVideos.length === 0) {
            return res.status(404).json({ error: 'No se encontraron videos para este canal.' });
        }

        const formattedVideos: VideoInfo[] = allVideos.map((video: any) => ({
            id: video.videoId,
            title: video.title,
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
        }));

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
        return res.status(200).json(formattedVideos);

    } catch (error: any) {
        console.error('Error fetching channel videos:', error);
        return res.status(500).json({ error: 'Error al obtener la lista de videos de YouTube.', details: error.message });
    }
}