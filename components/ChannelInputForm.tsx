import React from 'react';
import { Youtube, Languages, Film, LoaderCircle } from 'lucide-react';
import { Language } from '../types';

interface ChannelInputFormProps {
    channelUrl: string;
    setChannelUrl: (url: string) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    onExtract: () => void;
    isLoading: boolean;
}

export const ChannelInputForm: React.FC<ChannelInputFormProps> = ({
    channelUrl,
    setChannelUrl,
    language,
    setLanguage,
    onExtract,
    isLoading
}) => {
    return (
        <div className="space-y-6">
            <div className="relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                    placeholder="Introduce la URL del canal de YouTube"
                    className="w-full bg-gray-900 border border-gray-600 rounded-md py-3 pl-10 pr-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="language-select" className="flex items-center space-x-2 text-gray-400">
                    <Languages size={18} />
                    <span>Idioma Preferido</span>
                </label>
                <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    disabled={isLoading}
                >
                    <option value={Language.Spanish}>Español</option>
                    <option value={Language.English}>Inglés</option>
                    <option value={Language.Portuguese}>Portugués</option>
                </select>
            </div>

            <button
                onClick={onExtract}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
                {isLoading ? (
                    <>
                        <LoaderCircle className="animate-spin mr-2" size={20} />
                        <span>Extrayendo...</span>
                    </>
                ) : (
                    'Extraer Transcripciones'
                )}
            </button>
        </div>
    );
};