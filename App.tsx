
import React, { useState, useCallback } from 'react';
import type { VideoTranscript, VideoInfo } from './types';
import { Language } from './types';
import { ChannelInputForm } from './components/ChannelInputForm';
import { ProgressBar } from './components/ProgressBar';
import { TranscriptViewer } from './components/TranscriptViewer';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const App: React.FC = () => {
    const [channelUrl, setChannelUrl] = useState<string>('');
    const [language, setLanguage] = useState<Language>(Language.Spanish);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<{ current: number; total: number; message: string }>({ current: 0, total: 0, message: '' });
    const [transcripts, setTranscripts] = useState<VideoTranscript[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleExtract = useCallback(async () => {
        if (!channelUrl.trim()) {
            setError('Please enter a valid YouTube channel URL.');
            return;
        }
        
        setError(null);
        setIsLoading(true);
        setTranscripts([]);
        setProgress({ current: 0, total: 0, message: 'Initializing...' });

        try {
            setProgress({ current: 0, total: 0, message: 'Fetching video list from channel...' });
            
            const videosResponse = await fetch(`/api/get-videos?channelUrl=${encodeURIComponent(channelUrl)}`);
            if (!videosResponse.ok) {
                const errorData = await videosResponse.json();
                throw new Error(errorData.error || `Failed to fetch video list. Status: ${videosResponse.status}`);
            }
            const videos: VideoInfo[] = await videosResponse.json();
            
            if (videos.length === 0) {
                setError('No videos found for this channel or the URL is incorrect.');
                setIsLoading(false);
                return;
            }

            setProgress(prev => ({ ...prev, total: videos.length, message: `Found ${videos.length} videos. Starting transcript extraction...` }));
            
            const extractedTranscripts: VideoTranscript[] = [];
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                setProgress({ current: i + 1, total: videos.length, message: `Extracting transcript for "${video.title}"...` });
                
                try {
                    const transcriptResponse = await fetch(`/api/get-transcript?videoId=${video.id}&language=${language}`);
                    const transcriptData = await transcriptResponse.json();

                    const newTranscript: VideoTranscript = {
                        ...video,
                        transcript: transcriptData.transcript || '[Error fetching transcript]',
                    };
                    extractedTranscripts.push(newTranscript);
                    setTranscripts([...extractedTranscripts]);
                } catch (e) {
                    console.warn(`Could not fetch transcript for video ${video.id}:`, e);
                     const newTranscript: VideoTranscript = {
                        ...video,
                        transcript: '[Transcript fetch failed]',
                    };
                    extractedTranscripts.push(newTranscript);
                    setTranscripts([...extractedTranscripts]);
                }
            }

            setProgress({ current: videos.length, total: videos.length, message: 'Extraction complete!' });

        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to extract transcripts. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [channelUrl, language]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
            <Header />
            <main className="flex-grow container mx-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-2xl shadow-2xl shadow-purple-500/10 backdrop-blur-sm border border-gray-700">
                    <div className="p-6 md:p-8">
                        <ChannelInputForm
                            channelUrl={channelUrl}
                            setChannelUrl={setChannelUrl}
                            language={language}
                            setLanguage={setLanguage}
                            onExtract={handleExtract}
                            isLoading={isLoading}
                        />
                        {error && <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">{error}</div>}
                    </div>

                    {(isLoading || transcripts.length > 0) && (
                        <div className="p-6 md:p-8 border-t border-gray-700">
                            {isLoading && <ProgressBar progress={progress} />}
                            {transcripts.length > 0 && !isLoading && (
                                <TranscriptViewer transcripts={transcripts} />
                            )}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default App;
