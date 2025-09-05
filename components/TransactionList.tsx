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

    const filteredTransactions = useMemo(() => {
        if (!searchTerm) return transactions;
        return transactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Historique des Transactions</h3>
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