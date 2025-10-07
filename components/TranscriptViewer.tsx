import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { VideoTranscript } from '../types';
import { BotMessageSquare, Download, LoaderCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface TranscriptViewerProps {
    transcripts: VideoTranscript[];
}

const TranscriptItem: React.FC<{ transcript: VideoTranscript, index: number }> = ({ transcript, index }) => {
    const [isOpen, setIsOpen] = useState(index < 3); // Open first 3 by default

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
            >
                <span className="font-medium text-gray-300">{index + 1}. {transcript.title}</span>
                {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                        {transcript.transcript}
                    </p>
                </div>
            )}
        </div>
    );
};

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ transcripts }) => {
    const [analysis, setAnalysis] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState<string>('Resume los temas clave y los temas recurrentes de estas transcripciones. Identifica el mensaje principal del canal basándote en este contenido.');
    const analysisBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (analysisBoxRef.current) {
            analysisBoxRef.current.scrollTop = analysisBoxRef.current.scrollHeight;
        }
    }, [analysis]);

    const handleAnalyze = useCallback(async () => {
        setIsAnalyzing(true);
        setAnalysis('');
        setAnalysisError(null);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcripts, customPrompt }),
            });

            if (!response.ok || !response.body) {
                const errorText = await response.text().catch(() => 'Error desconocido en el servidor.');
                throw new Error(errorText || 'Ocurrió un error desconocido durante el análisis.');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                setAnalysis(prev => prev + chunk);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido durante el análisis.';
            setAnalysisError(errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    }, [transcripts, customPrompt]);

    const handleExport = useCallback(() => {
        const content = `EXPORTACIÓN DE TRANSCRIPCIONES DE CANAL DE YOUTUBE\n\n${'='.repeat(50)}\n\n`
            + transcripts.map(t => `VIDEO: ${t.title}\nURL: ${t.url}\n\n${t.transcript}\n\n${'-'.repeat(50)}\n`).join('\n')
            + (analysis ? `\n\n${'='.repeat(50)}\nANÁLISIS IA DE GEMINI\n${'='.repeat(50)}\n\n${analysis}` : '');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exportacion_transcripciones.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [transcripts, analysis]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4 text-purple-400">Transcripciones Extraídas</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {transcripts.map((t, i) => <TranscriptItem key={t.id} transcript={t} index={i} />)}
                </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-400">
                    <BotMessageSquare className="mr-3" />
                    Análisis IA con Gemini
                </h2>
                <div className="space-y-4">
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Introduce tu instrucción para el análisis aquí..."
                        className="w-full h-24 bg-gray-900 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        disabled={isAnalyzing}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || transcripts.length === 0}
                        className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-green-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-colors"
                    >
                        {isAnalyzing ? (
                            <>
                                <LoaderCircle className="animate-spin mr-2" size={20} />
                                <span>Analizando...</span>
                            </>
                        ) : 'Analizar con Gemini'}
                    </button>
                </div>
                
                {analysisError && <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">{analysisError}</div>}
                
                {(analysis || isAnalyzing) && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Resultado del Análisis:</h3>
                        <div ref={analysisBoxRef} className="bg-gray-900 p-4 rounded-md border border-gray-600 max-h-80 overflow-y-auto">
                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {analysis}
                                {isAnalyzing && <span className="inline-block w-2 h-5 bg-purple-400 animate-pulse ml-1 align-bottom"></span>}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            
            <button
                onClick={handleExport}
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
            >
                <Download className="mr-2" size={20} />
                Exportar Todo como .txt
            </button>
        </div>
    );
};