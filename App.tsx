
import React, { useState, useEffect } from 'react';
import type { Transaction, BudgetData } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import ApiKeyModal from './components/ApiKeyModal';
import { getApiKey, setApiKey } from './services/aiService';

const App: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budget, setBudget] = useState<BudgetData | null>(null);
    const [key, setKey] = useState<number>(0);
    const [isKeySet, setIsKeySet] = useState<boolean>(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

    useEffect(() => {
        const key = getApiKey();
        if (key) {
            setIsKeySet(true);
        } else {
            setShowApiKeyModal(true); // Show modal if no key is found
        }
    }, []);

    const handleDataLoaded = (data: {transactions: Transaction[], budget: BudgetData}) => {
        setTransactions(data.transactions);
        setBudget(data.budget);
    };

    const handleReset = () => {
        setTransactions([]);
        setBudget(null);
        setKey(prevKey => prevKey + 1);
    };

    const handleKeySubmit = (apiKey: string) => {
        setApiKey(apiKey);
        setIsKeySet(true);
        setShowApiKeyModal(false);
    };

    const isDataLoaded = transactions.length > 0 && budget !== null;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <header className="bg-gray-800 shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-cyan-400">
                        📊 Dashboard Financier
                    </h1>
                    {isDataLoaded && (
                        <button
                            onClick={handleReset}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            Changer les fichiers
                        </button>
                    )}
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6">
                {showApiKeyModal && <ApiKeyModal onSubmit={handleKeySubmit} />}
                
                {!showApiKeyModal && !isDataLoaded && (
                    <div className="flex items-center justify-center h-[calc(100vh-150px)]">
                         <FileUpload key={key} onDataLoaded={handleDataLoaded} />
                    </div>
                )}

                {!showApiKeyModal && isDataLoaded && (
                    <Dashboard transactions={transactions} budget={budget} onManageApiKey={() => setShowApiKeyModal(true)} isKeySet={isKeySet} />
                )}
            </main>
        </div>
    );
};

export default App;
