import React, { useState, useCallback, useRef } from 'react';
import type { VideoTranscript, VideoInfo } from './types';
import { Language } from './types';
import { ChannelInputForm } from './components/ChannelInputForm';
import { ProgressBar } from './components/ProgressBar';
import { TranscriptViewer } from './components/TranscriptViewer';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Define the structure of server-sent events
interface StreamEvent {
    type: 'total' | 'transcript' | 'progress' | 'error' | 'done';
    count?: number;
    total?: number;
    message?: string;
    data?: VideoTranscript;
}

const App: React.FC = () => {
    const [channelUrl, setChannelUrl] = useState<string>('');
    const [language, setLanguage] = useState<Language>(Language.Spanish);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<{ current: number; total: number; message: string }>({ current: 0, total: 0, message: '' });
    const [transcripts, setTranscripts] = useState<VideoTranscript[]>([]);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleExtract = useCallback(async () => {
        if (!channelUrl.trim()) {
            setError('Por favor, introduce una URL de canal de YouTube válida.');
            return;
        }
        
        // Abort previous request if it's still running
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        setError(null);
        setIsLoading(true);
        setTranscripts([]);
        setProgress({ current: 0, total: 0, message: 'Inicializando...' });

        try {
            const response = await fetch(`/api/process-channel?channelUrl=${encodeURIComponent(channelUrl)}&language=${language}`, { signal });

            if (!response.ok || !response.body) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido en el servidor.' }));
                throw new Error(errorData.error || `La solicitud al servidor falló con estado ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const event: StreamEvent = JSON.parse(line);
                        
                        switch (event.type) {
                            case 'total':
                                setProgress(prev => ({ ...prev, total: event.count ?? 0, message: `Se encontraron ${event.count} videos. Iniciando extracción...` }));
                                break;
                            case 'transcript':
                                if (event.data) {
                                    setTranscripts(prev => [...prev, event.data!]);
                                }
                                break;
                            case 'progress':
                                setProgress({ current: event.count ?? 0, total: event.total ?? 0, message: event.message ?? '' });
                                break;
                            case 'error':
                                throw new Error(event.message);
                            case 'done':
                                setProgress(prev => ({ ...prev, message: event.message ?? 'Completado' }));
                                break;
                        }
                    } catch (e) {
                        console.warn('Error al procesar la línea del stream:', line, e);
                    }
                }
            }
             setProgress(prev => ({ ...prev, current: prev.total, message: '¡Extracción completada!' }));

        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.error(err);
                const errorMessage = err.message || 'Ocurrió un error desconocido.';
                setError(`Error durante la extracción. ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [channelUrl, language]);
    
    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

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
                            {isLoading && <ProgressBar progress={progress} onCancel={handleCancel} />}
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