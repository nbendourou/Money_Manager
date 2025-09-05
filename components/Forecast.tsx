
import React, { useMemo } from 'react';
import { FileText, Download } from 'lucide-react';

interface ExpenseSummaryData {
    category: string;
    actualAmount: number;
    proratedBudget: number;
    difference: number;
}
interface ExpenseSummaryTableProps {
    data: ExpenseSummaryData[];
    onExport: () => void;
}

const ExpenseSummaryTable: React.FC<ExpenseSummaryTableProps> = ({ data, onExport }) => {
    
    const totals = useMemo(() => {
        return data.reduce((acc, item) => {
            acc.actualAmount += item.actualAmount;
            acc.proratedBudget += item.proratedBudget;
            acc.difference += item.difference;
            return acc;
        }, { actualAmount: 0, proratedBudget: 0, difference: 0 });
    }, [data]);

    const formatCurrency = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                    <FileText size={20} /> Analyse Budgétaire des Dépenses
                </h3>
                <button 
                    onClick={onExport} 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors"
                    title="Exporter cette analyse au format Excel"
                >
                    <Download size={16}/> 
                    <span>Exporter</span>
                </button>
            </div>
            {data.length > 0 ? (
                <div className="w-full overflow-auto flex-grow max-h-72">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-gray-800 z-10">
                            <tr className="border-b border-gray-600">
                                <th className="p-2 font-semibold text-gray-400">Catégorie</th>
                                <th className="p-2 font-semibold text-gray-400 text-right">Dépenses</th>
                                <th className="p-2 font-semibold text-gray-400 text-right">Budget Période</th>
                                <th className="p-2 font-semibold text-gray-400 text-right">Écart</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(item => (
                                <tr key={item.category} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-2 truncate" title={item.category}>{item.category}</td>
                                    <td className="p-2 text-right font-mono text-gray-300">
                                        {formatCurrency(item.actualAmount)}
                                    </td>
                                    <td className="p-2 text-right font-mono text-gray-400">
                                       {formatCurrency(item.proratedBudget)}
                                    </td>
                                     <td className={`p-2 text-right font-mono font-semibold ${item.difference < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {item.difference < 0 ? '' : '+'}{formatCurrency(item.difference)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 bg-gray-800">
                           <tr className="font-bold border-t-2 border-gray-600">
                                <td className="p-2">Total</td>
                                <td className="p-2 text-right font-mono text-gray-300">
                                     {formatCurrency(totals.actualAmount)}
                                </td>
                                <td className="p-2 text-right font-mono text-gray-400">
                                     {formatCurrency(totals.proratedBudget)}
                                </td>
                                <td className={`p-2 text-right font-mono font-semibold ${totals.difference < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                     {totals.difference < 0 ? '' : '+'}{formatCurrency(totals.difference)}
                                </td>
                           </tr>
                        </tfoot>
                    </table>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500 text-center">Aucune dépense à analyser pour cette période.</p>
                </div>
            )}
        </div>
    );
};

export default ExpenseSummaryTable;
