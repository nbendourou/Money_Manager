
(() => {
    // --- SETUP LIBRARIES --- //
    const { React, ReactDOM, Recharts, LucideReact } = window;
    const { useState, useMemo, useEffect, useCallback, useRef } = React;
    const { jsPDF } = window.jspdf;
    const autoTable = window.jspdf.plugin.autotable; // Correct access for this UMD bundle
    const XLSX = window.XLSX;
    const {
        BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell, ResponsiveContainer
    } = Recharts;
     const {
        UploadCloud, Download, FileText, CheckCircle, AlertCircle, Loader2
    } = LucideReact;

    // --- REPORTING SERVICE --- //
    const reportingService = (() => {
        const formatCurrency = (value) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });
        const currencyFormat = '#,##0.00 "MAD";[Red]-#,##0.00 "MAD"';
        const percentFormat = '0.00%';

        const applyColumnFormats = (ws, formatConfig) => {
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = 1; R <= range.e.r; ++R) {
                for (const colLetter in formatConfig) {
                    const colIndex = XLSX.utils.decode_col(colLetter);
                    const address = XLSX.utils.encode_cell({ r: R, c: colIndex });
                    if (ws[address] && typeof ws[address].v === 'number') {
                        ws[address].z = formatConfig[colLetter];
                    }
                }
            }
        };

        const exportBudgetAnalysisToExcel = (data, fileName) => {
            const worksheetData = data.map(item => ({
                'Catégorie': item.category,
                'Dépenses Réelles': item.actualAmount,
                'Budget (Période)': item.proratedBudget,
                'Écart': item.difference,
            }));
            const totals = data.reduce((acc, item) => {
                acc.actualAmount += item.actualAmount;
                acc.proratedBudget += item.proratedBudget;
                acc.difference += item.difference;
                return acc;
            }, { actualAmount: 0, proratedBudget: 0, difference: 0 });
            worksheetData.push({
                'Catégorie': 'Total',
                'Dépenses Réelles': totals.actualAmount,
                'Budget (Période)': totals.proratedBudget,
                'Écart': totals.difference
            });

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            applyColumnFormats(worksheet, { 'B': currencyFormat, 'C': currencyFormat, 'D': currencyFormat });
            worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyse Budgétaire');
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        };

        const exportToExcel = (transactions, kpis, budgetData, fileName) => {
            const wb = XLSX.utils.book_new();

            const budgetTotals = budgetData.reduce((acc, item) => ({
                actualAmount: acc.actualAmount + item.actualAmount,
                proratedBudget: acc.proratedBudget + item.proratedBudget,
                difference: acc.difference + item.difference
            }), { actualAmount: 0, proratedBudget: 0, difference: 0 });

            // 1. Summary Sheet
            const summaryData = [
                ["Rapport Financier - Résumé"], [],
                ["Indicateurs Clés de Performance (KPIs)"],
                ["Total Revenus", kpis.totalRevenue],
                ["Total Dépenses", kpis.totalExpenses],
                ["Total Épargne", kpis.totalSavings],
                ["Solde Net", kpis.netBalance],
                ["Taux d'Épargne", kpis.savingsRate / 100], [],
                ["Totaux de l'Analyse Budgétaire"],
                ["Dépenses Réelles (Total)", budgetTotals.actualAmount],
                ["Budget Période (Total)", budgetTotals.proratedBudget],
                ["Écart (Total)", budgetTotals.difference]
            ];
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            summaryWs['B4'].z = currencyFormat;
            summaryWs['B5'].z = currencyFormat;
            summaryWs['B6'].z = currencyFormat;
            summaryWs['B7'].z = currencyFormat;
            summaryWs['B8'].z = percentFormat;
            summaryWs['B11'].z = currencyFormat;
            summaryWs['B12'].z = currencyFormat;
            summaryWs['B13'].z = currencyFormat;
            summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé et Totaux');

            // 2. Budget Analysis Sheet
            const budgetSheetData = budgetData.map(item => ({
                'Catégorie': item.category,
                'Dépenses Réelles': item.actualAmount,
                'Budget (Période)': item.proratedBudget,
                'Écart': item.difference,
            }));
            budgetSheetData.push({
                'Catégorie': 'Total',
                'Dépenses Réelles': budgetTotals.actualAmount,
                'Budget (Période)': budgetTotals.proratedBudget,
                'Écart': budgetTotals.difference
            });
            const budgetWs = XLSX.utils.json_to_sheet(budgetSheetData);
            applyColumnFormats(budgetWs, { 'B': currencyFormat, 'C': currencyFormat, 'D': currencyFormat });
            budgetWs['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, budgetWs, 'Analyse Budgétaire');

            // 3. Transactions Sheet
            const txWorksheetData = transactions.map(t => ({
                Date: t.date,
                Description: t.description,
                Montant: t.type === 'Revenu' ? t.amount : -t.amount,
                Type: t.type === 'Sorties' ? 'Epargne/Invest.' : t.type,
                Compte: t.account
            }));
            const txWs = XLSX.utils.json_to_sheet(txWorksheetData, { cellDates: true });
            applyColumnFormats(txWs, { 'C': currencyFormat });
            txWs['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, txWs, 'Transactions');
            
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        };

        const exportToPdf = (transactions, kpis, budgetData, chartImages, title) => {
            const doc = new jsPDF();
            let startY = 20;
        
            // Page 1: Title and KPIs
            doc.setFontSize(18);
            doc.text(title, 14, startY);
            startY += 15;
        
            doc.setFontSize(14);
            doc.text("Résumé Financier", 14, startY);
            startY += 8;
            autoTable(doc, {
                body: [
                    ['Total Revenus', formatCurrency(kpis.totalRevenue)],
                    ['Total Dépenses', formatCurrency(kpis.totalExpenses)],
                    ['Total Épargne', formatCurrency(kpis.totalSavings)],
                    ['Solde Net', formatCurrency(kpis.netBalance)],
                    ["Taux d'Épargne", `${kpis.savingsRate.toFixed(2)} %`],
                ],
                startY,
                theme: 'grid',
                headStyles: { fillColor: [75, 85, 99] },
            });
            
            // Page 2: Charts
            doc.addPage();
            startY = 20;
            doc.setFontSize(16);
            doc.text("Visualisations Graphiques", 14, startY);
            startY += 10;
            
            const addImageToPdf = (imgData, x, y, width, height) => {
                if (imgData) {
                    try {
                        doc.addImage(imgData, 'PNG', x, y, width, height);
                    } catch (e) {
                        console.error("Failed to add image to PDF", e);
                        doc.text("Erreur graphique", x, y + height / 2);
                    }
                } else {
                     doc.text("Graphique non disponible", x, y + height / 2);
                }
            };
        
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageMargin = 14;
            const chartWidth = (pageWidth - pageMargin * 3) / 2;
            const chartHeight = chartWidth * 0.6; // Maintain aspect ratio
            
            addImageToPdf(chartImages.monthly, pageMargin, startY, chartWidth, chartHeight);
            addImageToPdf(chartImages.savings, pageMargin + chartWidth + pageMargin, startY, chartWidth, chartHeight);
            startY += chartHeight + 10;
        
            addImageToPdf(chartImages.expenses, pageMargin, startY, chartWidth, chartHeight);
            addImageToPdf(chartImages.revenues, pageMargin + chartWidth + pageMargin, startY, chartWidth, chartHeight);
        
            // Page 3+: Data tables
            doc.addPage();
            startY = 20;
        
            // Budget Analysis Section
            doc.setFontSize(14);
            doc.text("Analyse Budgétaire des Dépenses", 14, startY);
            startY += 8;
            const budgetHead = [['Catégorie', 'Dépenses', 'Budget Période', 'Écart']];
            const budgetBody = budgetData.map(item => [
                item.category,
                formatCurrency(item.actualAmount),
                formatCurrency(item.proratedBudget),
                formatCurrency(item.difference),
            ]);
             const budgetTotals = budgetData.reduce((acc, item) => ({
                actualAmount: acc.actualAmount + item.actualAmount,
                proratedBudget: acc.proratedBudget + item.proratedBudget,
                difference: acc.difference + item.difference
            }), { actualAmount: 0, proratedBudget: 0, difference: 0 });
            const budgetFoot = [['Total', formatCurrency(budgetTotals.actualAmount), formatCurrency(budgetTotals.proratedBudget), formatCurrency(budgetTotals.difference)]];
        
            autoTable(doc, {
                head: budgetHead,
                body: budgetBody,
                foot: budgetFoot,
                startY,
                headStyles: { fillColor: [75, 85, 99] },
                footStyles: { fillColor: [75, 85, 99], fontStyle: 'bold' },
                pageBreak: 'auto'
            });
            
            let finalY = doc.lastAutoTable.finalY;
            
            if (finalY + 30 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                startY = 20;
            } else {
                startY = finalY + 15;
            }
        
            // Transactions Section
            doc.setFontSize(14);
            doc.text("Historique des Transactions", 14, startY);
            startY += 8;
            const txHead = [["Date", "Description", "Montant", "Type", "Compte"]];
            const txBody = transactions.map(t => {
                const amount = t.type === 'Revenu' ? t.amount : -t.amount;
                return [
                    t.date.toLocaleDateString('fr-CA'),
                    t.description,
                    formatCurrency(amount),
                    t.type === 'Sorties' ? 'Epargne/Invest.' : t.type,
                    t.account
                ];
            });
        
            autoTable(doc, {
                head: txHead,
                body: txBody,
                startY,
                headStyles: { fillColor: [75, 85, 99] },
                pageBreak: 'auto'
            });
            
            doc.save("rapport_financier.pdf");
        };
        
        return { exportToExcel, exportToPdf, exportBudgetAnalysisToExcel };
    })();
    
    // --- HOOKS --- //
    const useFinanceData = (transactions, budget, filters) => {

        const { filteredTransactions, filterPeriod } = useMemo(() => {
            let startDate = null;
            let endDate = null;
            
            const txs = transactions.filter(t => {
                const date = t.date;
                if (filters.year !== 'all' && date.getFullYear() !== filters.year) return false;
                if (filters.month !== 'all' && (date.getMonth() + 1) !== filters.month) return false;
                if (filters.dateRange.startDate && date < filters.dateRange.startDate) return false;
                if (filters.dateRange.endDate) {
                    const inclusiveEndDate = new Date(filters.dateRange.endDate);
                    inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
                    if (date >= inclusiveEndDate) return false;
                }
                return true;
            });
    
            if (txs.length > 0) {
                const dates = txs.map(t => t.date.getTime());
                startDate = new Date(Math.min(...dates));
                endDate = new Date(Math.max(...dates));
            }
    
            const days = startDate && endDate ? (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) + 1 : 0;
            
            return { 
                filteredTransactions: txs.sort((a,b) => b.date.getTime() - a.date.getTime()),
                filterPeriod: { days }
            };
    
        }, [transactions, filters]);

        const kpis = useMemo(() => {
            const totals = filteredTransactions.reduce((acc, t) => {
                if (t.type === 'Revenu') acc.totalRevenue += t.amount;
                else if (t.type === 'Dépense') acc.totalExpenses += t.amount;
                else if (t.type === 'Sorties') acc.totalSavings += t.amount;
                return acc;
            }, { totalRevenue: 0, totalExpenses: 0, totalSavings: 0 });

            const { totalRevenue, totalExpenses, totalSavings } = totals;
            const netBalance = totalRevenue - totalExpenses - totalSavings;
            const savingsRate = totalRevenue > 0 ? (totalSavings / totalRevenue) * 100 : 0;

            return { totalRevenue, totalExpenses, totalSavings, netBalance, savingsRate };
        }, [filteredTransactions]);

    const monthlyChartData = useMemo(() => {
        const monthly = new Map();
        filteredTransactions.forEach(t => {
            const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthly.has(monthKey)) {
                monthly.set(monthKey, { revenus: 0, depenses: 0, epargne: 0 });
            }
            const data = monthly.get(monthKey);
            if (t.type === 'Revenu') data.revenus += t.amount;
            else if (t.type === 'Dépense') data.depenses += t.amount;
            else if (t.type === 'Sorties') data.epargne += t.amount;
        });
        return Array.from(monthly.entries())
            .map(([name, values]) => ({ name, ...values }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredTransactions]);
    
    const allCategoryExpenses = useMemo(() => {
        const categories = new Map();
        filteredTransactions.filter(t => t.type === 'Dépense').forEach(t => {
            const key = t.description.split(' - ')[0] || t.description;
            categories.set(key, (categories.get(key) || 0) + t.amount);
        });
        return Array.from(categories.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const revenueByCategoryData = useMemo(() => {
        const categories = new Map();
        filteredTransactions.filter(t => t.type === 'Revenu').forEach(t => {
            const key = t.description.split(' - ')[0] || t.description;
            categories.set(key, (categories.get(key) || 0) + t.amount);
        });
        return Array.from(categories.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);
    }, [filteredTransactions]);
    
    const savingsDistributionData = useMemo(() => {
        const categories = new Map();
        filteredTransactions.filter(t => t.type === 'Sorties').forEach(t => {
            const key = t.description.split(' - ')[0] || t.description;
            categories.set(key, (categories.get(key) || 0) + t.amount);
        });
        return Array.from(categories.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);
    
    const expenseSummaryData = useMemo(() => {
        const expenseMap = new Map();
        filteredTransactions
            .filter(t => t.type === 'Dépense')
            .forEach(t => {
                const key = t.description.split(' - ')[0] || t.description;
                expenseMap.set(key, (expenseMap.get(key) || 0) + t.amount);
            });

        const allCategories = new Set([...Object.keys(budget), ...expenseMap.keys()]);
        const proratingFactor = filterPeriod.days > 0 ? filterPeriod.days / 365.25 : 0;

        const summary = Array.from(allCategories).map(category => {
            const actualAmount = expenseMap.get(category) || 0;
            const annualBudget = budget[category] || 0;
            const proratedBudget = annualBudget * proratingFactor;
            const difference = proratedBudget - actualAmount;
            return { category, actualAmount, proratedBudget, difference };
        });

        return summary.sort((a, b) => b.actualAmount - a.actualAmount);
    }, [filteredTransactions, budget, filterPeriod.days]);

    const categoryChartData = useMemo(() => {
        const totalProratedBudget = expenseSummaryData.reduce((sum, item) => sum + item.proratedBudget, 0);

        if (totalProratedBudget <= 0) {
            if (allCategoryExpenses.length <= 7) {
                return allCategoryExpenses;
            }
            const top6 = allCategoryExpenses.slice(0, 6);
            const othersValue = allCategoryExpenses.slice(6).reduce((sum, item) => sum + item.value, 0);
            return othersValue > 0 ? [...top6, { name: 'Autres', value: othersValue }] : top6;
        }

        const budgetThreshold = totalProratedBudget * 0.8;
        const sortedByBudget = [...expenseSummaryData].sort((a, b) => b.proratedBudget - a.proratedBudget);
        
        const mainCategoryNames = new Set();
        let cumulativeBudget = 0;

        for (const item of sortedByBudget) {
            mainCategoryNames.add(item.category);
            cumulativeBudget += item.proratedBudget;
            if (cumulativeBudget >= budgetThreshold) {
                break;
            }
        }
        
        const chartData = [];
        let othersValue = 0;

        for (const expense of allCategoryExpenses) {
            if (mainCategoryNames.has(expense.name)) {
                chartData.push(expense);
            } else {
                othersValue += expense.value;
            }
        }

        if (othersValue > 0) {
            chartData.push({ name: 'Autres', value: othersValue });
        }

        return chartData;
    }, [allCategoryExpenses, expenseSummaryData]);


    return {
        filteredTransactions, kpis, monthlyChartData, categoryChartData,
        revenueByCategoryData, savingsDistributionData, expenseSummaryData, filterPeriod,
    };
};


    // --- COMPONENTS --- //
    const KPICard = ({ title, value, format = 'number', color = 'text-white' }) => {
        const formatValue = (val) => {
            switch (format) {
                case 'currency': return val.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });
                case 'percent': return `${val.toFixed(2)} %`;
                default: return val.toLocaleString('fr-FR');
            }
        };
        return React.createElement('div', { className: "bg-gray-800 p-4 rounded-lg shadow-lg text-center transform hover:scale-105 transition-transform duration-300" },
            React.createElement('h3', { className: "text-sm font-medium text-gray-400 uppercase" }, title),
            React.createElement('p', { className: `text-2xl font-bold mt-2 ${color}` }, formatValue(value))
        );
    };
    
    const Filters = ({ filters, setFilters, availableYears }) => {
        const MONTHS = [
            { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
            { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
            { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
            { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
        ];

        const handleYearChange = (e) => {
            const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
            setFilters(prev => ({ ...prev, year: value, dateRange: { startDate: null, endDate: null } }));
        };
    
        const handleMonthChange = (e) => {
            const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
            setFilters(prev => ({ ...prev, month: value, dateRange: { startDate: null, endDate: null } }));
        };
    
        const handleDateChange = (e, field) => {
            const value = e.target.value ? new Date(e.target.value) : null;
            setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, [field]: value },
                year: 'all',
                month: 'all'
            }));
        };

        return React.createElement('div', { className: "flex flex-wrap items-center gap-4" },
            React.createElement('h3', { className: "text-lg font-semibold text-cyan-400" }, "Filtres:"),
            React.createElement('select', { value: filters.year, onChange: handleYearChange, className: "bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" },
                React.createElement('option', { value: 'all' }, "Toutes les années"),
                availableYears.map(year => React.createElement('option', { key: year, value: year }, year))
            ),
            React.createElement('select', { value: filters.month, onChange: handleMonthChange, className: "bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" },
                React.createElement('option', { value: 'all' }, "Tous les mois"),
                MONTHS.map(m => React.createElement('option', { key: m.value, value: m.value }, m.label))
            ),
            React.createElement('label', { className: "text-gray-400", htmlFor: "start-date" }, "De"),
            React.createElement('input', { type: "date", id: "start-date", onChange: (e) => handleDateChange(e, 'startDate'), className: "bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" }),
            React.createElement('label', { className: "text-gray-400", htmlFor: "end-date" }, "à"),
            React.createElement('input', { type: "date", id: "end-date", onChange: (e) => handleDateChange(e, 'endDate'), className: "bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" })
        );
    };

    const Charts = (() => {
        const CustomTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
                return React.createElement('div', { className: "p-2 bg-gray-700 border border-gray-600 rounded-md shadow-lg" },
                    React.createElement('p', { className: "label font-bold text-cyan-400" }, label),
                    payload.map(pld => React.createElement('p', { key: pld.dataKey, style: { color: pld.color } }, `${pld.name}: ${pld.value.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}`))
                );
            }
            return null;
        };

        const MonthlyEvolutionChart = ({ data }) => React.createElement('div', { style: { width: '100%', height: 300 } },
            React.createElement(ResponsiveContainer, null,
                React.createElement(BarChart, { data },
                    React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#4a5568" }),
                    React.createElement(XAxis, { dataKey: "name", stroke: "#9ca3af" }),
                    React.createElement(YAxis, { stroke: "#9ca3af", tickFormatter: (v) => new Intl.NumberFormat('fr-FR', { notation: 'compact', style: 'currency', currency: 'MAD' }).format(v) }),
                    React.createElement(Tooltip, { content: React.createElement(CustomTooltip) }),
                    React.createElement(Legend),
                    React.createElement(Bar, { dataKey: "revenus", fill: "#22c55e", name: "Revenus" }),
                    React.createElement(Bar, { dataKey: "depenses", fill: "#ef4444", name: "Dépenses" }),
                    React.createElement(Bar, { dataKey: "epargne", fill: "#3b82f6", name: "Épargne" })
                )
            )
        );

        const DistributionPieChart = ({ data, colors }) => React.createElement('div', { style: { width: '100%', height: 300 } },
            React.createElement(ResponsiveContainer, null,
                React.createElement(PieChart, null,
                    React.createElement(Pie, { data, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", outerRadius: 100, fill: "#8884d8", label: ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`},
                        data.map((_, index) => React.createElement(Cell, { key: `cell-${index}`, fill: colors[index % colors.length] }))
                    ),
                    React.createElement(Tooltip, { formatter: (v) => `${Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}` }),
                    React.createElement(Legend)
                )
            )
        );
        
        const COLORS = {
            EXPENSE: ['#06b6d4', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#84cc16'],
            REVENUE: ['#22c55e', '#84cc16', '#a3e635', '#4ade80', '#34d399', '#2dd4bf'],
            SAVINGS: ['#3b82f6', '#60a5fa', '#93c5fd', '#0ea5e9', '#38bdf8', '#7dd3fc']
        };
        
        return {
            MonthlyEvolutionChart,
            ExpenseDistributionChart: ({ data }) => React.createElement(DistributionPieChart, { data, colors: COLORS.EXPENSE }),
            RevenueDistributionChart: ({ data }) => React.createElement(DistributionPieChart, { data, colors: COLORS.REVENUE }),
            SavingsDistributionChart: ({ data }) => React.createElement(DistributionPieChart, { data, colors: COLORS.SAVINGS }),
        };
    })();
    
    const ExpenseSummaryTable = ({ data, onExport }) => {
        const totals = useMemo(() => {
            return data.reduce((acc, item) => {
                acc.actualAmount += item.actualAmount;
                acc.proratedBudget += item.proratedBudget;
                acc.difference += item.difference;
                return acc;
            }, { actualAmount: 0, proratedBudget: 0, difference: 0 });
        }, [data]);
    
        const formatCurrency = (value) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });
    
        return React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col" },
            React.createElement('div', { className: "flex justify-between items-center mb-4" },
                React.createElement('h3', { className: "text-lg font-semibold text-cyan-400 flex items-center gap-2" }, React.createElement(FileText, { size: 20 }), " Analyse Budgétaire des Dépenses"),
                React.createElement('button', { onClick: onExport, className: "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors", title: "Exporter cette analyse au format Excel" },
                     React.createElement(Download, { size: 16 }),
                     React.createElement('span', null, "Exporter")
                )
            ),
            data.length > 0 ?
            React.createElement('div', { className: "w-full overflow-auto flex-grow max-h-72" },
                React.createElement('table', { className: "w-full text-sm text-left" },
                    React.createElement('thead', { className: "sticky top-0 bg-gray-800 z-10" },
                        React.createElement('tr', { className: "border-b border-gray-600" },
                            React.createElement('th', { className: "p-2 font-semibold text-gray-400" }, "Catégorie"),
                            React.createElement('th', { className: "p-2 font-semibold text-gray-400 text-right" }, "Dépenses"),
                            React.createElement('th', { className: "p-2 font-semibold text-gray-400 text-right" }, "Budget Période"),
                            React.createElement('th', { className: "p-2 font-semibold text-gray-400 text-right" }, "Écart")
                        )
                    ),
                    React.createElement('tbody', null,
                        data.map(item => React.createElement('tr', { key: item.category, className: "border-b border-gray-700 hover:bg-gray-700/50" },
                            React.createElement('td', { className: "p-2 truncate", title: item.category }, item.category),
                            React.createElement('td', { className: "p-2 text-right font-mono text-gray-300" }, formatCurrency(item.actualAmount)),
                            React.createElement('td', { className: "p-2 text-right font-mono text-gray-400" }, formatCurrency(item.proratedBudget)),
                            React.createElement('td', { className: `p-2 text-right font-mono font-semibold ${item.difference < 0 ? 'text-red-400' : 'text-green-400'}` }, (item.difference < 0 ? '' : '+') + formatCurrency(item.difference))
                        ))
                    ),
                    React.createElement('tfoot', { className: "sticky bottom-0 bg-gray-800" },
                        React.createElement('tr', { className: "font-bold border-t-2 border-gray-600" },
                            React.createElement('td', { className: "p-2" }, "Total"),
                            React.createElement('td', { className: "p-2 text-right font-mono text-gray-300" }, formatCurrency(totals.actualAmount)),
                            React.createElement('td', { className: "p-2 text-right font-mono text-gray-400" }, formatCurrency(totals.proratedBudget)),
                            React.createElement('td', { className: `p-2 text-right font-mono font-semibold ${totals.difference < 0 ? 'text-red-400' : 'text-green-400'}` }, (totals.difference < 0 ? '' : '+') + formatCurrency(totals.difference))
                        )
                    )
                )
            ) :
            React.createElement('div', { className: "flex-grow flex items-center justify-center" }, React.createElement('p', { className: "text-gray-500 text-center" }, "Aucune dépense à analyser pour cette période."))
        );
    };

    const TransactionList = ({ transactions }) => {
        const [searchTerm, setSearchTerm] = useState('');
        const filteredTransactions = useMemo(() => {
            if (!searchTerm) return transactions;
            return transactions.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [transactions, searchTerm]);
        
        const Row = ({ transaction: t }) => {
            const isRevenue = t.type === 'Revenu';
            const amountColor = isRevenue ? 'text-green-400' : t.type === 'Dépense' ? 'text-red-400' : 'text-blue-400';
            const typeDisplayMap = {
                'Revenu': { text: 'Revenu', color: 'text-green-400' },
                'Dépense': { text: 'Dépense', color: 'text-red-400' },
                'Sorties': { text: 'Epargne/Invest.', color: 'text-blue-400' }
            };
            const displayType = typeDisplayMap[t.type];

            return React.createElement('tr', { className: "border-b border-gray-700 hover:bg-gray-700/50" },
                React.createElement('td', { className: "p-3 font-mono" }, t.date.toLocaleDateString('fr-CA')),
                React.createElement('td', { className: "p-3" }, t.description),
                React.createElement('td', { className: `p-3 font-semibold font-mono ${amountColor}` }, `${isRevenue ? '' : '-'}${t.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}`),
                React.createElement('td', { className: `p-3 font-semibold ${displayType.color}` }, displayType.text)
            );
        };

        return React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg shadow-lg" },
            React.createElement('h3', { className: "text-lg font-semibold text-cyan-400 mb-4" }, "Historique des Transactions"),
            React.createElement('input', { type: "text", placeholder: "Rechercher par description...", value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: "w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" }),
            React.createElement('div', { className: "overflow-auto max-h-96" },
                React.createElement('table', { className: "w-full text-left text-sm" },
                    React.createElement('thead', { className: "sticky top-0 bg-gray-800" },
                        React.createElement('tr', { className: "border-b border-gray-600" },
                            ['Date', 'Description', 'Montant', 'Type'].map(h => React.createElement('th', { key: h, className: "p-3 text-sm font-semibold text-gray-400" }, h))
                        )
                    ),
                    React.createElement('tbody', null, filteredTransactions.map((t, i) => React.createElement(Row, { key: i, transaction: t })))
                ),
                filteredTransactions.length === 0 && React.createElement('p', { className: "text-center text-gray-500 py-8" }, "Aucune transaction trouvée.")
            )
        );
    };

    const FileUpload = ({ onDataLoaded }) => {
        const [transactions, setTransactions] = useState(null);
        const [budget, setBudget] = useState(null);
        const [transactionFile, setTransactionFile] = useState(null);
        const [budgetFile, setBudgetFile] = useState(null);
        const [transactionError, setTransactionError] = useState(null);
        const [budgetError, setBudgetError] = useState(null);
        const [isProcessing, setIsProcessing] = useState(false);

        useEffect(() => {
            if (transactions && budget) {
                onDataLoaded({ transactions, budget });
                setIsProcessing(false);
            }
        }, [transactions, budget, onDataLoaded]);

        const processTransactions = useCallback(file => {
            setTransactionFile(file);
            setTransactionError(null);
            setIsProcessing(true);
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    const required = ['Date', 'Compte', 'Catégorie', 'MAD', 'Revenu/dépense'];
                    if (json.length === 0 || required.some(col => !Object.keys(json[0]).includes(col))) throw new Error("Format de fichier invalide.");
                    const parsed = json.map((row, i) => {
                        const description = [row['Catégorie'], row['Sous-catégories'], row['Note']].filter(Boolean).join(' - ');
                        const amount = Math.abs(Number(row.MAD));
                        if (isNaN(amount) || !row.Date) throw new Error(`Ligne ${i + 2} invalide.`);
                        const rawType = String(row['Revenu/dépense']).trim();
                        return { date: new Date(row.Date), description: description || 'Non décrit', amount, type: rawType === 'Revenu' ? 'Revenu' : rawType === 'Sorties' ? 'Sorties' : 'Dépense', account: String(row.Compte) };
                    });
                    setTransactions(parsed);
                } catch (err) { setTransactionError(err.message); setTransactionFile(null); setIsProcessing(false); }
            };
            reader.onerror = () => { setTransactionError("Impossible de lire le fichier."); setIsProcessing(false); };
            reader.readAsBinaryString(file);
        }, []);

        const processBudget = useCallback(file => {
            setBudgetFile(file);
            setBudgetError(null);
            setIsProcessing(true);
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    if (json.length === 0) throw new Error("Fichier budget vide.");
                    const headers = Object.keys(json[0]);
                    const categoryHeader = headers.find(h => h.toLowerCase().includes('catégorie'));
                    const budgetHeader = headers.find(h => h.toLowerCase().includes('budget'));
                    if (!categoryHeader || !budgetHeader) throw new Error("Colonnes 'Catégorie'/'Budget' manquantes.");
                    const parsed = json.reduce((acc, row) => {
                        const category = row[categoryHeader];
                        const amount = Number(row[budgetHeader]);
                        if (category && !isNaN(amount)) acc[String(category).trim()] = amount;
                        return acc;
                    }, {});
                    setBudget(parsed);
                } catch (err) { setBudgetError(err.message); setBudgetFile(null); setIsProcessing(false); }
            };
            reader.onerror = () => { setBudgetError("Impossible de lire le fichier."); setIsProcessing(false); };
            reader.readAsBinaryString(file);
        }, []);

        const FileInputBox = ({ title, onFileSelected, file, error }) => {
            const handleFileChange = e => e.target.files?.[0] && onFileSelected(e.target.files[0]);
            const handleDrop = useCallback(e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.files?.[0] && onFileSelected(e.dataTransfer.files[0]); }, [onFileSelected]);
            const handleDragOver = e => { e.preventDefault(); e.stopPropagation(); };

            const inputId = `file-input-${title.replace(/\s+/g, '-')}`;
            const isUploaded = !!file;
            const borderColor = error ? 'border-red-500' : isUploaded ? 'border-green-500' : 'border-gray-600 hover:border-cyan-400';
            const Icon = error ? AlertCircle : isUploaded ? CheckCircle : UploadCloud;
            const iconColor = error ? 'text-red-500' : isUploaded ? 'text-green-500' : 'text-cyan-400';

            return React.createElement('div', { className: "w-full" },
                React.createElement('div', { className: `border-2 border-dashed rounded-xl p-6 text-center bg-gray-800 transition-all duration-300 cursor-pointer ${borderColor}`, onDrop: handleDrop, onDragOver: handleDragOver, onClick: () => document.getElementById(inputId)?.click() },
                    React.createElement('input', { type: "file", id: inputId, className: "hidden", accept: ".xlsx", onChange: handleFileChange, disabled: isUploaded || isProcessing }),
                    React.createElement('div', { className: "flex flex-col items-center justify-center space-y-3" },
                        React.createElement(Icon, { className: `w-12 h-12 ${iconColor}` }),
                        React.createElement('p', { className: "text-lg font-semibold" }, title),
                        isUploaded ? React.createElement('p', { className: "text-gray-400 truncate max-w-full px-2" }, file.name)
                                   : React.createElement('p', { className: "text-sm text-gray-500" }, "Glissez-déposez ou cliquez")
                    )
                ),
                error && React.createElement('p', { className: "mt-2 text-red-400 text-center text-sm" }, error)
            );
        };

        return React.createElement('div', { className: "w-full max-w-4xl mx-auto" },
            React.createElement('div', { className: "space-y-6 md:space-y-0 md:flex md:gap-8" },
                React.createElement(FileInputBox, { title: "Fichier des Transactions", onFileSelected: processTransactions, file: transactionFile, error: transactionError }),
                React.createElement(FileInputBox, { title: "Fichier Budget Annuel", onFileSelected: processBudget, file: budgetFile, error: budgetError })
            ),
            isProcessing && !transactions && !budget && React.createElement('p', { className: "mt-6 text-center text-cyan-400" }, "Traitement des fichiers...")
        );
    };
    
    const Dashboard = ({ transactions, budget }) => {
        const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: 'all', dateRange: { startDate: null, endDate: null } });
        const [isExportingPdf, setIsExportingPdf] = useState(false);

        const monthlyChartRef = useRef(null);
        const savingsChartRef = useRef(null);
        const expenseChartRef = useRef(null);
        const revenueChartRef = useRef(null);
        
        const {
            filteredTransactions, kpis, monthlyChartData, categoryChartData,
            revenueByCategoryData, savingsDistributionData, expenseSummaryData
        } = useFinanceData(transactions, budget, filters);
        
        const availableYears = useMemo(() => Array.from(new Set(transactions.map(t => t.date.getFullYear()))).sort((a, b) => b - a), [transactions]);

        const captureChartAsImage = async (element) => {
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
        
                ctx.fillStyle = '#1f2937'; // bg-gray-800
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

        const handleExportExcel = () => {
            reportingService.exportToExcel(filteredTransactions, kpis, expenseSummaryData, "rapport_financier_complet");
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
                reportingService.exportToPdf(filteredTransactions, kpis, expenseSummaryData, chartImages, "Rapport Financier Complet");
            } finally {
                setIsExportingPdf(false);
            }
        };
        const handleExportBudget = () => {
            reportingService.exportBudgetAnalysisToExcel(expenseSummaryData, "analyse_budgetaire");
        };

        return React.createElement('div', { className: "space-y-6" },
            React.createElement('div', { className: "bg-gray-800 p-4 rounded-lg shadow-lg" },
                React.createElement(Filters, { filters, setFilters, availableYears })
            ),
            React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" },
                React.createElement(KPICard, { title: "Total Revenus", value: kpis.totalRevenue, format: "currency", color: "text-green-400" }),
                React.createElement(KPICard, { title: "Total Dépenses", value: kpis.totalExpenses, format: "currency", color: "text-red-400" }),
                React.createElement(KPICard, { title: "Total Épargne", value: kpis.totalSavings, format: "currency", color: "text-blue-400" }),
                React.createElement(KPICard, { title: "Solde Net", value: kpis.netBalance, format: "currency", color: kpis.netBalance >= 0 ? 'text-green-400' : 'text-red-400' }),
                React.createElement(KPICard, { title: "Taux d'Épargne", value: kpis.savingsRate, format: "percent", color: "text-yellow-400" })
            ),
            React.createElement('div', { className: "flex justify-end space-x-4" },
                React.createElement('button', { onClick: handleExportExcel, className: "flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" }, React.createElement(Download, { size: 18 }), React.createElement('span', null, "Exporter Rapport Excel")),
                React.createElement('button', { 
                    onClick: handleExportPdf, 
                    disabled: isExportingPdf,
                    className: "flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-red-800 disabled:cursor-not-allowed"
                }, 
                    isExportingPdf ? React.createElement(Loader2, { size: 18, className: "animate-spin" }) : React.createElement(FileText, { size: 18 }), 
                    React.createElement('span', null, isExportingPdf ? 'Génération...' : 'Exporter Rapport PDF')
                )
            ),
            React.createElement('div', { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
                React.createElement('div', { ref: monthlyChartRef, className: "bg-gray-800 p-4 rounded-lg shadow-lg" }, 
                    React.createElement('h3', { className: "text-lg font-semibold mb-4 text-cyan-400" }, "Évolution Mensuelle"), 
                    React.createElement(Charts.MonthlyEvolutionChart, { data: monthlyChartData })
                ),
                 React.createElement('div', { ref: savingsChartRef, className: "bg-gray-800 p-4 rounded-lg shadow-lg" }, 
                    React.createElement('h3', { className: "text-lg font-semibold mb-4 text-cyan-400" }, "Répartition de l'Épargne"), 
                    React.createElement(Charts.SavingsDistributionChart, { data: savingsDistributionData })
                ),
                React.createElement('div', { ref: expenseChartRef, className: "bg-gray-800 p-4 rounded-lg shadow-lg" }, 
                    React.createElement('h3', { className: "text-lg font-semibold mb-4 text-cyan-400" }, "Répartition des Dépenses"),
                    React.createElement(Charts.ExpenseDistributionChart, { data: categoryChartData })
                ),
                React.createElement('div', { ref: revenueChartRef, className: "bg-gray-800 p-4 rounded-lg shadow-lg" }, 
                    React.createElement('h3', { className: "text-lg font-semibold mb-4 text-cyan-400" }, "Répartition des Revenus"), 
                    React.createElement(Charts.RevenueDistributionChart, { data: revenueByCategoryData })
                )
            ),
            React.createElement(ExpenseSummaryTable, { data: expenseSummaryData, onExport: handleExportBudget }),
            React.createElement(TransactionList, { transactions: filteredTransactions })
        );
    };

    // --- MAIN APP --- //
    const App = () => {
        const [transactions, setTransactions] = useState([]);
        const [budget, setBudget] = useState(null);
        const [key, setKey] = useState(0);

        const handleDataLoaded = (data) => {
            setTransactions(data.transactions);
            setBudget(data.budget);
        };
        const handleReset = () => {
            setTransactions([]);
            setBudget(null);
            setKey(prevKey => prevKey + 1);
        };
        
        const isDataLoaded = transactions.length > 0 && budget !== null;

        return React.createElement('div', { className: "min-h-screen bg-gray-900 text-gray-200 font-sans" },
            React.createElement('header', { className: "bg-gray-800 shadow-md" },
                React.createElement('div', { className: "container mx-auto px-4 py-4 flex justify-between items-center" },
                    React.createElement('h1', { className: "text-2xl font-bold text-cyan-400" }, "📊 Gestionnaire de Finances"),
                    isDataLoaded && React.createElement('button', { onClick: handleReset, className: "bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg" }, "Changer les fichiers")
                )
            ),
            React.createElement('main', { className: "container mx-auto p-4 md:p-6" },
                !isDataLoaded
                    ? React.createElement('div', { className: "flex items-center justify-center h-[calc(100vh-150px)]" }, React.createElement(FileUpload, { key, onDataLoaded: handleDataLoaded }))
                    : React.createElement(Dashboard, { transactions, budget })
            )
        );
    };

    // --- RENDER --- //
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));

})();
