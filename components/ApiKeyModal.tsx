
import React, { useState } from 'react';
import { KeyRound, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
    onSubmit: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit }) => {
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            setError('Veuillez entrer une clé API.');
            return;
        }
        onSubmit(apiKey);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 scale-95 animate-scale-in">
                <div className="text-center">
                    <KeyRound className="mx-auto h-12 w-12 text-cyan-400" />
                    <h2 className="mt-4 text-2xl font-bold text-white">Clé API Gemini Requise</h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Pour utiliser les fonctionnalités d'analyse par IA, veuillez fournir votre clé API Google Gemini.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="api-key" className="sr-only">Clé API Gemini</label>
                        <input
                            id="api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Entrez votre clé API ici"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500"
                        />
                         {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-4 rounded-lg transition duration-300"
                    >
                        Sauvegarder et Continuer
                    </button>
                </form>
                <div className="mt-4 text-center">
                     <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                    >
                        Obtenir une clé API Gemini <ExternalLink size={14} />
                    </a>
                </div>
            </div>
             <style>{`
                .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default ApiKeyModal;
