export interface Transaction {
    date: Date;
    description: string;
    amount: number;
    type: 'Revenu' | 'Dépense' | 'Sorties';
    account: string;
}

export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

export interface FilterState {
    year: number | 'all';
    month: number | 'all';
    dateRange: DateRange;
}

export interface MonthlyData {
    name: string;
    revenus: number;
    depenses: number;
    epargne: number;
}

export interface CategoryData {
    name: string;
    value: number;
}

export interface SavingsData {
    date: string;
    epargne: number;
}

export interface BudgetData {
    [category: string]: number;
}
