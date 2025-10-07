import React from 'react';
import { Youtube } from 'lucide-react';

export const Header: React.FC = () => (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-center">
            <div className="flex items-center space-x-3 text-purple-400">
                <Youtube size={32} />
                <h1 className="text-xl md:text-2xl font-bold text-gray-100 tracking-tight">
                    Analizador IA de Transcripciones de YouTube
                </h1>
            </div>
        </div>
    </header>
);