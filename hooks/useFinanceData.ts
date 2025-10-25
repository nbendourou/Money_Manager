
import { useMemo } from 'react';
import type { Transaction, FilterState, MonthlyData, CategoryData, BudgetData } from '../types';

export const useFinanceData = (transactions: Transaction[], budget: BudgetData, filters: FilterState) => {

    const { filteredTransactions, periodDates } = useMemo(() => {
        let txs = transactions;
        
        if (filters.dateRange.startDate || filters.dateRange.endDate) {
            txs = txs.filter(t => {
                const date = t.date;
                if (filters.dateRange.startDate && date < filters.dateRange.startDate) return false;
                if (filters.dateRange.endDate) {
                    const inclusiveEndDate = new Date(filters.dateRange.endDate);
                    inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1); // Make it inclusive
                    if (date >= inclusiveEndDate) return false;
                }
                return true;
            });
        } else {
             txs = transactions.filter(t => {
                const date = t.date;
                let match = true;
                if (filters.year !== 'all' && date.getFullYear() !== filters.year) {
                    match = false;
                }
                if (filters.month !== 'all' && (date.getMonth() + 1) !== filters.month) {
                    match = false;
                }
                return match;
            });
        }

        let startDate: Date | null = null;
        let endDate: Date | null = null;
        if (txs.length > 0) {
            const dates = txs.map(t => t.date.getTime());
            startDate = new Date(Math.min(...dates));
            endDate = new Date(Math.max(...dates));
        }
        
        return { 
            filteredTransactions: txs.sort((a,b) => b.date.getTime() - a.date.getTime()),
            periodDates: { startDate, endDate }
        };

    }, [transactions, filters]);
    
    const filterPeriod = useMemo(() => {
        const { startDate, endDate } = periodDates;
        const days = startDate && endDate ? (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) + 1 : 0;
        return { days };
    }, [periodDates]);

    const kpis = useMemo(() => {
        const totalRevenue = filteredTransactions
            .filter(t => t.type === 'Revenu')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = filteredTransactions
            .filter(t => t.type === 'Dépense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalSavings = filteredTransactions
            .filter(t => t.type === 'Sorties')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const netBalance = totalRevenue - totalExpenses - totalSavings;
        const savingsRate = totalRevenue > 0 ? (totalSavings / totalRevenue) * 100 : 0;
        
        return { totalRevenue, totalExpenses, totalSavings, netBalance, savingsRate };
    }, [filteredTransactions]);
    
    const previousKpis = useMemo(() => {
        const { startDate: currentStart, endDate: currentEnd } = periodDates;

        let prevStart: Date | null = null;
        let prevEnd: Date | null = null;

        // Determine previous period based on active filters
        if (filters.dateRange.startDate || filters.dateRange.endDate) {
            // Case 1: Custom Date Range
            if (currentStart && currentEnd) {
                const duration = currentEnd.getTime() - currentStart.getTime();
                prevEnd = new Date(currentStart.getTime() - 1); // Day before
                prevStart = new Date(prevEnd.getTime() - duration);
            }
        } else if (filters.year !== 'all' && filters.month !== 'all') {
            // Case 2: Specific Month is selected
            const d = new Date(filters.year, filters.month - 1, 1);
            d.setMonth(d.getMonth() - 1);
            prevStart = new Date(d.getFullYear(), d.getMonth(), 1);
            prevEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        } else if (filters.year !== 'all') {
            // Case 3: Specific Year is selected
            prevStart = new Date(filters.year - 1, 0, 1);
            prevEnd = new Date(filters.year - 1, 11, 31, 23, 59, 59);
        }
        
        if (!prevStart || !prevEnd) {
            return { totalRevenue: 0, totalExpenses: 0, totalSavings: 0 };
        }

        const previousTransactions = transactions.filter(t => t.date >= prevStart! && t.date <= prevEnd!);

        return {
            totalRevenue: previousTransactions.filter(t => t.type === 'Revenu').reduce((sum, t) => sum + t.amount, 0),
            totalExpenses: previousTransactions.filter(t => t.type === 'Dépense').reduce((sum, t) => sum + t.amount, 0),
            totalSavings: previousTransactions.filter(t => t.type === 'Sorties').reduce((sum, t) => sum + t.amount, 0),
        };
    }, [transactions, filters, periodDates]);

    const monthlyChartData = useMemo<MonthlyData[]>(() => {
        const monthly = new Map<string, { revenus: number; depenses: number; epargne: number }>();

        filteredTransactions.forEach(t => {
            const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthly.has(monthKey)) {
                monthly.set(monthKey, { revenus: 0, depenses: 0, epargne: 0 });
            }
            const data = monthly.get(monthKey)!;
            
            if (t.type === 'Revenu') data.revenus += t.amount;
            else if (t.type === 'Dépense') data.depenses += t.amount;
            else if (t.type === 'Sorties') data.epargne += t.amount;
        });

        return Array.from(monthly.entries())
            .map(([name, values]) => ({ name, ...values }))
            .sort((a,b) => a.name.localeCompare(b.name));

    }, [filteredTransactions]);
    
    const allCategoryExpenses = useMemo<CategoryData[]>(() => {
        const categories = new Map<string, number>();
        filteredTransactions
            .filter(t => t.type === 'Dépense')
            .forEach(t => {
                const key = t.description.split(' - ')[0] || t.description; // Use main category
                categories.set(key, (categories.get(key) || 0) + t.amount);
            });
        
        return Array.from(categories.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const revenueByCategoryData = useMemo<CategoryData[]>(() => {
         const categories = new Map<string, number>();
        filteredTransactions
            .filter(t => t.type === 'Revenu')
            .forEach(t => {
                const key = t.description.split(' - ')[0] || t.description;
                categories.set(key, (categories.get(key) || 0) + t.amount);
            });
        
        return Array.from(categories.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);
    }, [filteredTransactions]);
    
    const savingsDistributionData = useMemo<CategoryData[]>(() => {
        const savingsByCategory = new Map<string, number>();
        filteredTransactions
            .filter(t => t.type === 'Sorties')
            .forEach(t => {
                const key = t.description.split(' - ')[0] || t.description;
                savingsByCategory.set(key, (savingsByCategory.get(key) || 0) + t.amount);
            });

        return Array.from(savingsByCategory.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const expenseSummaryData = useMemo(() => {
        const expenseMap = new Map<string, number>();
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

    const categoryChartData = useMemo<CategoryData[]>(() => {
        const totalProratedBudget = expenseSummaryData.reduce((sum, item) => sum + item.proratedBudget, 0);
    
        // Fallback to top 6 + others if there's no budget defined for the period
        if (totalProratedBudget <= 0) {
            if (allCategoryExpenses.length <= 7) {
                return allCategoryExpenses;
            }
            const top6 = allCategoryExpenses.slice(0, 6);
            const othersValue = allCategoryExpenses.slice(6).reduce((sum, item) => sum + item.value, 0);
            
            return othersValue > 0 ? [
                ...top6,
                { name: 'Autres', value: othersValue }
            ] : top6;
        }
    
        // Determine the set of main categories that make up 80% of the budget
        const budgetThreshold = totalProratedBudget * 0.8;
        const sortedByBudget = [...expenseSummaryData].sort((a, b) => b.proratedBudget - a.proratedBudget);
        
        const mainCategoryNames = new Set<string>();
        let cumulativeBudget = 0;
    
        for (const item of sortedByBudget) {
            mainCategoryNames.add(item.category);
            cumulativeBudget += item.proratedBudget;
            if (cumulativeBudget >= budgetThreshold) {
                break;
            }
        }
        
        // Build chart data using actual expenses for the selected categories
        const chartData: CategoryData[] = [];
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

    const expenseCategories = useMemo(() => {
        const categories = new Set<string>();
        filteredTransactions
            .filter(t => t.type === 'Dépense')
            .forEach(t => {
                const key = t.description.split(' - ')[0] || t.description;
                categories.add(key);
            });
        return Array.from(categories).sort();
    }, [filteredTransactions]);

    const revenueCategories = useMemo(() => {
        const categories = new Set<string>();
        filteredTransactions
            .filter(t => t.type === 'Revenu')
            .forEach(t => {
                const key = t.description.split(' - ')[0] || t.description;
                categories.add(key);
            });
        return Array.from(categories).sort();
    }, [filteredTransactions]);

    const savingsCategories = useMemo(() => {
        const categories = new Set<string>();
        filteredTransactions
            .filter(t => t.type === 'Sorties')
            .forEach(t => {
                const key = t.description.split(' - ')[0] || t.description;
                categories.add(key);
            });
        return Array.from(categories).sort();
    }, [filteredTransactions]);


    return {
        filteredTransactions,
        kpis,
        previousKpis,
        monthlyChartData,
        categoryChartData,
        revenueByCategoryData,
        savingsDistributionData,
        expenseSummaryData,
        filterPeriod,
        expenseCategories,
        revenueCategories,
        savingsCategories,
    };
};
