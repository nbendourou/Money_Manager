
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Transaction, FilterState, BudgetData, MonthlyData } from '../types';
import { useFinanceData } from '../hooks/useFinanceData';

import Filters from './Filters';
import KPICard from './KPICard';
import { MonthlyEvolutionChart, ExpenseDistributionChart, SavingsDistributionChart, RevenueDistributionChart } from './Charts';
import TransactionList from './TransactionList';
import ExpenseSummaryTable from './Forecast';
import GeminiAnalysis from './GeminiAnalysis'; // Import GeminiAnalysis
import { exportToExcel, exportToPdf, exportBudgetAnalysisToExcel } from '../services/reportingService';
import { Download, FileText, Loader2, TrendingUp, TrendingDown, PiggyBank, Scale, BadgePercent, Sparkles, KeyRound } from 'lucide-react';

interface DashboardProps {
    transactions: Transaction[];
    budget: BudgetData;
    isKeySet: boolean;
    onManageApiKey: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, budget, isKeySet, onManageApiKey }) => {
    const [filters, setFilters] = useState<FilterState>({
        year: new Date().getFullYear(),
        month: 'all',
        dateRange: { startDate: null, endDate: null }
    });
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [monthlyChartMetric, setMonthlyChartMetric] = useState<'depenses' | 'revenus' | 'epargne'>('depenses');
    const [monthlyChartCategory, setMonthlyChartCategory] = useState<string>('all');
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false); // State for Gemini modal


    const monthlyChartRef = useRef<HTMLDivElement>(null);
    const savingsChartRef = useRef<HTMLDivElement>(null);
    const expenseChartRef = useRef<HTMLDivElement>(null);
    const revenueChartRef = useRef<HTMLDivElement>(null);
    
    const {
        filteredTransactions,
        kpis,
        previousKpis,
        monthlyChartData,
        categoryChartData,
        savingsDistributionData,
        revenueByCategoryData,
        expenseSummaryData,
        expenseCategories,
        revenueCategories,
        savingsCategories,
    } = useFinanceData(transactions, budget, filters);

    const categoryOptions = useMemo(() => {
        switch (monthlyChartMetric) {
            case 'depenses': return expenseCategories;
            case 'revenus': return revenueCategories;
            case 'epargne': return savingsCategories;
            default: return [];
        }
    }, [monthlyChartMetric, expenseCategories, revenueCategories, savingsCategories]);

    useEffect(() => {
        setMonthlyChartCategory('all');
    }, [monthlyChartMetric]);

    const finalMonthlyChartData = useMemo(() => {
        if (monthlyChartCategory === 'all') {
            return monthlyChartData;
        }

        const metricToType: { [key in typeof monthlyChartMetric]: Transaction['type'] } = {
            depenses: 'Dépense',
            revenus: 'Revenu',
            epargne: 'Sorties'
        };
        const targetType = metricToType[monthlyChartMetric];

        const monthlyMap = new Map<string, MonthlyData>();
        monthlyChartData.forEach(d => {
            monthlyMap.set(d.name, { ...d, revenus: 0, depenses: 0, epargne: 0 });
        });

        filteredTransactions
            .filter(t => t.type === targetType && (t.description.split(' - ')[0] || t.description) === monthlyChartCategory)
            .forEach(t => {
                const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyMap.has(monthKey)) {
                    const data = monthlyMap.get(monthKey)!;
                    // FIX: Remove `as any` cast to allow for direct property access with type safety.
                    (data as any)[monthlyChartMetric] += t.amount;
                }
            });
        
        return Array.from(monthlyMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [monthlyChartData, monthlyChartCategory, monthlyChartMetric, filteredTransactions]);

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
            const scale = 2;
            canvas.width = svgSize.width * scale;
            canvas.height = svgSize.height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve('');
    
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve('');
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
            <GeminiAnalysis 
                isOpen={isAnalysisModalOpen}
                onClose={() => setIsAnalysisModalOpen(false)}
                transactions={filteredTransactions}
                kpis={kpis}
                filters={filters}
            />
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <Filters filters={filters} setFilters={setFilters} availableYears={availableYears} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard title="Total Revenus" value={kpis.totalRevenue} previousValue={previousKpis.totalRevenue} higherIsBetter={true} format="currency" color="text-green-400" Icon={TrendingUp} />
                <KPICard title="Total Dépenses" value={kpis.totalExpenses} previousValue={previousKpis.totalExpenses} higherIsBetter={false} format="currency" color="text-red-400" Icon={TrendingDown} />
                <KPICard title="Total Épargne" value={kpis.totalSavings} previousValue={previousKpis.totalSavings} higherIsBetter={true} format="currency" color="text-blue-400" Icon={PiggyBank} />
                <KPICard title="Solde Net" value={kpis.netBalance} format="currency" color={kpis.netBalance >= 0 ? 'text-green-400' : 'text-red-400'} Icon={Scale} />
                <KPICard title="Taux d'Épargne" value={kpis.savingsRate} format="percent" color="text-yellow-400" Icon={BadgePercent} />
            </div>
            
            <div className="flex flex-wrap justify-end gap-4">
                 <div className="relative group">
                    <button 
                        onClick={() => isKeySet ? setIsAnalysisModalOpen(true) : onManageApiKey()}
                        className={`flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ${!isKeySet && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <Sparkles size={18} /><span>Obtenir une Analyse IA</span>
                    </button>
                    {!isKeySet && (
                        <div className="absolute bottom-full mb-2 w-60 bg-gray-700 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            Veuillez configurer votre clé API Gemini pour activer cette fonctionnalité.
                             <button onClick={onManageApiKey} className="text-cyan-400 underline ml-1">Configurer</button>
                        </div>
                    )}
                </div>
                <button onClick={handleExportExcel} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    <Download size={18} /><span>Exporter Excel</span>
                </button>
                <button 
                    onClick={handleExportPdf} 
                    disabled={isExportingPdf}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-red-800 disabled:cursor-not-allowed"
                >
                    {isExportingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                    <span>{isExportingPdf ? 'Génération...' : 'Exporter PDF'}</span>
                </button>
                 <button onClick={onManageApiKey} className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300" title="Gérer la clé API Gemini">
                    <KeyRound size={18} />
                </button>
            </div>

            <div ref={monthlyChartRef} className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-cyan-400">Évolution Mensuelle</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                            {(['depenses', 'revenus', 'epargne'] as const).map((m) => {
                                const metricDetails = {
                                    depenses: { label: 'Dépenses', color: 'bg-red-500', ringColor: 'focus:ring-red-500' },
                                    revenus: { label: 'Revenus', color: 'bg-green-500', ringColor: 'focus:ring-green-500' },
                                    epargne: { label: 'Épargne', color: 'bg-blue-500', ringColor: 'focus:ring-blue-500' },
                                };
                                const isSelected = monthlyChartMetric === m;
                                return (
                                    <button
                                        key={m}
                                        onClick={() => setMonthlyChartMetric(m)}
                                        className={`px-3 py-1 rounded-full transition-colors ${
                                            isSelected 
                                            ? `${metricDetails[m].color} text-white font-semibold shadow-md` 
                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${metricDetails[m].ringColor}`}
                                    >
                                        {metricDetails[m].label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative">
                            <label htmlFor="category-select" className="sr-only">Catégorie</label>
                            <select
                                id="category-select"
                                value={monthlyChartCategory}
                                onChange={(e) => setMonthlyChartCategory(e.target.value)}
                                disabled={categoryOptions.length === 0}
                                className="bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="all">Toutes les catégories</option>
                                {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <MonthlyEvolutionChart data={finalMonthlyChartData} metric={monthlyChartMetric} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            <ExpenseSummaryTable data={expenseSummaryData} onExport={handleExportBudget} />

            <TransactionList transactions={filteredTransactions} />
        </div>
    );
};

export default Dashboard;
