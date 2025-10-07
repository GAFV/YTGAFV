
import React from 'react';

interface ProgressBarProps {
    progress: {
        current: number;
        total: number;
        message: string;
    };
    onCancel: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, onCancel }) => {
    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm text-gray-400">
                <span className="truncate pr-4 font-medium">{progress.message}</span>
                <span className="flex-shrink-0 font-mono">{progress.current} / {progress.total}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                        className="bg-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                        aria-label={`Progreso de extracción de videos: ${percentage}%`}
                    ></div>
                </div>
                <span className="text-sm font-mono text-gray-300 w-12 text-right">{percentage}%</span>
            </div>
             <button
                onClick={onCancel}
                className="w-full text-center text-sm text-gray-400 hover:text-red-400 transition-colors pt-2"
                aria-label="Cancelar el proceso de extracción de transcripciones"
             >
                Cancelar
            </button>
        </div>
    );
};
