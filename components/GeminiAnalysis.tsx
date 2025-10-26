import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { X, Sparkles, Loader2 } from 'lucide-react';
import type { Transaction, FilterState } from '../types';

interface Kpis {
    totalRevenue: number;
    totalExpenses: number;
    totalSavings: number;
    netBalance: number;
    savingsRate: number;
}

interface GeminiAnalysisProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    kpis: Kpis;
    filters: FilterState;
}

const GeminiAnalysis: React.FC<GeminiAnalysisProps> = ({ isOpen, onClose, transactions, kpis, filters }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const hasStartedAnalysis = useRef(false);
    const aiClientRef = useRef<any>(null);

    const getAiClient = () => {
        if (aiClientRef.current) {
            return aiClientRef.current;
        }
        if (typeof window !== 'undefined' && (window as any).genai?.GoogleGenerativeAI) {
            const GoogleGenerativeAIClient = (window as any).genai.GoogleGenerativeAI;
            aiClientRef.current = new GoogleGenerativeAIClient({ apiKey: process.env.API_KEY });
            return aiClientRef.current;
        }
        console.error("Google GenAI SDK not loaded.");
        return null;
    };


    const getFilterDescription = () => {
        if (filters.dateRange.startDate && filters.dateRange.endDate) {
            return `la période du ${filters.dateRange.startDate.toLocaleDateString('fr-FR')} au ${filters.dateRange.endDate.toLocaleDateString('fr-FR')}`;
        }
        if (filters.year !== 'all' && filters.month !== 'all') {
            const monthName = new Date(0, filters.month - 1).toLocaleString('fr-FR', { month: 'long' });
            return `le mois de ${monthName} ${filters.year}`;
        }
        if (filters.year !== 'all') {
            return `l'année ${filters.year}`;
        }
        return "toute la période";
    };

    const generateAnalysis = useCallback(async () => {
        const ai = getAiClient();
        if (!ai) {
            setError("Le SDK de l'IA n'a pas pu être chargé. Veuillez rafraîchir la page et réessayer.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysis('');
        hasStartedAnalysis.current = true;

        const topExpenses = transactions
            .filter(t => t.type === 'Dépense')
            // FIX: Add explicit type for the accumulator 'acc' to prevent its properties from being inferred as 'unknown', which caused downstream errors in arithmetic operations and method calls like '.toFixed'.
            .reduce((acc: { [key: string]: number }, t) => {
                const category = t.description.split(' - ')[0] || t.description;
                acc[category] = (acc[category] || 0) + t.amount;
                return acc;
            }, {} as { [key: string]: number });
        
        const sortedTopExpenses = Object.entries(topExpenses).sort(([,a],[,b]) => b-a).slice(0, 5);

        const prompt = `
            En tant qu'expert en finances personnelles, analyse les données financières suivantes pour ${getFilterDescription()}.
            Fournis une analyse claire, concise et encourageante en français, formatée en Markdown.
            
            Voici un résumé des données:
            - Revenus totaux: ${kpis.totalRevenue.toFixed(2)} MAD
            - Dépenses totales: ${kpis.totalExpenses.toFixed(2)} MAD
            - Épargne totale: ${kpis.totalSavings.toFixed(2)} MAD
            - Solde net: ${kpis.netBalance.toFixed(2)} MAD
            - Taux d'épargne: ${kpis.savingsRate.toFixed(2)}%
            - Top 5 des catégories de dépenses: ${sortedTopExpenses.map(([cat, val]) => `${cat}: ${val.toFixed(2)} MAD`).join(', ')}

            Ton analyse doit inclure:
            1.  **Un résumé général** de la santé financière pour la période.
            2.  **Une observation clé** sur les habitudes de dépenses.
            3.  **Deux conseils pratiques et personnalisés** pour améliorer la gestion financière (par exemple, des pistes d'économies sur une catégorie de dépense élevée ou des suggestions pour augmenter l'épargne).
            
            Adopte un ton positif et motivant. Termine par une note d'encouragement. Ne réponds que par l'analyse formatée en markdown, sans phrases d'introduction comme "Voici l'analyse".
            Commence directement avec un titre comme "### 💡 Analyse Financière par IA".
        `;

        try {
            const stream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setIsLoading(false);
            let text = '';
            for await (const chunk of stream) {
                text += chunk.text;
                setAnalysis(text);
            }
        } catch (err) {
            console.error(err);
            setError("Désolé, une erreur est survenue lors de l'analyse. Veuillez réessayer.");
            setIsLoading(false);
        }
    }, [transactions, kpis, filters]);
    
    useEffect(() => {
        if (isOpen && !hasStartedAnalysis.current) {
            generateAnalysis();
        }
        if (!isOpen) {
            // Reset when closing
            hasStartedAnalysis.current = false;
            setAnalysis('');
        }
    }, [isOpen, generateAnalysis]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!isOpen) return null;

    const formattedHtml = marked.parse(analysis);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div ref={modalRef} className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 animate-scale-in">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                        <Sparkles size={22} />
                        Analyse Financière par IA
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Fermer">
                        <X size={24} />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto text-gray-300">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 h-60">
                            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                            <p className="font-semibold text-lg">Analyse en cours...</p>
                            <p className="text-gray-400">Gemini examine vos données pour vous fournir des conseils personnalisés.</p>
                        </div>
                    )}
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    {!isLoading && analysis && (
                         <div
                            className="prose prose-invert"
                            dangerouslySetInnerHTML={{ __html: formattedHtml }}
                        />
                    )}
                </main>
                 <footer className="p-4 border-t border-gray-700 text-center">
                    <button 
                        onClick={generateAnalysis}
                        disabled={isLoading}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:bg-cyan-800 disabled:cursor-not-allowed"
                    >
                       {isLoading ? 'Analyse...' : 'Régénérer l’analyse'}
                    </button>
                </footer>
            </div>
             <style>{`
                .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default GeminiAnalysis;
