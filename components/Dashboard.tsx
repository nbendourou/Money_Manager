
import React, { useState, useMemo, useRef } from 'react';
import type { Transaction, FilterState, DateRange, BudgetData } from '../types';
import { useFinanceData } from '../hooks/useFinanceData';

import Filters from './Filters';
import KPICard from './KPICard';
import { MonthlyEvolutionChart, ExpenseDistributionChart, SavingsDistributionChart, RevenueDistributionChart } from './Charts';
import TransactionList from './TransactionList';
import ExpenseSummaryTable from './Forecast';
import { exportToExcel, exportToPdf, exportBudgetAnalysisToExcel } from '../services/reportingService';
import { Download, FileText, Loader2 } from 'lucide-react';

interface DashboardProps {
    transactions: Transaction[];
    budget: BudgetData;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, budget }) => {
    const [filters, setFilters] = useState<FilterState>({
        year: new Date().getFullYear(),
        month: 'all',
        dateRange: { startDate: null, endDate: null }
    });
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const monthlyChartRef = useRef<HTMLDivElement>(null);
    const savingsChartRef = useRef<HTMLDivElement>(null);
    const expenseChartRef = useRef<HTMLDivElement>(null);
    const revenueChartRef = useRef<HTMLDivElement>(null);
    
    const {
        filteredTransactions,
        kpis,
        monthlyChartData,
        categoryChartData,
        savingsDistributionData,
        revenueByCategoryData,
        expenseSummaryData,
    } = useFinanceData(transactions, budget, filters);

    const handleExportExcel = () => {
        exportToExcel(filteredTransactions, kpis, expenseSummaryData, "rapport_financier_complet");
    };

    const captureChartAsImage = async (element: HTMLElement | null): Promise<string> => {
        if (!element) return '';
        const svgElement = element.querySelector('svg');
        if (!svgElement) return '';
    
        return new Promise((resolve) => {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            
            const svgSize = svgElement.getBoundingClientRect();
            // Use higher resolution for better quality
            const scale = 2;
            canvas.width = svgSize.width * scale;
            canvas.height = svgSize.height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve('');
    
            // Set background color to match the component's bg-gray-800
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(''); // Resolve with empty string on error
            // Use btoa to encode non-ASCII characters correctly in SVG
            img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
        });
    };

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        try {
            const chartImages = {
                monthly: await captureChartAsImage(monthlyChartRef.current),
                savings: await captureChartAsImage(savingsChartRef.current),
                expenses: await captureChartAsImage(expenseChartRef.current),
                revenues: await captureChartAsImage(revenueChartRef.current),
            };
            exportToPdf(filteredTransactions, kpis, expenseSummaryData, chartImages, "Rapport Financier Complet");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportBudget = () => {
        exportBudgetAnalysisToExcel(expenseSummaryData, "analyse_budgetaire");
    };

    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(t => t.date.getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);


    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <Filters filters={filters} setFilters={setFilters} availableYears={availableYears} />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard title="Total Revenus" value={kpis.totalRevenue} format="currency" color="text-green-400" />
                <KPICard title="Total Dépenses" value={kpis.totalExpenses} format="currency" color="text-red-400" />
                <KPICard title="Total Épargne" value={kpis.totalSavings} format="currency" color="text-blue-400" />
                <KPICard title="Solde Net" value={kpis.netBalance} format="currency" color={kpis.netBalance >= 0 ? 'text-green-400' : 'text-red-400'} />
                <KPICard title="Taux d'Épargne" value={kpis.savingsRate} format="percent" color="text-yellow-400" />
            </div>
            
            {/* Export Buttons */}
             <div className="flex justify-end space-x-4">
                <button onClick={handleExportExcel} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    <Download size={18} /><span>Exporter Rapport Excel</span>
                </button>
                <button 
                    onClick={handleExportPdf} 
                    disabled={isExportingPdf}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-red-800 disabled:cursor-not-allowed"
                >
                    {isExportingPdf ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <FileText size={18} />
                    )}
                    <span>{isExportingPdf ? 'Génération...' : 'Exporter Rapport PDF'}</span>
                </button>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div ref={monthlyChartRef} className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-cyan-400">Évolution Mensuelle</h3>
                    <MonthlyEvolutionChart data={monthlyChartData} />
                </div>
                 <div ref={savingsChartRef} className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-cyan-400">Répartition de l'Épargne</h3>
                    <SavingsDistributionChart data={savingsDistributionData} />
                </div>
                <div ref={expenseChartRef} className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-cyan-400">Répartition des Dépenses</h3>
                    <ExpenseDistributionChart data={categoryChartData} />
                </div>
                <div ref={revenueChartRef} className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-cyan-400">Répartition des Revenus</h3>
                    <RevenueDistributionChart data={revenueByCategoryData} />
                </div>
            </div>

            {/* Budget and Details */}
             <ExpenseSummaryTable data={expenseSummaryData} onExport={handleExportBudget} />

            {/* Transactions */}
            <TransactionList transactions={filteredTransactions} />
        </div>
    );
};

export default Dashboard;
