
import React from 'react';
import { X } from 'lucide-react';

interface ProgressBarProps {
    progress: {
        current: number;
        total: number;
        message: string;
    };
    onCancel: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, onCancel }) => {
    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    return (
        <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm text-gray-400">
                <span className="truncate pr-4">{progress.message}</span>
                <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
             <button
                onClick={onCancel}
                className="w-full text-center text-sm text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Cancelar extracción"
             >
                Cancelar
            </button>
        </div>
    );
};
