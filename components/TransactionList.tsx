import React, { useState, useMemo } from 'react';
import type { Transaction } from '../types';

interface TransactionListProps {
    transactions: Transaction[];
}

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const isRevenue = transaction.type === 'Revenu';
    const amountColor = isRevenue ? 'text-green-400' : transaction.type === 'Dépense' ? 'text-red-400' : 'text-blue-400';

    const typeDisplayMap: { [key in Transaction['type']]: { text: string; color: string } } = {
        'Revenu': { text: 'Revenu', color: 'text-green-400' },
        'Dépense': { text: 'Dépense', color: 'text-red-400' },
        'Sorties': { text: 'Epargne/Invest.', color: 'text-blue-400' }
    };
    const displayType = typeDisplayMap[transaction.type];
    
    return (
        <tr className="border-b border-gray-700 hover:bg-gray-700/50">
            <td className="p-3 font-mono">{transaction.date.toLocaleDateString('fr-CA')}</td>
            <td className="p-3">{transaction.description}</td>
            <td className={`p-3 font-semibold font-mono ${amountColor}`}>
                {isRevenue ? '' : '-'}{transaction.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
            </td>
            <td className={`p-3 font-semibold ${displayType.color}`}>{displayType.text}</td>
        </tr>
    );
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'Dépense' | 'Revenu' | 'Sorties'>('all');

    const tabs: {id: typeof activeTab, label: string}[] = [
        { id: 'all', label: 'Tout' },
        { id: 'Dépense', label: 'Dépenses' },
        { id: 'Revenu', label: 'Revenus' },
        { id: 'Sorties', label: 'Épargne' },
    ];

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const searchMatch = !searchTerm || t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const tabMatch = activeTab === 'all' || t.type === activeTab;
            return searchMatch && tabMatch;
        });
    }, [transactions, searchTerm, activeTab]);

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-cyan-400">Historique des Transactions</h3>
            </div>

            <div className="mb-4 border-b border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-cyan-400 text-cyan-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                             aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <input
                type="text"
                placeholder="Rechercher par description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="overflow-auto max-h-96">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-800">
                        <tr className="border-b border-gray-600">
                            <th className="p-3 text-sm font-semibold text-gray-400">Date</th>
                            <th className="p-3 text-sm font-semibold text-gray-400">Description</th>
                            <th className="p-3 text-sm font-semibold text-gray-400">Montant</th>
                            <th className="p-3 text-sm font-semibold text-gray-400">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map((t, index) => <TransactionRow key={index} transaction={t} />)}
                    </tbody>
                </table>
                 {filteredTransactions.length === 0 && <p className="text-center text-gray-500 py-8">Aucune transaction trouvée.</p>}
            </div>
        </div>
    );
};

export default TransactionList;